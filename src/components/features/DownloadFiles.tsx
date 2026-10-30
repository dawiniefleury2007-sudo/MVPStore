import { Download } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/supabase';
import { useStore } from '@/stores/StoreProvider';
import EmptyState from '@/components/features/EmptyState';
import { dateLabel } from '@/constants/store';
interface Props {productId:string;type:'product'|'setup';}
export default function DownloadFiles({productId,type}:Props){const {data}=useStore();const files=data.files.filter(f=>f.type===type&&(type==='setup'||f.productId===productId));const mutation=useMutation({mutationFn:(id:string)=>api<{url:string}>('download',{id}),onSuccess:({url})=>{const link=document.createElement('a');link.href=url;link.rel='noreferrer';link.target='_blank';link.click();},onError:(e:Error)=>toast.error(e.message)});return <section className="glass p-6"><h2 className="section-title">{type==='product'?'Product ANTHONY ALONE files':'Setup files'}</h2><p className="text-muted mt-3">Downloads are authorized by the server on every request.</p>{files.length?<div className="grid xl:grid-cols-2 gap-4 mt-6">{files.map(f=><div key={f.id} className="solid-panel p-4 flex gap-4 items-center"><img className="w-12 h-12 object-cover rounded-lg" src={f.image} alt={f.name}/><div className="flex-1 min-w-0"><h3 className="font-semibold truncate">{f.name}</h3><p className="text-sm text-muted">Updated {dateLabel(f.date)}</p></div><button disabled={mutation.isPending} className="btn-secondary" aria-label={`Download ${f.name}`} onClick={()=>mutation.mutate(f.id)}><Download size={18}/></button></div>)}</div>:<EmptyState title="No downloads published" description="An administrator can publish files for this product."/>}</section>;}
