import type { ReactNode } from 'react';
import { Navigate,Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/stores/StoreProvider';
import ResellerRedeemForm from '@/components/forms/ResellerRedeemForm';
interface Props {children:ReactNode;role?:'admin'|'reseller';}
export default function RouteGuard({children,role}:Props){const auth=useAuth();const {user,loading,error,refresh}=useStore();
 if(auth.loading||loading)return <div className="min-h-screen grid place-items-center"><p className="glass p-8">Verifying session and permissions…</p></div>;
 if(!auth.user)return <Navigate to="/login" replace/>;
 if(error||!user)return <div className="glass p-8 m-8"><p className="text-danger">{error?.message||'Unable to verify permissions'}</p><button className="btn-secondary mt-4" onClick={refresh}>Retry verification</button></div>;
 if(role==='admin'&&user.role!=='admin')return <div className="min-h-screen grid place-items-center"><section className="glass p-8"><h1 className="section-title">Administrator access required</h1><Link className="btn-secondary mt-5" to="/account">Return to account</Link></section></div>;
 if(role==='reseller'&&!['reseller','admin'].includes(user.role))return <div className="max-w-2xl mx-auto py-16 px-5"><h1 className="page-title">Reseller access required</h1><p className="text-muted my-5">Your access is missing, expired or suspended. Ask an administrator for a new grant, or redeem an access key.</p><ResellerRedeemForm/><Link className="btn-secondary mt-5" to="/contact">Request access</Link></div>;
 return <>{children}</>;
}
