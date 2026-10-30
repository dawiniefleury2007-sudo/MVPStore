import { z } from 'zod';
import type { FeedbackPost } from '@/types/feedback';

export const FEEDBACK_CACHE_KEY = 'mvpstore.feedback.v1';
export const FEEDBACK_CACHE_TTL_MS = 4 * 60 * 1000;
const MAX_ENTRIES = 8;

const authorSchema = z.object({
  username: z.string(),
  avatar_url: z.string().nullish().transform(value => value ?? undefined),
});
const postSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  product_id: z.string().nullish().transform(value => value ?? undefined),
  type: z.string(),
  title: z.string(),
  image: z.string(),
  created_at: z.string(),
  author: authorSchema,
  likes: z.number().int().nonnegative(),
  liked: z.boolean().transform(() => false),
  replies: z.array(z.object({
    id: z.string(),
    user_id: z.string(),
    body: z.string(),
    created_at: z.string(),
    user_profiles: authorSchema,
  })),
});
const entrySchema = z.object({
  scope: z.string(),
  page: z.number().int().nonnegative(),
  productId: z.string().optional(),
  savedAt: z.number().finite(),
  posts: z.array(postSchema).max(20),
});
type CacheEntry = z.infer<typeof entrySchema>;

function readEntries(): CacheEntry[] {
  try {
    const raw = window.sessionStorage.getItem(FEEDBACK_CACHE_KEY);
    if (!raw) return [];
    const entries = z.array(entrySchema).max(MAX_ENTRIES).parse(JSON.parse(raw));
    const now = Date.now();
    // Image URLs expire after five minutes; never restore them beyond four.
    return entries.filter(entry => entry.savedAt <= now && now - entry.savedAt < FEEDBACK_CACHE_TTL_MS);
  } catch {
    // A corrupt cache or unavailable storage must not prevent network loading.
    return [];
  }
}

export function readFeedbackCache(scope: string, page: number, productId?: string): FeedbackPost[] | undefined {
  return readEntries().find(entry =>
    entry.scope === scope && entry.page === page && entry.productId === productId,
  )?.posts as FeedbackPost[] | undefined;
}

export function clearFeedbackCache(): void {
  try {
    window.sessionStorage.removeItem(FEEDBACK_CACHE_KEY);
  } catch {
    // Storage may be disabled.
  }
}

export function writeFeedbackCache(
  scope: string,
  page: number,
  productId: string | undefined,
  posts: unknown,
  requestedAt: number,
): void {
  try {
    // Store only public fields, never the current viewer's liked state.
    const entry = entrySchema.parse({ scope, page, productId, posts, savedAt: requestedAt });
    const otherEntries = readEntries().filter(item =>
      item.scope !== scope || item.page !== page || item.productId !== productId,
    );
    window.sessionStorage.setItem(FEEDBACK_CACHE_KEY, JSON.stringify([...otherEntries, entry].slice(-MAX_ENTRIES)));
  } catch {
    // Storage quota/privacy restrictions must not discard a successful response.
  }
}
