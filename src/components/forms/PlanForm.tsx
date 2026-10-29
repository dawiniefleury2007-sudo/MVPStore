import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useStore } from '@/stores/StoreProvider';
const schema=z.object({name:z.string().min(2),days:z.coerce.number().int().positive(),price:z.coerce.number().positive()});
interface Props {productId:string;}
export default function PlanForm({productId}:Props){const {action,busy}=useStore();const {register,handleSubmit,reset,formState:{errors}}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});return <form className="grid sm:grid-cols-4 gap-3 mt-4" onSubmit={handleSubmit(async v=>{if(await action('admin.plan.add',{...v,productId})){toast.success('Plan added');reset();}})}><label><span className="label">Plan name</span><input className="input !text-sm" {...register('name')} placeholder="Monthly"/></label><label><span className="label">Days</span><input type="number" className="input !text-sm" {...register('days')}/></label><label><span className="label">Price (USD)</span><input type="number" step="0.01" className="input !text-sm" {...register('price')}/></label><button disabled={busy} className="btn-secondary self-end">Add plan</button>{Object.keys(errors).length>0&&<p className="text-danger text-xs col-span-full">! Enter a plan name, positive days and positive price.</p>}</form>;}
