import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { profileSchema } from '@/lib/validations';
import { useStore } from '@/stores/StoreProvider';
export default function ProfileForm(){const {user,update,log}=useStore();const {register,handleSubmit,formState:{errors}}=useForm<z.infer<typeof profileSchema>>({resolver:zodResolver(profileSchema),defaultValues:{name:user?.name}});return <form className="glass p-6" onSubmit={handleSubmit(v=>{update(d=>({...d,users:d.users.map(u=>u.id===user?.id?{...u,name:v.name}:u)}));log('Profile updated',v.name);toast.success('Profile saved');})}><h2 className="section-title">Personal information</h2><p className="text-muted text-sm mt-2 mb-6">How you appear across the MVP Store.</p><div className="grid md:grid-cols-2 gap-5"><label><span className="label">Display name</span><input className="input" {...register('name')}/>{errors.name&&<span className="text-danger text-xs">! {errors.name.message}</span>}</label><label><span className="label">Email address</span><input className="input" value={user?.email||''} disabled/><span className="text-xs text-muted">Email cannot be changed here.</span></label></div><button className="btn mt-6">Save changes</button></form>;}
