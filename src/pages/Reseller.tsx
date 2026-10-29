import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AdminLicenses from '@/pages/AdminLicenses';
import ResellerOverview from '@/pages/ResellerOverview';
import ResellerAgreement from '@/pages/ResellerAgreement';
import ResellerChat from '@/pages/ResellerChat';
import ProfileForm from '@/components/forms/ProfileForm';
import ResellerAccessInfo from '@/components/features/ResellerAccessInfo';
export default function Reseller(){const [params]=useSearchParams();const nav=params.get('nav')||'overview';return <DashboardLayout reseller>{nav==='licenses'?<AdminLicenses reseller/>:nav==='settings'?<div className="space-y-6"><h1 className="page-title">Reseller settings</h1><ResellerAccessInfo/><ProfileForm/></div>:nav==='agreement'?<ResellerAgreement/>:nav==='chat'?<ResellerChat/>:<ResellerOverview/>}</DashboardLayout>;}
