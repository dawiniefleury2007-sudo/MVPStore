import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useStore } from '@/stores/StoreProvider';
const schema=z.object({body:z.string().trim().min(1).max(1000)});
export default function ReplyForm({id}:{id:string}){const {action,busy}=useStore();const {register,handleSubmit,reset,formState:{errors}}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});return <form onSubmit={handleSubmit(async v=>{if(await action('feedback.reply',{id,...v}))reset();})} className="mt-4"><label className="block"><span className="label">Write a reply</span><textarea className="input" maxLength={1000} {...register('body')}/></label>{errors.body&&<p className="text-danger">! Enter 1–1,000 characters</p>}<button disabled={busy} className="btn-secondary mt-3">Post reply</button></form>;}
