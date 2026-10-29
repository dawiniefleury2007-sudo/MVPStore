import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@/components/features/Modal';
import { toast } from 'sonner';
import { useStore } from '@/stores/StoreProvider';
import type { Order } from '@/types/store';
const schema=z.object({licenseId:z.string().uuid()});
interface Props {order:Order|null;onClose:()=>void;}
export default function AssignKeyModal({order,onClose}:Props){const {data,action,busy}=useStore();const {register,handleSubmit,formState:{errors}}=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});const candidates=data.licenses.filter(l=>l.productId===order?.productId&&l.status==='unused'&&!l.userId&&l.days===order?.plan.days);return <Dialog open={!!order} onOpenChange={v=>!v&&onClose()}><DialogContent className="!bg-surface !border-border"><DialogTitle>Approve payment & assign access</DialogTitle><DialogDescription className="!text-muted">Confirm the payment in your PayPal/Cash App account before approving. The server assigns an existing one-time license atomically.</DialogDescription><form className="space-y-4" onSubmit={handleSubmit(async v=>{if(order&&await action('admin.order.review',{id:order.id,decision:'approve',licenseId:v.licenseId})){toast.success('Order approved and access assigned');onClose();}})}><label className="block"><span className="label">Available matching license</span><select className="input" {...register('licenseId')}><option value="">Select a license</option>{candidates.map(l=><option key={l.id} value={l.id}>{l.key}</option>)}</select></label>{!candidates.length&&<p className="text-muted">Create a license for this product and exact plan duration first.</p>}{errors.licenseId&&<p className="text-danger">! Select an available license</p>}<button className="btn w-full" disabled={busy||!candidates.length}>Confirm manual review</button></form></DialogContent></Dialog>;}
