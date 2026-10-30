import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { FEEDBACK_CACHE_KEY, FEEDBACK_CACHE_TTL_MS, clearFeedbackCache, readFeedbackCache, writeFeedbackCache } from './feedbackCache.ts';
import type { FeedbackPost } from '../types/feedback.ts';

const scope = 'https://example.supabase.co';
const post: FeedbackPost = {
  id: 'post-1', user_id: 'author-1', product_id: 'product-1', type: 'product',
  title: 'Community feedback', image: 'https://example.test/signed-image',
  created_at: '2026-10-30T12:00:00Z', author: { username: 'Member' },
  likes: 1, liked: true, replies: [],
};
let storage: Map<string, string>;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

beforeEach(() => {
  storage = new Map();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    } },
  });
});

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

test('restores feedback across refreshes without saving viewer-specific or extra fields', () => {
  const extra = { ...post, access_token: 'not-public', feedback_likes: [{ user_id: 'viewer' }] };
  writeFeedbackCache(scope, 0, undefined, [extra], Date.now());
  assert.equal(readFeedbackCache(scope, 0)?.[0].id, post.id);
  assert.equal(readFeedbackCache(scope, 0)?.[0].liked, false);
  assert.equal(post.liked, true);
  const raw = storage.get(FEEDBACK_CACHE_KEY)!;
  assert.ok(!raw.includes('access_token'));
  assert.ok(!raw.includes('feedback_likes'));
});

test('keeps page, product filter and backend project caches separate', () => {
  writeFeedbackCache(scope, 0, undefined, [post], Date.now());
  assert.equal(readFeedbackCache(scope, 1), undefined);
  assert.equal(readFeedbackCache(scope, 0, 'product-1'), undefined);
  assert.equal(readFeedbackCache('other-project', 0), undefined);
  writeFeedbackCache(scope, 0, 'product-1', [], Date.now());
  assert.deepEqual(readFeedbackCache(scope, 0, 'product-1'), []);
  assert.equal(readFeedbackCache(scope, 0)?.length, 1);
});

test('expires entries before signed image URLs expire and rejects future timestamps', () => {
  const now = Date.now();
  writeFeedbackCache(scope, 0, undefined, [post], now - FEEDBACK_CACHE_TTL_MS);
  assert.equal(readFeedbackCache(scope, 0), undefined);
  writeFeedbackCache(scope, 0, undefined, [post], now + 60000);
  assert.equal(readFeedbackCache(scope, 0), undefined);
});

test('replaces old posts including an empty result after deletion or moderation', () => {
  writeFeedbackCache(scope, 0, undefined, [post], Date.now());
  writeFeedbackCache(scope, 0, undefined, [], Date.now());
  assert.deepEqual(readFeedbackCache(scope, 0), []);
});

test('clears every cached page/filter after a feedback mutation', () => {
  writeFeedbackCache(scope, 0, undefined, [post], Date.now());
  writeFeedbackCache(scope, 1, 'product-1', [post], Date.now());
  clearFeedbackCache();
  assert.equal(storage.has(FEEDBACK_CACHE_KEY), false);
  assert.equal(readFeedbackCache(scope, 0), undefined);
});

test('bounds storage to the eight most recently written feeds', () => {
  for (let page = 0; page < 9; page++) writeFeedbackCache(scope, page, undefined, [post], Date.now());
  assert.equal(readFeedbackCache(scope, 0), undefined);
  assert.equal(readFeedbackCache(scope, 8)?.[0].id, post.id);
  assert.equal(JSON.parse(storage.get(FEEDBACK_CACHE_KEY)!).length, 8);
});

test('ignores malformed JSON and invalid post shapes and recovers on a successful fetch', () => {
  for (const invalid of ['{', 'null', JSON.stringify([{ scope, page: 0, savedAt: Date.now(), posts: [{}] }])]) {
    storage.set(FEEDBACK_CACHE_KEY, invalid);
    assert.equal(readFeedbackCache(scope, 0), undefined);
  }
  writeFeedbackCache(scope, 0, undefined, [post], Date.now());
  assert.equal(readFeedbackCache(scope, 0)?.length, 1);
});

test('tolerates nullable optional fields from the API', () => {
  const nullable = { ...post, product_id: null, author: { username: 'Member', avatar_url: null } };
  writeFeedbackCache(scope, 0, undefined, [nullable], Date.now());
  assert.equal(readFeedbackCache(scope, 0)?.[0].author.username, 'Member');
});

test('storage restrictions do not break reads or successful network results', () => {
  Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage denied'); } });
  assert.equal(readFeedbackCache(scope, 0), undefined);
  assert.doesNotThrow(() => writeFeedbackCache(scope, 0, undefined, [post], Date.now()));
});
