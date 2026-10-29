import { PackageOpen } from 'lucide-react';
interface Props {title:string;description:string;children?:React.ReactNode;}
export default function EmptyState({title,description,children}:Props){return <div className="text-center py-12 px-6"><div className="icon-box mx-auto mb-4"><PackageOpen size={23}/></div><h3 className="text-lg font-semibold">{title}</h3><p className="text-muted text-sm mt-2 mb-5 max-w-md mx-auto">{description}</p>{children}</div>;}
