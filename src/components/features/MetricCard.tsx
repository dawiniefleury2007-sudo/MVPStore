import type { LucideIcon } from 'lucide-react';
interface Props {label:string;value:string|number;Icon:LucideIcon;hint?:string;color?:string;}
export default function MetricCard({label,value,Icon,hint,color='text-accent'}:Props){return <div className="glass p-5"><div className="flex justify-between items-center"><p className="text-sm text-muted">{label}</p><Icon size={18} className={color}/></div><p className={`font-display text-3xl font-bold mt-4 ${color}`}>{typeof value==='number'?value.toLocaleString():value}</p>{hint&&<p className="text-[11px] text-muted mt-2">{hint}</p>}</div>;}
