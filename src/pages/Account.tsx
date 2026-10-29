import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AccountOverview from '@/pages/AccountOverview';
import MvpPanel from '@/pages/MvpPanel';
import Rewards from '@/pages/Rewards';
import Orders from '@/pages/Orders';
import Settings from '@/pages/Settings';
import Support from '@/pages/Support';
export default function Account(){const [params]=useSearchParams();const nav=params.get('nav')||'overview';return <DashboardLayout>{nav==='mvp'?<MvpPanel/>:nav==='rewards'?<Rewards/>:nav==='orders'?<Orders/>:nav==='settings'?<Settings/>:nav==='support'?<Support/>:<AccountOverview/>}</DashboardLayout>;}
