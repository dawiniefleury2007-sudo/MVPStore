import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { EMPTY_DATA } from '@/constants/store';
import type { StoreData, User, Snapshot } from '@/types/store';

const CATALOG_CACHE_KEY = 'mvpstore.catalog.v1';

interface StoreContextValue {
  data: StoreData;
  user: User | undefined;
  loading: boolean;
  error: Error | null;
  busy: boolean;
  refresh: () => void;
  action: <T = Record<string, unknown>>(name: string, payload?: Record<string, unknown>) => Promise<T | undefined>;
  signOut: () => void;
  redeem: (key: string) => Promise<void>;
  claim: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function isProductCatalog(value: unknown): value is StoreData['products'] {
  return Array.isArray(value) && value.every(product =>
    typeof product === 'object' && product !== null &&
    typeof product.id === 'string' &&
    typeof product.name === 'string' &&
    typeof product.image === 'string' &&
    Array.isArray(product.plans) && product.plans.every(plan =>
      typeof plan === 'object' && plan !== null &&
      typeof plan.name === 'string' && Number.isFinite(plan.price),
    ),
  );
}

function readCachedProducts(): StoreData['products'] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (isProductCatalog(parsed)) return parsed;
    window.localStorage.removeItem(CATALOG_CACHE_KEY);
  } catch {
    try {
      window.localStorage.removeItem(CATALOG_CACHE_KEY);
    } catch {
      // Storage may be unavailable in private or restricted browsing modes.
    }
  }
  return [];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const client = useQueryClient();
  const [cachedProducts, setCachedProducts] = useState<StoreData['products']>(() => readCachedProducts());

  const query = useQuery<Snapshot, Error>({
    queryKey: ['snapshot', auth.user?.id || 'public'],
    queryFn: () => api<Snapshot>('snapshot'),
    enabled: !auth.loading,
    refetchInterval: 15000,
    staleTime: 5000,
    retry: 1,
  });

  useEffect(() => {
    try {
      window.localStorage.removeItem('mvpstore.snapshot.v1');
    } catch {
      // Storage may be unavailable in private or restricted browsing modes.
    }
  }, []);

  useEffect(() => {
    if (!query.data || typeof window === 'undefined') return;
    const publicProducts = query.data.data.products.filter(product => product.available !== false);
    setCachedProducts(publicProducts);
    try {
      window.localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(publicProducts));
    } catch {
      // Ignore storage quota and privacy-mode errors.
    }
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: ({ name, payload }: { name: string; payload: Record<string, unknown> }) =>
      api<Record<string, unknown>>('action', { action: name, payload }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['snapshot'] });
      void client.invalidateQueries({ queryKey: ['feed'] });
      void client.invalidateQueries({ queryKey: ['leaderboard'] });
      void client.invalidateQueries({ queryKey: ['resellers'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const action = useCallback(
    async <T = Record<string, unknown>>(name: string, payload: Record<string, unknown> = {}) =>
      mutation.mutateAsync({ name, payload }).then(result => result as T, () => undefined),
    [mutation],
  );

  const signOut = () => {
    void auth.service.logout().then(
      () => {
        client.clear();
        toast.success('Signed out');
      },
      (e: Error) => toast.error(e.message),
    );
  };

  const redeem = async (key: string) => {
    if (await action('license.redeem', { key })) toast.success('Product access activated');
  };

  const claim = async () => {
    const result = await action<{ reward: number }>('xp.claim', {
      source: 'daily',
      idempotencyKey: crypto.randomUUID(),
    });
    if (result) toast.success(result.reward ? `You earned ${result.reward} XP` : 'Claim already processed');
  };

  const user = auth.user && query.data?.user?.id === auth.user.id ? query.data.user : undefined;
  const loading = auth.loading || (query.isPending && cachedProducts.length === 0);
  const data = query.data?.data || { ...EMPTY_DATA, products: cachedProducts };

  return (
    <StoreContext.Provider
      value={{
        data,
        user,
        loading,
        error: query.error,
        busy: mutation.isPending,
        action,
        signOut,
        redeem,
        claim,
        refresh: () => {
          void query.refetch();
        },
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('StoreProvider missing');
  return context;
}
