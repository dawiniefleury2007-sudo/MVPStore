import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { StoreProvider } from '@/stores/StoreProvider';
import { LanguageProvider } from '@/hooks/useLanguage';
import GlobalBackground from '@/components/layout/GlobalBackground';
import ErrorBoundary from '@/components/features/ErrorBoundary';
import NotFound from '@/pages/NotFound';
const Home=lazy(()=>import('@/pages/Home'));
const Products=lazy(()=>import('@/pages/Products'));
const ProductDetail=lazy(()=>import('@/pages/ProductDetail'));
const Login=lazy(()=>import('@/pages/Login'));
const Account=lazy(()=>import('@/pages/Account'));
const Admin=lazy(()=>import('@/pages/Admin'));
const Checkout=lazy(()=>import('@/pages/Checkout'));
const Legal=lazy(()=>import('@/pages/Legal'));
export default function App(){return <ErrorBoundary><LanguageProvider><StoreProvider><BrowserRouter><GlobalBackground/><Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="glass px-10 py-8 text-center"><p className="font-display text-2xl font-bold text-accent">MVP</p><p className="text-muted text-sm mt-2">Preparing your experience…</p></div></div>}><Routes><Route path="/" element={<Home/>}/><Route path="/products" element={<Products/>}/><Route path="/products/:id" element={<ProductDetail/>}/><Route path="/login" element={<Login/>}/><Route path="/account" element={<Account/>}/><Route path="/mvp-cheats/server/en" element={<Admin/>}/><Route path="/checkout/:id" element={<Checkout/>}/><Route path="/legal" element={<Legal/>}/><Route path="*" element={<NotFound/>}/></Routes></Suspense><Toaster theme="dark" position="bottom-right" toastOptions={{style:{background:'hsl(var(--surface))',color:'hsl(var(--foreground))',border:'1px solid hsl(var(--border))'}}}/></BrowserRouter></StoreProvider></LanguageProvider></ErrorBoundary>;}
