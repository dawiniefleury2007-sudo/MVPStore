import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, ArrowRight } from 'lucide-react';
import { useStore } from '@/stores/StoreProvider';
import { useLanguage } from '@/hooks/useLanguage';
const schema=z.object({key:z.string().min(6,'Enter your product key')});
export default function RedeemForm(){const {redeem}=useStore();const {t}=useLanguage();const {register,handleSubmit,formState:{errors}}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});return <section className="glass p-6 md:p-8 grid xl:grid-cols-2 gap-8 items-center"><div><div className="icon-box mb-4"><KeyRound size={22}/></div><h2 className="text-2xl font-semibold">Activate your product key</h2><p className="text-muted text-sm leading-7 mt-3 max-w-lg">Your next level is one key away. Redeem your ANTHONY ALONE license to unlock your panel, downloads and subscription.</p></div><form onSubmit={handleSubmit(v=>redeem(v.key))}><label className="label" htmlFor="redeem-key">Product key</label><div className="flex flex-col sm:flex-row gap-3"><input id="redeem-key" {...register('key')} className="input font-mono !text-sm" placeholder="ANTHONY ALONE-xxxxx-xxxxx-xxxxx"/><button className="btn whitespace-nowrap"><KeyRound size={17}/>{t('redeem')}<ArrowRight size={15}/></button></div>{errors.key&&<p className="text-danger text-xs mt-2">! {errors.key.message}</p>}<p className="text-muted text-xs mt-3">Your subscription starts on activation. Keys can only be redeemed once.</p></form></section>;}
