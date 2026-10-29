import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useStore } from '@/stores/StoreProvider';
const schema=z.object({key:z.string().min(12)});
export default function ResellerRedeemForm(){const {action,busy}=useStore();const {register,handleSubmit,formState:{errors}}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});return <form className="glass p-6" onSubmit={handleSubmit(async v=>{if(await action('reseller.redeem',v))toast.success('Reseller access granted');})}><label className="block"><span className="label">Reseller access key</span><input className="input" {...register('key')} placeholder="MVP-RSL-…"/></label>{errors.key&&<p className="text-danger">! Enter a valid reseller key</p>}<button className="btn mt-4" disabled={busy}>Redeem reseller access</button></form>;}
