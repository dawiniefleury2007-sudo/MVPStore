import { backend, rpc } from './backend.ts';
import { signedImage } from './storage.ts';

export async function feed(userId: string | null, page: number, productId?: string) {
  // Use explicit aliases to avoid any embed ambiguity between top-level author and reply authors.
  const select = [
    'id',
    'user_id',
    'product_id',
    'type',
    'title',
    'image_path',
    'created_at',
    'author:user_profiles!feedback_user_id_fkey(username,avatar_url)',
    'feedback_likes(user_id)',
    'feedback_replies(',
    '  id,user_id,body,created_at,',
    '  author:user_profiles!feedback_replies_user_id_fkey(username,avatar_url)',
    ')',
  ].join('');

  let query = backend
    .from('feedback')
    .select(select)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(page * 20, page * 20 + 19);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('feed query failed:', error);
    throw new Error('Unable to load feedback');
  }

  const items = (data || []) as any[];

  return Promise.all(
    items.map(async (f) => {
      let imageUrl = '';
      if (f.image_path && f.user_id) {
        try {
          imageUrl = await signedImage(f.user_id, 'mvp-feedback', f.image_path);
        } catch (e) {
          console.error('signedImage failed for feedback', f.id, e);
        }
      }

      const likesArr = Array.isArray(f.feedback_likes) ? f.feedback_likes : [];
      const rawReplies = Array.isArray(f.feedback_replies) ? f.feedback_replies : [];

      // Normalize reply authors to the shape expected by the frontend (user_profiles)
      // regardless of whether the embed used 'author' alias or legacy key.
      const repliesArr = rawReplies.map((r: any) => ({
        ...r,
        user_profiles: r.author || r.user_profiles || { username: 'Member' },
      }));

      return {
        ...f,
        image: imageUrl,
        image_path: undefined,
        author: f.author || f.user_profiles || { username: 'MVP Member' },
        likes: likesArr.length,
        liked: likesArr.some((x: { user_id: string }) => x.user_id === userId),
        feedback_likes: undefined,
        user_profiles: undefined,
        replies: repliesArr,
        feedback_replies: undefined,
      };
    })
  );
}
export async function leaderboard(page:number) {
 const {data,error}=await backend.from('xp_accounts').select('user_id,balance,total_earned,user_profiles(username,avatar_url)').order('balance',{ascending:false}).order('user_id').range(page*25,page*25+24);if(error)throw new Error('Unable to load leaderboard');return data;
}
export async function searchUsers(id:string,prefix:string,page:number) {
 return rpc('mvp_search_users',{p_user:id,p_prefix:prefix,p_page:page});
}
