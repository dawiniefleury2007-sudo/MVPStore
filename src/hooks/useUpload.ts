import { useEffect,useRef,useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/supabase';
interface Ticket {path:string;signedUrl:string;}
export function useUpload(bucket:string){const [path,setPath]=useState('');const [preview,setPreview]=useState('');const [progress,setProgress]=useState(0);const [uploading,setUploading]=useState(false);const uploadLock=useRef(false);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 const upload=async(file?:File)=>{if(!file||uploadLock.current)return;const limit=bucket==='mvp-avatars'?2097152:bucket==='mvp-private'?104857600:5242880;if(file.size>limit||(!['image/jpeg','image/png','image/webp'].includes(file.type)&&bucket!=='mvp-private')){toast.error(`Choose a supported file under ${Math.round(limit/1048576)} MB.`);return;}uploadLock.current=true;
 setUploading(true);setProgress(0);setPath('');setPreview(bucket==='mvp-private'?'':URL.createObjectURL(file));
 try{const ticket=await api<Ticket>('upload',{payload:{bucket,size:file.size,mime:file.type||'application/octet-stream'}});
 await new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',ticket.signedUrl);xhr.timeout=15000;xhr.ontimeout=()=>reject(new Error('Upload timed out. Check your connection and retry.'));xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');xhr.upload.onprogress=e=>{if(e.lengthComputable)setProgress(Math.round(e.loaded/e.total*100));};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('Upload rejected. Check your file and retry.'));xhr.onerror=()=>reject(new Error('Upload failed. Check your connection.'));xhr.send(file);});setPath(ticket.path);setProgress(100);
 }catch(error){toast.error(error instanceof Error?error.message:'Upload failed');setPreview('');}finally{uploadLock.current=false;setUploading(false);}};
 return {path,preview,progress,uploading,upload};
}
