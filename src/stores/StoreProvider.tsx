import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { EMPTY_DATA } from '@/constants/store';
import type { StoreData, User, Snapshot } from '@/types/store';

const SNAPSHOT_CACHE_KEY = 'mvpstore.snapshot.v1';

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

function readCachedSnapshot(): Snapshot | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SNAPSHOT_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'data' in parsed) {
      return parsed as Snapshot;
    }
  } catch {
    window.localStorage.removeItem(SNAPSHOT_CACHE_KEY);
  }
  return null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const client = useQueryClient();
  const [cachedSnapshot, setCachedSnapshot] = useState<Snapshot | null>(() => readCachedSnapshot());

  const query = useQuery<Snapshot, Error>({
    queryKey: ['snapshot', auth.user?.id || 'public'],
    queryFn: () => api<Snapshot>('snapshot'),
    enabled: !auth.loading,
    refetchInterval: 15000,
    staleTime: 5000,
    retry: 1,
  });

  useEffect(() => {
    if (!query.data || typeof window === 'undefined') return;
    setCachedSnapshot(query.data);
    try {
      window.localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(query.data));
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

  const snapshot = query.data || cachedSnapshot;
  const user = auth.user && snapshot?.user?.id === auth.user.id ? snapshot.user : undefined;
  const loading = auth.loading || (query.isPending && !snapshot);

  return (
    <StoreContext.Provider
      value={{
        data: snapshot?.data || EMPTY_DATA,
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
