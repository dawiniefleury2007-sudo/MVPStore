import { Link } from 'react-router-dom';
import { ArrowUpRight, Crosshair, Shield, Cpu } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HomeHero from '@/components/features/HomeHero';
import ProductCard from '@/components/features/ProductCard';
import Reviews from '@/components/features/Reviews';
import { useStore } from '@/stores/StoreProvider';
import { useLanguage } from '@/hooks/useLanguage';
import { useReveal } from '@/hooks/useReveal';
export default function Home(){const {data}=useStore();const {t}=useLanguage();useReveal();return <><Header/><main><HomeHero/><div className="max-w-[1320px] mx-auto px-6 md:px-10"><section className="py-16 scroll-reveal"><div className="flex justify-between items-end mb-8 gap-4"><div><p className="eyebrow mb-3">The MVP collection</p><h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('featured')}<span className="text-accent">.</span></h2><p className="text-muted text-sm mt-3">Purpose-built panels. Pick your next advantage.</p></div><Link to="/products" className="text-accent text-sm hidden sm:flex items-center gap-2">{t('all')}<ArrowUpRight size={18}/></Link></div><div className="grid md:grid-cols-3 gap-6">{data.products.slice(0,3).map((product,i)=><ProductCard key={product.id} product={product} index={i}/>)}</div><div className="grid grid-cols-3 gap-3 mt-8 text-center text-xs text-muted">{[{Icon:Crosshair,label:'Precision by design'},{Icon:Shield,label:'Personal license access'},{Icon:Cpu,label:'Built for your setup'}].map(({Icon,label})=><span key={label} className="flex flex-col sm:flex-row items-center justify-center gap-2"><Icon size={16} className="text-accent"/>{label}</span>)}</div></section><div className="scroll-reveal"><Reviews/></div></div></main><Footer/></>;}
