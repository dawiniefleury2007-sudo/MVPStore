import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStore } from '@/stores/StoreProvider';
import { useUpload } from '@/hooks/useUpload';
import type { Product,Plan } from '@/types/store';
const schema=z.object({notes:z.string().max(1000)});
interface Props {product:Product;plan:Plan;method:string;}
export default function ProofForm({plan,method}:Props){const {action,data,busy}=useStore();const navigate=useNavigate();const upload=useUpload('mvp-proofs');const idempotency=useRef(crypto.randomUUID());const {register,handleSubmit}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{notes:''}});const configured=method==='PayPal'?data.payments.paypalUrl:data.payments.cashappUrl;
 return <form className="glass p-6 md:p-8" onSubmit={handleSubmit(async v=>{if(!upload.path){toast.error('Upload your payment screenshot first');return;}if(await action('order.submit',{planId:plan.id,method,proof:upload.path,notes:v.notes,idempotencyKey:idempotency.current})){toast.success('Proof submitted for administrator review');navigate('/account?nav=orders');}})}><h2 className="section-title">2. Upload payment proof</h2><p className="text-muted mt-3 mb-5">Payments are reviewed manually. A screenshot does not automatically mark your order as paid.</p><label className="block"><span className="label">Payment screenshot · PNG/JPEG/WebP, up to 5 MB</span><input className="input" type="file" accept="image/png,image/jpeg,image/webp" disabled={upload.uploading} onChange={e=>void upload.upload(e.target.files?.[0])}/></label>{upload.uploading&&<p role="status" className="text-muted mt-3">Uploading {upload.progress}%</p>}{upload.preview&&<img className="max-h-48 rounded-xl mt-4" src={upload.preview} alt="Payment screenshot preview"/>}<label className="block mt-5"><span className="label">Notes for administrator</span><textarea className="input min-h-24" {...register('notes')} maxLength={1000}/></label><button className="btn w-full mt-5" disabled={busy||upload.uploading||!upload.path||!configured}>Submit for review</button></form>;
}
