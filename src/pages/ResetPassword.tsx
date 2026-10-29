import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
const schema=z.object({password:z.string().min(6),confirm:z.string()}).refine(v=>v.password===v.confirm,{message:'Passwords must match',path:['confirm']});
export default function ResetPassword(){const {service}=useAuth();const navigate=useNavigate();const {register,handleSubmit,formState:{errors,isSubmitting}}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});return <main className="min-h-screen grid place-items-center px-5"><form className="glass p-8 w-full max-w-md space-y-5" onSubmit={handleSubmit(v=>service.password(v.password).then(()=>{toast.success('Password updated');navigate('/account?nav=settings',{replace:true});},e=>toast.error(e.message)))}><h1 className="section-title">Set a new password</h1><label className="block"><span className="label">New password</span><input className="input" type="password" autoComplete="new-password" {...register('password')}/></label><label className="block"><span className="label">Confirm password</span><input className="input" type="password" autoComplete="new-password" {...register('confirm')}/></label>{Object.values(errors).map((e,i)=><p className="text-danger" key={i}>! {e.message}</p>)}<button disabled={isSubmitting} className="btn w-full">Save password</button></form></main>;}
