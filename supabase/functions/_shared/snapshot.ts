
import {
  backend,
  rows,
  rpc,
  isAdmin,
  activeReseller,
} from './backend.ts';
import { signedImage } from './storage.ts';

const MAX_RECORDS = 100;
const DAY_SECONDS = 86_400;

const PAYMENT_DEFAULTS = {
  paypalName: '',
  paypalUrl: '',
  cashappName: '',
  cashappUrl: '',
};

function nowIso(): string {
  return new Date().toISOString();
}

function toNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toDays(seconds: unknown): number {
  return toNumber(seconds) / DAY_SECONDS;
}

function toPrice(cents: unknown): number {
  return toNumber(cents) / 100;
}

function isExpired(value: string | null | undefined, now: number) {
  if (!value) return false;

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now;
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value))
  );
}

function sortNewest<T extends { created_at?: string | null }>(
  records: T[],
): T[] {
  return records.sort(
    (a, b) =>
      Date.parse(b.created_at || '') -
      Date.parse(a.created_at || ''),
  );
}

function safeDetail(value: unknown): string {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

export async function snapshot(userId: string | null) {
  const serverTime = nowIso();
  const now = Date.parse(serverTime);

  // Resolve authorization before selecting privileged data.
  const [admin, reseller] = userId
    ? await Promise.all([
        isAdmin(userId),
        activeReseller(userId),
      ])
    : [false, false];

  // Public catalog.
  const [catalog, settings] = await Promise.all([
    rows(
      'products',
      'id,name,description,image,category,tag,available,product_plans(id,name,duration_seconds,price_cents)',
    ),
    rows(
      'store_settings',
      'value',
      { key: 'id', value: 'payments' },
      1,
    ),
  ]);

  const products = catalog
    .filter((product) => admin || product.available)
    .map((product) => {
      const plans = Array.isArray(product.product_plans)
        ? product.product_plans
        : [];

      return {
        ...product,
        plans: plans
          .map(
            (plan: {
              id: string;
              name: string;
              duration_seconds: number;
              price_cents: number;
            }) => ({
              id: plan.id,
              name: plan.name,
              days: toDays(plan.duration_seconds),
              price: toPrice(plan.price_cents),
            }),
          )
          .sort((a, b) => a.days - b.days),
      };
    });

  const paymentSettings = settings[0]?.value;

  const payments =
    paymentSettings &&
    typeof paymentSettings === 'object' &&
    !Array.isArray(paymentSettings)
      ? { ...PAYMENT_DEFAULTS, ...paymentSettings }
      : { ...PAYMENT_DEFAULTS };

  const empty = {
    users: [],
    products,
    licenses: [],
    orders: [],
    files: [],
    logs: [],
    claims: [],
    claimTypes: [],
    notifications: [],
    payments,
    metrics: {
      users: 0,
      licenses: 0,
      active: 0,
      banned: 0,
      expired: 0,
      unusedUsers: 0,
    },
    serverTime,
  };

  if (!userId) {
    return { data: empty };
  }

  const { data: authData, error: authError } =
    await backend.auth.admin.getUserById(userId);

  if (authError || !authData?.user) {
    throw new Error('Unable to verify account');
  }

  // OAuth users can exist in auth.users before a legacy profile row exists.
  // Provision the minimum profile required by permission and account queries.
  let profiles = await rows(
    'user_profiles',
    'id,username,email,avatar_url,created_at',
    { key: 'id', value: userId },
    1,
  );
  if (!profiles[0]) {
    const metadata = authData.user.user_metadata ?? {};
    const metadataName =
      typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string'
          ? metadata.name
          : '';
    const email = authData.user.email ?? '';
    const fallbackName = email.split('@')[0] || `Member-${userId.slice(0, 8)}`;
    const username = (metadataName.trim() || fallbackName).slice(0, 100);
    const avatar =
      typeof metadata.avatar_url === 'string'
        ? metadata.avatar_url.slice(0, 2000)
        : null;
    let { error: profileInsertError } = await backend
      .from('user_profiles')
      .insert({ id: userId, username, email, avatar_url: avatar });

    // If usernames are unique, retry a collision with a deterministic name.
    if (profileInsertError && /duplicate|unique/i.test(profileInsertError.message)) {
      ({ error: profileInsertError } = await backend
        .from('user_profiles')
        .insert({
          id: userId,
          username: `Member-${userId.slice(0, 8)}`,
          email,
          avatar_url: avatar,
        }));
    }
    // A database trigger or another request may have provisioned it first.
    if (profileInsertError && !/duplicate|unique/i.test(profileInsertError.message)) {
      throw new Error('Unable to create account profile');
    }
    profiles = await rows(
      'user_profiles',
      'id,username,email,avatar_url,created_at',
      { key: 'id', value: userId },
      1,
    );
  }

  // Profile-dependent maintenance must run after first-login provisioning.
  await rpc('mvp_maintain', {
    p_user: userId,
  });

  const [
    xpAccounts,
    claimResult,
    claimTypes,
    activationOwnership,
    rawFiles,
    notificationResult,
    resellerAccess,
  ] = await Promise.all([
    rows(
      'xp_accounts',
      'balance,total_earned',
      { key: 'user_id', value: userId },
      1,
    ),
    backend
      .from('xp_claims')
      .select('id,source,reward,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_RECORDS),
    rows(
      'xp_claim_types',
      'id,name,reward,cooldown_seconds,enabled',
    ),
    rows(
      'license_activations',
      'license_id',
      { key: 'user_id', value: userId },
    ),
    rows(
      'product_files',
      'id,name,image,product_id,kind,created_at,enabled',
    ),
    backend
      .from('notifications')
      .select('id,title,body,created_at,read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_RECORDS),
    rows(
      'reseller_access',
      'id,user_id,access_type,starts_at,ends_at,status,allowed_products,quota,max_quantity,max_duration_seconds,allow_lifetime',
      { key: 'user_id', value: userId },
    ),
  ]);

  if (claimResult.error) {
    throw new Error('Unable to load claim history');
  }

  if (notificationResult.error) {
    throw new Error('Unable to load notifications');
  }

  const profile = profiles[0];

  if (!profile) {
    throw new Error('Profile unavailable');
  }

  const claims = sortNewest(claimResult.data ?? []);
  const notifications = sortNewest(
    notificationResult.data ?? [],
  );

  const user = {
    id: userId,
    name: profile.username || 'MVP Member',
    email: profile.email,
    avatar: profile.avatar_url,
    role: admin ? 'admin' : reseller ? 'reseller' : 'client',
    xp: toNumber(xpAccounts[0]?.balance),
    totalEarned: toNumber(xpAccounts[0]?.total_earned),
    balance: 0,
    lastActive:
      authData.user.last_sign_in_at || profile.created_at,
    lastClaim: claims.find(
      (claim) => claim.source === 'daily',
    )?.created_at,
  };

  // Only fetch licenses the current user is authorized to see.
  let licenseQuery = backend
    .from('licenses')
    .select(
      'id,key_hint,product_id,creator_id,owner_id,duration_seconds,status,note,ban_reason,created_at,activation_limit,activation_count,license_activations(id,user_id,activated_at,expires_at,build_id)',
    )
    .order('created_at', { ascending: false })
    .limit(MAX_RECORDS);

  if (!admin) {
    const activationIds = [
      ...new Set(
        activationOwnership
          .map((record) => record.license_id)
          .filter(
            (id): id is string =>
              typeof id === 'string' &&
              /^[0-9a-f-]{36}$/i.test(id),
          ),
      ),
    ];

    const scopes = [
      `owner_id.eq.${userId}`,
      ...(reseller ? [`creator_id.eq.${userId}`] : []),
    ];

    if (activationIds.length > 0) {
      scopes.push(`id.in.(${activationIds.join(',')})`);
    }

    licenseQuery = licenseQuery.or(scopes.join(','));
  }

  const { data: rawLicenses, error: licenseError } =
    await licenseQuery;

  if (licenseError) {
    throw new Error('Unable to load licenses');
  }

  const licenses = await Promise.all(
    (rawLicenses ?? []).map(async (license) => {
      const activations = Array.isArray(
        license.license_activations,
      )
        ? license.license_activations
        : [];

      // Prefer this user's activation, otherwise the most recent
      // activation supplied by the database relationship.
      const activation =
        activations.find(
          (item: { user_id: string }) =>
            item.user_id === userId,
        ) ?? activations[0];

      const entitled = activation
        ? await rpc<boolean>('mvp_license_entitled', {
            p_user: activation.user_id,
            p_license: license.id,
          })
        : false;

      let status = license.status;

      if (status === 'available') {
        status = 'unused';
      } else if (
        ['active', 'redeemed'].includes(status)
      ) {
        status =
          activation?.expires_at &&
          isExpired(activation.expires_at, now)
            ? 'expired'
            : 'active';
      }

      return {
        id: license.id,
        key: license.key_hint,
        productId: license.product_id,
        creatorId: license.creator_id,
        assigned: Boolean(license.owner_id),
        userId: activation?.user_id,
        days:
          license.duration_seconds === null
            ? 0
            : toDays(license.duration_seconds),
        status,
        created: license.created_at,
        activated: activation?.activated_at,
        expires: activation?.expires_at,
        buildId: activation?.build_id,
        entitled: entitled === true,
        resets: 0,
        note: license.note,
        banReason: license.ban_reason,
        activationCount: license.activation_count,
        activationLimit: license.activation_limit,
      };
    }),
  );

  // Orders are always scoped to the current user unless admin.
  let orderQuery = backend
    .from('orders')
    .select(
      'id,reference,user_id,amount_cents,status,proof_path,notes,method,created_at,order_items(product_id,license_id,product_plans(id,name,duration_seconds,price_cents))',
    )
    .order('created_at', { ascending: false })
    .limit(MAX_RECORDS);

  if (!admin) {
    orderQuery = orderQuery.eq('user_id', userId);
  }

  const { data: rawOrders, error: orderError } =
    await orderQuery;

  if (orderError) {
    throw new Error('Unable to load orders');
  }

  const orders = await Promise.all(
    (rawOrders ?? []).map(async (order) => {
      const item = order.order_items?.[0];
      const plan = item?.product_plans;

      // Never attempt to sign a missing proof path.
      // The order query already enforces the visibility scope.
      let proof: string | null = null;

      if (
        typeof order.proof_path === 'string' &&
        order.proof_path.length > 0
      ) {
        try {
          proof = await signedImage(
            userId,
            'mvp-proofs',
            order.proof_path,
          );
        } catch {
          // A missing or invalid proof should not break the
          // entire dashboard. Record a sanitized warning.
          console.warn('Unable to sign order proof', {
            orderId: order.id,
          });
        }
      }

      const orderStatus =
        order.status === 'fulfilled'
          ? 'completed'
          : order.status === 'failed'
            ? 'rejected'
            : 'pending';

      return {
        id: order.id,
        reference: order.reference,
        userId: order.user_id,
        productId: item?.product_id,
        plan: {
          id: plan?.id,
          name: plan?.name,
          days: toDays(plan?.duration_seconds),
          price: toPrice(plan?.price_cents),
        },
        amount: toPrice(order.amount_cents),
        status: orderStatus,
        date: order.created_at,
        proof,
        notes: order.notes,
        method: order.method,
        licenseId: item?.license_id,
      };
    }),
  );

  // Only expose enabled catalog files.
  const files = rawFiles
    .filter((file) => file.enabled)
    .map((file) => ({
      id: file.id,
      name: file.name,
      image: file.image,
      productId: file.product_id || '',
      type: file.kind,
      date: file.created_at,
      url: '',
    }));

  // Admin sees audit logs; other users see only their own activity.
  let logQuery = backend
    .from(admin ? 'audit_logs' : 'activity_events')
    .select(
      admin
        ? 'id,actor_id,action,created_at,detail'
        : 'id,user_id,action,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(MAX_RECORDS);

  if (!admin) {
    logQuery = logQuery.eq('user_id', userId);
  }

  const { data: logRows, error: logError } = await logQuery;

  if (logError) {
    throw new Error('Unable to load activity');
  }

  const logs = (logRows ?? []).map((record) => ({
    id: record.id,
    actor:
      record.actor_id ||
      record.user_id ||
      'System',
    action: record.action,
    time: record.created_at,
    detail: safeDetail(record.detail),
  }));

  logs.sort(
    (a, b) =>
      Date.parse(b.time || '') -
      Date.parse(a.time || ''),
  );

  const activeAccess = resellerAccess.find(
    (access) =>
      access.status === 'active' &&
      isValidDate(access.starts_at) &&
      isValidDate(access.ends_at) &&
      Date.parse(access.starts_at) <= now &&
      Date.parse(access.ends_at) > now,
  );

  // Preserve the existing snapshot shape for the frontend.
  return {
    user,
    data: {
      ...empty,
      users: [user],
      licenses,
      orders,
      files,
      logs,
      claims,
      claimTypes,
      notifications,
      reseller: activeAccess ?? resellerAccess[0],
      metrics: await rpc('mvp_metrics', {
        p_user: userId,
      }),
    },
  };
}
