import { useStore } from '@/stores/StoreProvider';
import DataTable from '@/components/features/DataTable';
import StatusBadge from '@/components/features/StatusBadge';
import { dateLabel } from '@/constants/store';
export default function AdminSubscriptions(){const {data}=useStore();return <div className="space-y-6"><h1 className="page-title">Product subscriptions</h1><p className="text-muted">Activation summaries from licensed access. Expand a token to inspect complete activation history.</p><DataTable headers={['Product','Key reference','Status','Activated','Expires','Build ID']} rows={data.licenses.filter(l=>l.activated).map(l=>[data.products.find(p=>p.id===l.productId)?.name,l.key,<StatusBadge key="s" status={l.entitled?'active':l.status}/>,dateLabel(l.activated!),l.expires?dateLabel(l.expires):'Lifetime',l.buildId])}/></div>;}
