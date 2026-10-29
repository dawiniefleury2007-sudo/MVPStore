
import { backend, isAdmin, rpc } from './backend.ts';

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

const IMAGE_BUCKETS = [
  'mvp-avatars',
  'mvp-proofs',
  'mvp-feedback',
  'mvp-contact',
] as const;

const UPLOAD_BUCKETS = [
  'mvp-private',
  ...IMAGE_BUCKETS,
] as const;

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_PRIVATE_SIZE = 100 * 1024 * 1024;
const SIGNED_IMAGE_TTL = 300;
const SIGNED_DOWNLOAD_TTL = 60;

type UploadPayload = Record<string, unknown>;

function fail(message: string): never {
  throw new Error(message);
}

function requiredString(
  value: unknown,
  label: string,
  maxLength = 1024,
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.length > maxLength
  ) {
    fail(`Invalid ${label}`);
  }

  return value.trim();
}

function validUserId(userId: string): string {
  return requiredString(userId, 'user ID', 200);
}

function isImageBucket(
  bucket: string,
): bucket is (typeof IMAGE_BUCKETS)[number] {
  return IMAGE_BUCKETS.includes(
    bucket as (typeof IMAGE_BUCKETS)[number],
  );
}

function imageMaxSize(bucket: string): number {
  return bucket === 'mvp-avatars'
    ? MAX_AVATAR_SIZE
    : MAX_IMAGE_SIZE;
}

function safeStoragePath(path: string): boolean {
  if (
    !path ||
    path.length > 1024 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.includes('\0')
  ) {
    return false;
  }

  const segments = path.split('/');

  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment !== '.' &&
      segment !== '..',
  );
}

function hasImageSignature(
  bytes: Uint8Array,
): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  // PNG signature
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG signature
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  // WebP signature: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

function hasZipSignature(bytes: Uint8Array): boolean {
  // Standard ZIP local-file header, empty archive end record,
  // or ZIP spanning/data-descriptor header.
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (
      (bytes[2] === 0x03 && bytes[3] === 0x04) ||
      (bytes[2] === 0x05 && bytes[3] === 0x06) ||
      (bytes[2] === 0x07 && bytes[3] === 0x08)
    )
  );
}

/**
 * Creates a signed upload URL for an allowed destination.
 *
 * Client-supplied size and MIME type are preliminary checks only.
 * Validate the actual uploaded bytes before using the file.
 */
export async function issueUpload(
  userId: string,
  payload: UploadPayload,
) {
  userId = validUserId(userId);

  const bucket = requiredString(
    payload.bucket,
    'upload destination',
    100,
  );

  if (
    !UPLOAD_BUCKETS.includes(
      bucket as (typeof UPLOAD_BUCKETS)[number],
    )
  ) {
    fail('Invalid upload destination');
  }

  const size = payload.size;
  const mime = payload.mime;

  if (
    typeof size !== 'number' ||
    !Number.isSafeInteger(size) ||
    size < 1
  ) {
    fail('Invalid file size');
  }

  if (typeof mime !== 'string') {
    fail('Invalid file type');
  }

  const privateFile = bucket === 'mvp-private';
  const maxSize = privateFile
    ? MAX_PRIVATE_SIZE
    : imageMaxSize(bucket);

  if (size > maxSize) {
    fail('File exceeds the maximum allowed size');
  }

  if (privateFile) {
    if (
      ![
        'application/zip',
        'application/x-zip-compressed',
        'application/octet-stream',
      ].includes(mime)
    ) {
      fail('Only ZIP uploads are allowed');
    }

    if (!(await isAdmin(userId))) {
      fail('Administrator access required');
    }
  } else if (
    !isImageBucket(bucket) ||
    !IMAGE_TYPES.includes(
      mime as (typeof IMAGE_TYPES)[number],
    )
  ) {
    fail('Use a valid PNG, JPEG or WebP image');
  }

  const extension = privateFile
    ? 'zip'
    : mime === 'image/jpeg'
      ? 'jpg'
      : mime === 'image/png'
        ? 'png'
        : 'webp';

  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { data, error } = await backend.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data?.token || !data?.signedUrl) {
    console.error('Unable to create signed upload URL', {
      bucket,
      userId,
    });

    fail('Unable to prepare upload');
  }

  return {
    path,
    token: data.token,
    signedUrl: data.signedUrl,
  };
}

/**
 * Downloads the uploaded object and validates its actual
 * image signature, size and ownership.
 */
export async function validateImage(
  userId: string,
  bucket: string,
  path: string,
): Promise<void> {
  userId = validUserId(userId);

  if (!isImageBucket(bucket)) {
    fail('Invalid image destination');
  }

  path = requiredString(path, 'image path', 1024);

  if (
    !safeStoragePath(path) ||
    !path.startsWith(`${userId}/`)
  ) {
    fail('Image ownership required');
  }

  const { data, error } = await backend.storage
    .from(bucket)
    .download(path);

  if (error || !data) {
    fail('Image upload not found');
  }

  const maxSize = imageMaxSize(bucket);

  if (data.size < 1 || data.size > maxSize) {
    fail('Invalid image size');
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const detectedType = hasImageSignature(bytes);

  if (!detectedType) {
    fail('Use a valid PNG, JPEG or WebP image');
  }

  // Check the extension against the detected file type.
  const expectedExtension: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };

  const lowerPath = path.toLowerCase();
  const extension = expectedExtension[detectedType];

  if (
    !lowerPath.endsWith(extension) &&
    !(detectedType === 'image/jpeg' && lowerPath.endsWith('.jpeg'))
  ) {
    fail('Image content does not match its file extension');
  }
}

/**
 * Generates a short-lived signed URL only for an image
 * belonging to the authenticated user.
 */
export async function signedImage(
  userId: string,
  bucket: string,
  path: string,
): Promise<string> {
  userId = validUserId(userId);

  if (!isImageBucket(bucket)) {
    fail('Invalid image destination');
  }

  path = requiredString(path, 'image path', 1024);

  if (
    !safeStoragePath(path) ||
    !path.startsWith(`${userId}/`)
  ) {
    fail('Image ownership required');
  }

  const { data, error } = await backend.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_IMAGE_TTL);

  if (error || !data?.signedUrl) {
    fail('Unable to load image');
  }

  return data.signedUrl;
}

/**
 * Authorizes downloads, records an audit event, then returns
 * a short-lived storage URL or an approved external URL.
 */
export async function download(
  userId: string,
  id: string,
) {
  userId = validUserId(userId);
  id = requiredString(id, 'file ID', 200);

  const { data: file, error } = await backend
    .from('product_files')
    .select(
      'id,product_id,enabled,kind,external_url,storage_path',
    )
    .eq('id', id)
    .eq('enabled', true)
    .maybeSingle();

  if (error) {
    console.error('Unable to retrieve download record', {
      userId,
    });

    fail('Unable to verify file availability');
  }

  if (!file) {
    fail('File unavailable');
  }

  const admin = await isAdmin(userId);

  const entitled = admin
    ? true
    : await rpc<boolean>('mvp_entitled', {
        p_user: userId,
        p_product: file.product_id,
      });

  const allowed = entitled === true;

  // Preserve strict auditing: fail closed if the audit write fails.
  const { error: auditError } = await backend
    .from('audit_logs')
    .insert({
      actor_id: userId,
      action: allowed
        ? 'download.allowed'
        : 'download.denied',
      entity_id: id,
    });

  if (auditError) {
    console.error('Download audit write failed', {
      userId,
      fileId: id,
    });

    fail('Unable to audit download');
  }

  if (!allowed) {
    fail('An active subscription is required');
  }

  if (file.kind === 'setup') {
    const externalUrl = file.external_url;

    if (
      typeof externalUrl !== 'string' ||
      externalUrl.length > 2048
    ) {
      fail('External download is unavailable');
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(externalUrl);
    } catch {
      fail('Invalid external download URL');
    }

    if (
      parsedUrl.protocol !== 'https:' ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      fail('External download URL is not allowed');
    }

    return { url: parsedUrl.toString() };
  }

  const storagePath = file.storage_path;

  if (
    typeof storagePath !== 'string' ||
    !safeStoragePath(storagePath)
  ) {
    fail('Invalid storage configuration');
  }

  const { data, error: signError } = await backend.storage
    .from('mvp-private')
    .createSignedUrl(
      storagePath,
      SIGNED_DOWNLOAD_TTL,
      { download: true },
    );

  if (signError || !data?.signedUrl) {
    console.error('Unable to create download URL', {
      userId,
      fileId: id,
    });

    fail('Unable to authorize download');
  }

  return { url: data.signedUrl };
}
