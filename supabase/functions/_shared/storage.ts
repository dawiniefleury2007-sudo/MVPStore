import { backend, isAdmin, rpc } from './backend.ts';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export async function issueUpload(userId: string, p: Record<string, unknown>) {
 const bucket = String(p.bucket); const size = Number(p.size); const mime = String(p.mime);
 if (!['mvp-private','mvp-avatars','mvp-proofs','mvp-feedback','mvp-contact'].includes(bucket)) throw new Error('Invalid upload destination');
 const privateFile = bucket === 'mvp-private'; const max = privateFile ? 104857600 : bucket === 'mvp-avatars' ? 2097152 : 5242880;
 if (!Number.isInteger(size) || size < 1 || size > max || (!privateFile && !IMAGE_TYPES.includes(mime)) || (privateFile && !['application/zip','application/x-zip-compressed','application/octet-stream'].includes(mime))) throw new Error('Invalid file type or size');
 if (privateFile && !await isAdmin(userId)) throw new Error('Administrator access required');
 const ext = privateFile ? 'zip' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
 const path = `${userId}/${crypto.randomUUID()}.${ext}`;
 const { data, error } = await backend.storage.from(bucket).createSignedUploadUrl(path); if (error) throw new Error('Unable to prepare upload');
 return { path, token: data.token };
}
export async function validateImage(userId: string, bucket: string, path: string) {
 if (!path.startsWith(userId + '/')) throw new Error('Image ownership required');
 const { data, error } = await backend.storage.from(bucket).download(path); if (error || !data) throw new Error('Image upload not found');
 if (data.size > (bucket === 'mvp-avatars' ? 2097152 : 5242880)) throw new Error('Image too large');
 const b = new Uint8Array(await data.arrayBuffer());
 const png = b[0]===137 && b[1]===80 && b[2]===78 && b[3]===71;
 const jpg = b[0]===255 && b[1]===216 && b[2]===255;
 const webp = new TextDecoder().decode(b.slice(0,4))==='RIFF' && new TextDecoder().decode(b.slice(8,12))==='WEBP';
 if (!png && !jpg && !webp) throw new Error('Use a valid PNG, JPEG or WebP image');
}
export async function signedImage(bucket: string, path: string) {
 const { data, error } = await backend.storage.from(bucket).createSignedUrl(path, 300); if (error) throw new Error('Unable to load image'); return data.signedUrl;
}
export async function download(userId: string, id: string) {
 const { data: file, error } = await backend.from('product_files').select('*').eq('id',id).eq('enabled',true).single(); if (error || !file) throw new Error('File unavailable');
 const allowed = await isAdmin(userId) || await rpc<boolean>('mvp_entitled',{p_user:userId,p_product:file.product_id});
 const { error: auditError } = await backend.from('audit_logs').insert({actor_id:userId,action:allowed?'download.allowed':'download.denied',entity_id:id}); if (auditError) throw new Error('Unable to audit download');
 if (!allowed) throw new Error('An active subscription is required');
 if (file.kind === 'setup') return { url: file.external_url };
 const { data, error: signError } = await backend.storage.from('mvp-private').createSignedUrl(file.storage_path,60,{download:true}); if (signError) throw new Error('Unable to authorize download'); return {url:data.signedUrl};
}
