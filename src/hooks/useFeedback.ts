import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/supabase';
import { readFeedbackCache, writeFeedbackCache } from '@/lib/feedbackCache';
import type { FeedbackPost } from '@/types/feedback';

export function useFeedback(page = 0, productId?: string) {
  const { user, loading } = useAuth();
  const viewer = loading ? undefined : user?.id;
  const scope = import.meta.env.VITE_SUPABASE_URL;
  const product = productId || 'all';

  return useQuery<FeedbackPost[], Error>({
    queryKey: ['feed', viewer || 'public', page, product],
    queryFn: async ({ signal }) => {
      const requestedAt = Date.now();
      const posts = await api<FeedbackPost[]>(
        'feed',
        { page, ...(productId ? { productId } : {}) },
        { anonymous: !viewer, signal },
      );
      if (!signal.aborted) writeFeedbackCache(scope, page, productId, posts, requestedAt);
      return posts;
    },
    initialData: () => readFeedbackCache(scope, page, productId),
    initialDataUpdatedAt: 0,
    // Keep public content visible through sign-in, but never reuse another viewer's likes.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === page && previousQuery.queryKey[3] === product
        ? previous?.map(post => ({ ...post, liked: false }))
        : undefined,
    staleTime: 15000,
    refetchInterval: 15000,
    retry: false,
  });
}
