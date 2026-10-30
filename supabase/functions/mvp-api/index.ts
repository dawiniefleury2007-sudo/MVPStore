

import { corsHeaders, json } from '../_shared/cors.ts';
import {
  backend,
  AuthenticationError,
  identity,
  rpc,
  isAdmin,
  activeReseller,
  rows,
} from '../_shared/backend.ts';
import { snapshot } from '../_shared/snapshot.ts';
import { feed, leaderboard, searchUsers } from '../_shared/feed.ts';
import {
  issueUpload,
  validateImage,
  download,
} from '../_shared/storage.ts';

const MAX_BODY_SIZE = 100_000;
const MAX_PAGE = 10_000;
const PAGE_SIZE = 50;

const PUBLIC_OPERATIONS = new Set(['snapshot', 'feed', 'team']);

const OPERATIONS = new Set([
  'snapshot',
  'feed',
  'team',
  'leaderboard',
  'search',
  'resellers',
  'contacts',
  'analytics',
  'history',
  'upload',
  'download',
  'action',
]);

const IMAGE_ACTIONS: Record<string, [string, string]> = {
  'profile.save': ['mvp-avatars', 'avatarPath'],
  'order.submit': ['mvp-proofs', 'proof'],
  'feedback.publish': ['mvp-feedback', 'imagePath'],
  'contact.submit': ['mvp-contact', 'imagePath'],
};

class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function fail(message: string, status: number): never {
  throw new HttpError(message, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function boundedInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const number = Number(value);

  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(min, Math.min(Math.floor(number), max));
}

function requiredString(
  value: unknown,
  label: string,
  maxLength = 200,
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > maxLength
  ) {
    fail(`Invalid ${label}`, 400);
  }

  return value.trim();
}

function errorResponse(error: unknown): Response {
  if (error instanceof AuthenticationError) {
    return json({ error: error.message }, 401);
  }

  if (error instanceof HttpError) {
    return json({ error: error.message }, error.status);
  }

  const message =
    error instanceof Error ? error.message : 'Request failed';

  // Log the internal error server-side, but do not expose
  // database details, SQL errors, or internal implementation data.
  console.error(
    'MVP request failed:',
    message.slice(0, 300),
  );

  return json({ error: 'Internal server error' }, 500);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(
      { error: 'Method not allowed' },
      405,
    );
  }

  try {
    const contentLength = req.headers.get('content-length');

    if (contentLength !== null) {
      const length = Number(contentLength);

      if (!Number.isFinite(length) || length < 0) {
        fail('Invalid Content-Length', 400);
      }

      if (length > MAX_BODY_SIZE) {
        fail('Request too large', 413);
      }
    }

    const rawBody = await req.text();

    // Check the actual body as well because Content-Length
    // may be missing or unreliable.
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_SIZE) {
      fail('Request too large', 413);
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = JSON.parse(rawBody);

      if (!isRecord(parsed)) {
        fail('Request body must be a JSON object', 400);
      }

      body = parsed;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      fail('Invalid JSON body', 400);
    }

    const operation = requiredString(
      body.operation,
      'operation',
      50,
    );

    if (!OPERATIONS.has(operation)) {
      fail('Unknown operation', 400);
    }

    const payload = isRecord(body.payload)
      ? { ...body.payload }
      : {};

    const publicOperation = PUBLIC_OPERATIONS.has(operation);
    const user = await identity(req, publicOperation);

    // Keep rate limiting centralized. This assumes mvp_rate
    // enforces limits by raising an error when a limit is exceeded.
    if (user) {
      await rpc('mvp_rate', {
        p_user: user.id,
        p_action: operation,
        p_limit: operation === 'search' ? 30 : 60,
      });
    }

    console.log(
      'MVP operation',
      operation,
      'authenticated',
      Boolean(user),
    );

    // Public or optionally authenticated operations.
    if (operation === 'snapshot') {
      return json(await snapshot(user?.id ?? null));
    }

    if (operation === 'feed') {
      const page = boundedInt(body.page, 0, 0, MAX_PAGE);

      return json(
        await feed(user?.id ?? null, page, body.productId),
      );
    }

    if (operation === 'team') {
      return json(
        await rows(
          'team_members',
          'id,name,role,image,discord_url',
        ),
      );
    }

    if (!user) {
      fail('Authentication required', 401);
    }

    // Authenticated operations.
    if (operation === 'leaderboard') {
      const page = boundedInt(body.page, 0, 0, MAX_PAGE);

      return json(await leaderboard(page));
    }

    if (operation === 'search') {
      const prefix =
        typeof body.prefix === 'string'
          ? body.prefix.trim()
          : '';

      if (prefix.length > 100) {
        fail('Search prefix is too long', 400);
      }

      const page = boundedInt(body.page, 0, 0, MAX_PAGE);

      return json(
        await searchUsers(user.id, prefix, page),
      );
    }

    if (operation === 'resellers' || operation === 'contacts') {
      if (!(await isAdmin(user.id))) {
        fail('Administrator access required', 403);
      }

      const page = boundedInt(body.page, 0, 0, MAX_PAGE);
      const table =
        operation === 'resellers'
          ? 'reseller_access'
          : 'contact_messages';

      const columns =
        operation === 'resellers'
          ? [
              'id',
              'user_id',
              'access_type',
              'starts_at',
              'ends_at',
              'status',
              'allowed_products',
              'quota',
              'max_quantity',
              'max_duration_seconds',
              'allow_lifetime',
            ].join(',')
          : 'id,name,email,message,created_at';

      const { data, error } = await backend
        .from(table)
        .select(columns)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (error) {
        throw error;
      }

      return json(data ?? []);
    }

    if (operation === 'analytics') {
      const admin = await isAdmin(user.id);

      if (!admin && !(await activeReseller(user.id))) {
        fail('Access denied', 403);
      }

      const days = boundedInt(body.days, 7, 1, 90);

      return json(
        await rpc('mvp_analytics', {
          p_user: user.id,
          p_days: days,
        }),
      );
    }

    if (operation === 'history') {
      const licenseId = requiredString(body.id, 'license ID', 200);

      const { data: license, error } = await backend
        .from('licenses')
        .select('id,creator_id')
        .eq('id', licenseId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!license) {
        fail('License not found', 404);
      }

      const admin = await isAdmin(user.id);

      if (!admin) {
        if (license.creator_id !== user.id) {
          fail('License access denied', 403);
        }

        if (!(await activeReseller(user.id))) {
          fail('License access denied', 403);
        }
      }

      const { data, error: historyError } = await backend
        .from('license_activations')
        .select(
          'id,activated_at,expires_at,build_id,user_profiles(username,avatar_url)',
        )
        .eq('license_id', license.id)
        .order('activated_at', { ascending: false })
        .limit(100);

      if (historyError) {
        throw historyError;
      }

      return json(data ?? []);
    }

    if (operation === 'upload') {
      const upload = await issueUpload(user.id, payload);
      return json({ path: upload.path, signedUrl: upload.signedUrl });
    }

    if (operation === 'download') {
      const id = requiredString(body.id, 'download ID', 200);

      return json(await download(user.id, id));
    }

    if (operation === 'action') {
      const action = requiredString(body.action, 'action', 100);

      if (action.startsWith('admin.')) {
        if (!(await isAdmin(user.id))) {
          fail('Administrator access required', 403);
        }
      }

      const imageAction = IMAGE_ACTIONS[action];
      const imagePath = imageAction
        ? payload[imageAction[1]]
        : undefined;

      if (imageAction && imagePath !== undefined && imagePath !== null) {
        if (typeof imagePath !== 'string' || imagePath.length > 1024) {
          fail('Invalid image path', 400);
        }

        await validateImage(
          user.id,
          imageAction[0],
          imagePath,
        );
      }

      if (action === 'profile.save') {
        // Do not trust client-supplied public URLs.
        delete payload.avatarUrl;

        if (payload.avatarPath) {
          const path = requiredString(
            payload.avatarPath,
            'avatar path',
            1024,
          );

          payload.avatarUrl = backend.storage
            .from('mvp-avatars')
            .getPublicUrl(path).data.publicUrl;
        }
      }

      const result = await rpc('mvp_action', {
        p_user: user.id,
        p_action: action,
        p: payload,
      });

      return json(result);
    }

    fail('Unknown operation', 400);
  } catch (error) {
    return errorResponse(error);
  }
});
