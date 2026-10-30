import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FeedbackFeed from '@/components/features/FeedbackFeed';
import { useAuth } from '@/hooks/useAuth';

export default function Feedback() {
  const { user, loading } = useAuth();
  return <><Header /><main className="max-w-[1260px] mx-auto px-6 py-12 space-y-10">
    <section className="glass p-6 sm:p-8 flex flex-wrap items-end justify-between gap-6" aria-labelledby="feedback-heading">
      <div className="max-w-2xl"><p className="eyebrow mb-4">ANTHONY ALONE Community</p><h1 id="feedback-heading" className="page-title">Community feedback<span className="text-accent">.</span></h1><p className="text-muted mt-4 leading-relaxed">Explore screenshots, product feedback and store experiences shared by ANTHONY ALONE members. Open a post’s replies to join the conversation.</p></div>
      {!loading && <Link to={user ? '/feedback/new' : '/login'} className="btn hover:-translate-y-0.5"><Plus size={18} aria-hidden="true" />{user ? 'Share feedback' : 'Sign in to share'}</Link>}
    </section>
    <FeedbackFeed />
  </main><Footer /></>;
}
