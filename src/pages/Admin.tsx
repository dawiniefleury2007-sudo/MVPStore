import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AdminOverview from '@/pages/AdminOverview';
import AdminLicenses from '@/pages/AdminLicenses';
import AdminUsers from '@/pages/AdminUsers';
import AdminTokens from '@/pages/AdminTokens';
import AdminSubscriptions from '@/pages/AdminSubscriptions';
import AdminOrders from '@/pages/AdminOrders';
import AdminProducts from '@/pages/AdminProducts';
import AdminLogs from '@/pages/AdminLogs';
import AdminSettings from '@/pages/AdminSettings';
import AdminResellers from '@/pages/AdminResellers';
import AdminCommunity from '@/pages/AdminCommunity';
export default function Admin(){const [params]=useSearchParams();const nav=params.get('nav')||'overview';return <DashboardLayout admin>{nav==='resellers'?<AdminResellers/>:nav==='community'?<AdminCommunity/>:nav==='licenses'?<AdminLicenses/>:nav==='users'?<AdminUsers/>:nav==='tokens'?<AdminTokens/>:nav==='subscriptions'?<AdminSubscriptions/>:nav==='orders'?<AdminOrders/>:nav==='products'?<AdminProducts/>:nav==='logs'?<AdminLogs/>:nav==='settings'?<AdminSettings/>:<AdminOverview/>}</DashboardLayout>;}
