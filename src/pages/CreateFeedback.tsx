import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FeedbackForm from '@/components/forms/FeedbackForm';

export default function CreateFeedback() {
  return <><Header /><main className="max-w-[1260px] mx-auto px-6 py-12">
    <Link to="/feedback" className="btn-secondary mb-8"><ArrowLeft size={18} aria-hidden="true" />Back to community</Link>
    <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-8 items-start">
      <section className="glass p-6 sm:p-8" aria-labelledby="create-feedback-heading"><p className="eyebrow mb-4">MVP Community</p><h1 id="create-feedback-heading" className="page-title">Share your experience<span className="text-accent">.</span></h1><p className="text-muted mt-5 leading-relaxed">Help other members with a screenshot of your product, store or support experience.</p><div className="border-t border-accent/15 mt-6 pt-6"><h2 className="section-title">Before you publish</h2><ul className="text-muted mt-4 space-y-3 list-disc pl-5"><li>Use an image you have permission to share.</li><li>Keep feedback relevant and respectful.</li><li>Never include private account details or license keys.</li></ul></div></section>
      <FeedbackForm />
    </div>
  </main><Footer /></>;
}
