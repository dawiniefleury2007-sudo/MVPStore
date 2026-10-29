import { useState } from 'react';
import { Trash2, UserRound, Download, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import ProfileForm from '@/components/forms/ProfileForm';
import FileForm from '@/components/forms/FileForm';
import PaymentSettingsForm from '@/components/forms/PaymentSettingsForm';
import DataTable from '@/components/features/DataTable';
import { useStore } from '@/stores/StoreProvider';
import { dateLabel } from '@/constants/store';
export default function AdminSettings(){const {data,update,log}=useStore();const [tab,setTab]=useState('profile');return <div className="space-y-7"><div><p className="eyebrow mb-3">Store configuration</p><h1 className="page-title">Admin <span className="text-accent">settings.</span></h1><p className="text-muted text-sm mt-3">Your profile, product downloads and payment details.</p></div><div className="flex gap-2 flex-wrap">{[{id:'profile',name:'Profile',Icon:UserRound},{id:'files',name:'Downloads & files',Icon:Download},{id:'payments',name:'Payments',Icon:CreditCard}].map(({id,name,Icon})=><button className={`btn-secondary ${tab===id?'!bg-primary/25 !border-accent/40':''}`} key={id} onClick={()=>setTab(id)}><Icon size={16}/>{name}</button>)}</div>{tab==='profile'?<ProfileForm/>:tab==='payments'?<PaymentSettingsForm/>:<><FileForm type="product"/><FileForm type="setup"/><DataTable headers={['Name','Product','Type','Published','Action']} rows={data.files.map(f=>[f.name,data.products.find(p=>p.id===f.productId)?.name,f.type,dateLabel(f.date),<button key="d" className="btn-secondary !px-3" aria-label={`Remove ${f.name}`} onClick={()=>{update(d=>({...d,files:d.files.filter(item=>item.id!==f.id)}));log('File removed',f.name);toast.success('File removed');}}><Trash2 size={16} className="text-danger"/></button>])}/></>}</div>;}
