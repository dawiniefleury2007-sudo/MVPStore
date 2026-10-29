import { backend, rpc } from './backend.ts';
import { signedImage } from './storage.ts';


const FEED_PAGE_SIZE = 20;
const LEADERBOARD_PAGE_SIZE = 25;
const MAX_PAGE = 100_000;

function normalizePage(page: number): number {
if (!Number.isSafeInteger(page) || page < 0 || page > MAX_PAGE) {
throw new Error('Invalid page number');
}

return page;
}

function getPageRange(
page: number,
pageSize: number,
): [number, number] {
const start = normalizePage(page) * pageSize;
return [start, start + pageSize - 1];
}

export async function feed(
userId: string | null,
page: number,
productId?: string,
) {
const [start, end] = getPageRange(page, FEED_PAGE_SIZE);

let query = backend
.from('feedback')
.select(      id,       user_id,       product_id,       type,       title,       image_path,       created_at,       author:user_profiles!feedback_user_id_fkey(         username,         avatar_url       ),       feedback_likes(user_id),       feedback_replies(         id,         user_id,         body,         created_at,         author:user_profiles!feedback_replies_user_id_fkey(           username,           avatar_url         )       )    )
.eq('status', 'published')
.order('created_at', { ascending: false })
.order('id', { ascending: false })
.range(start, end);

if (productId !== undefined) {
const normalizedProductId = productId.trim();

if (!normalizedProductId || normalizedProductId.length > 200) {
throw new Error('Invalid product ID');
}

query = query.eq('product_id', normalizedProductId);
}

const { data, error } = await query;

if (error) {
console.error('Feed query failed:', error.message);
throw new Error('Unable to load feedback');
}

return Promise.all(
(data ?? []).map(async (item) => {
const likes = item.feedback_likes ?? [];
const rawReplies = item.feedback_replies ?? [];

let image: string | null = null;

if (item.image_path) {
try {
image = await signedImage(
'mvp-feedback',
item.image_path,
);
} catch (error) {
console.error(
'Unable to sign feedback image:',
error instanceof Error ? error.message : 'Unknown error',
);
}
}

const replies = rawReplies.map((reply) => ({
...reply,
author: reply.author ?? null,
}));

return {
...item,
image,
image_path: undefined,
author: item.author ?? null,
likes: likes.length,
liked: userId
? likes.some(
(like: { user_id: string }) =>
like.user_id === userId,
)
: false,
feedback_likes: undefined,
feedback_replies: undefined,
replies,
};
}),
);
}

export async function leaderboard(page: number) {
const [start, end] = getPageRange(
page,
LEADERBOARD_PAGE_SIZE,
);

const { data, error } = await backend
.from('xp_accounts')
.select(      user_id,       balance,       total_earned,       user_profiles(username,avatar_url)    )
.order('balance', { ascending: false })
.order('user_id', { ascending: true })
.range(start, end);

if (error) {
console.error('Leaderboard query failed:', error.message);
throw new Error('Unable to load leaderboard');
}

return data ?? [];
}

export async function searchUsers(
id: string,
prefix: string,
page: number,
) {
const userId = id.trim();
const searchPrefix = prefix.trim();
const safePage = normalizePage(page);

if (!userId) {
throw new Error('Authentication required');
}

if (
searchPrefix.length < 2 ||
searchPrefix.length > 80
) {
throw new Error(
'Search query must be between 2 and 80 characters',
);
}

return rpc('mvp_search_users', {
p_user: userId,
p_prefix: searchPrefix,
p_page: safePage,
});
}
