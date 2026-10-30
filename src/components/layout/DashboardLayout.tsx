import { useState,type ReactNode } from 'react';
import { Menu,ShieldCheck } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import LanguageSelect from '@/components/features/LanguageSelect';
import UserMenu from '@/components/features/UserMenu';
import NotificationBell from '@/components/features/NotificationBell';
import RouteGuard from '@/components/features/RouteGuard';
interface Props {children:ReactNode;admin?:boolean;reseller?:boolean;}
export default function DashboardLayout({children,admin=false,reseller=false}:Props){const [open,setOpen]=useState(false);return <RouteGuard role={admin?'admin':reseller?'reseller':undefined}><div className={`min-h-screen ${reseller?'terra-theme':''}`}><Sidebar admin={admin} reseller={reseller} open={open} onClose={()=>setOpen(false)}/><div className="lg:pl-[268px]"><header className="h-20 border-b border-accent/15 px-5 md:px-8 flex items-center justify-between bg-background/50"><div className="flex items-center gap-3"><button onClick={()=>setOpen(true)} className="lg:hidden w-11 h-11 flex items-center justify-center" aria-label="Open sidebar"><Menu size={23}/></button><span className="text-sm text-muted flex items-center gap-2"><ShieldCheck size={15} className="text-accent"/>ANTHONY ALONE / {admin?'Administration':reseller?'Reseller workspace':'Client hub'}</span></div><div className="flex items-center gap-3"><div className="hidden sm:block"><LanguageSelect/></div><NotificationBell/><UserMenu/></div></header><main className="p-5 md:p-8 lg:p-10 max-w-[1600px] mx-auto">{children}</main><footer className="text-sm text-muted px-8 py-6">© ANTHONY ALONE {new Date().getFullYear()} · Cloud data refreshed every 15 seconds</footer></div></div></RouteGuard>;}
