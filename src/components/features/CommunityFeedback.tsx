import { Link } from 'react-router-dom';
import { useFeedback } from '@/hooks/useFeedback';
import { ArrowUpRight, CircleAlert } from 'lucide-react';
import FeedbackCard from '@/components/features/FeedbackCard';
import EmptyState from '@/components/features/EmptyState';

interface CommunityFeedbackProps { productId?: string; }

export default function CommunityFeedback({ productId }: CommunityFeedbackProps) {
  const query = useFeedback(0, productId);

  return (
    <section className="py-12" aria-label="Community feedback">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-3">ANTHONY Community</p>
          <h2 className="text-3xl font-bold tracking-tight">Shared experiences<span className="text-accent">.</span></h2>
          <p className="text-muted mt-3 leading-relaxed">{productId ? 'Recent feedback from members using this product.' : 'Recent feedback shared by ANTHONY ALONE members.'}</p>
        </div>
        <Link to="/feedback" className="btn-secondary min-h-11 gap-2 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">View all feedback<ArrowUpRight size={18} aria-hidden="true" /></Link>
      </div>
      {query.isPending && <p role="status" className="glass p-6 text-muted">Loading community feedback…</p>}
      {query.error && <div role="alert" className="glass p-6">
        <p className="text-danger flex items-start gap-2"><CircleAlert size={20} className="shrink-0" aria-hidden="true" />{query.error.message}</p>
        <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()} className="btn-secondary mt-4 min-h-11 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{query.isFetching ? 'Retrying…' : 'Retry feedback'}</button>
      </div>}
      {query.data && query.data.length > 0 && <div className="grid items-start gap-6 lg:grid-cols-2">{query.data.slice(0, 2).map(post => <FeedbackCard key={post.id} post={post} likesReady={query.dataUpdatedAt > 0} />)}</div>}
      {!query.error && query.data?.length === 0 && <div className="glass"><EmptyState title="No feedback published yet" description={productId ? 'Be the first to share your experience with this product.' : 'Share your experience with the ANTHONY ALONE community.'}><Link to="/feedback/new" className="btn-secondary min-h-11">Share feedback</Link></EmptyState></div>}
    </section>
  );
}
