import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('./feed.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadFeed(result = { data: [], error: null }) {
  const calls = [];
  const query = {};
  for (const method of ['select', 'eq', 'order', 'range']) {
    query[method] = (...args) => {
      calls.push([method, ...args]);
      return query;
    };
  }
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  const exported = {};
  const logs = [];
  runInNewContext(outputText, {
    exports: exported,
    console: { error: (...args) => logs.push(args) },
    require: (id) => {
      if (id === './backend.ts') return {
        backend: { from: (table) => { calls.push(['from', table]); return query; } },
      };
      if (id === './storage.ts') return { signedImage: async () => 'https://example.test/signed-image' };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return { feed: exported.feed, calls, logs };
}

test('feed selects comma-separated fields and unambiguous nested authors', async () => {
  const { feed, calls } = loadFeed();
  await feed(null, 0);
  assert.equal(calls.find(([method]) => method === 'select')[1],
    'id,user_id,product_id,type,title,image_path,created_at,' +
    'author:user_profiles!feedback_user_id_fkey(username,avatar_url),' +
    'feedback_likes(user_id),' +
    'feedback_replies(id,user_id,body,created_at,author:user_profiles!feedback_replies_user_id_fkey(username,avatar_url))');
});

test('feed preserves publication filtering, ordering, pagination and product filtering', async () => {
  const { feed, calls } = loadFeed();
  await feed(null, 2, 'product-id');
  const normalized = JSON.parse(JSON.stringify(calls));
  assert.deepEqual(normalized.filter(([method]) => method === 'eq'), [
    ['eq', 'status', 'published'], ['eq', 'product_id', 'product-id'],
  ]);
  assert.deepEqual(normalized.find(([method]) => method === 'range'), ['range', 40, 59]);
  assert.deepEqual(normalized.find(([method]) => method === 'order'), ['order', 'created_at', { ascending: false }]);
});

test('feed preserves likes, reply authors and signed images without exposing storage paths', async () => {
  const { feed } = loadFeed({ error: null, data: [{
    id: 'post-id', user_id: 'member-id', image_path: 'member-id/image.png',
    author: { username: 'Member' },
    feedback_likes: [{ user_id: 'viewer-id' }],
    feedback_replies: [{ id: 'reply-id', author: { username: 'Reply author' }, body: 'Thanks' }],
  }] });
  const [post] = await feed('viewer-id', 0);
  assert.equal(post.image, 'https://example.test/signed-image');
  assert.equal(post.image_path, undefined);
  assert.equal(post.likes, 1);
  assert.equal(post.liked, true);
  assert.equal(post.author.username, 'Member');
  assert.equal(post.replies[0].user_profiles.username, 'Reply author');
  assert.equal(post.feedback_likes, undefined);
  assert.equal(post.feedback_replies, undefined);
});

test('feed does not report an empty successful result when the database query fails', async () => {
  const { feed, logs } = loadFeed({ data: null, error: { message: 'database detail' } });
  await assert.rejects(feed(null, 0), { message: 'Unable to load feedback' });
  assert.equal(logs.length, 1);
});
