import { Link } from 'react-router-dom';
import { Clock3, ArrowRight } from 'lucide-react';
import { useStore } from '@/stores/StoreProvider';
import type { License } from '@/types/store';
import { daysLeft, dateLabel } from '@/constants/store';
import StatusBadge from '@/components/features/StatusBadge';
interface Props {license:License;}
export default function SubscriptionCard({license}:Props){const {data}=useStore();const product=data.products.find(p=>p.id===license.productId);const days=daysLeft(license.expires);return <div className="glass overflow-hidden"><div className="h-36 relative"><img src={product?.image} alt={product?.name} className="w-full h-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-background to-background/10"/><div className="absolute left-5 bottom-4"><StatusBadge status={license.status==='banned'?'banned':days?'active':'expired'}/><h3 className="text-2xl font-bold mt-2">{product?.name}</h3></div></div><div className="p-5"><div className="flex justify-between items-center mb-4 gap-2"><span className="flex gap-2 items-center text-sm font-semibold"><Clock3 size={17} className="text-accent"/>{days} days left</span><span className="text-muted text-xs">Ends {license.expires&&dateLabel(license.expires)}</span></div><Link to={`/account?nav=mvp&license=${license.id}`} className="btn-secondary w-full">View subscription<ArrowRight size={16}/></Link></div></div>;}
