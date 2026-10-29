import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
export default function NotFound(){return <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center"><p className="eyebrow">Off the map</p><h1 className="font-display text-8xl text-accent font-bold mt-4">404</h1><h2 className="text-2xl font-bold mt-5">This page hasn't spawned yet.</h2><p className="text-muted mt-3">Let's get you back to your next level.</p><Link className="btn mt-7" to="/"><ArrowLeft size={17}/>Back to store</Link></main>;}
