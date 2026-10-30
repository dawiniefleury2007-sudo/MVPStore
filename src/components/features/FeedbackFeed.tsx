import { useSearchParams } from 'react-router-dom';
import { useFeedback } from '@/hooks/useFeedback';
import { CircleAlert } from 'lucide-react';
import FeedbackCard from '@/components/features/FeedbackCard';
import EmptyState from '@/components/features/EmptyState';

export default function FeedbackFeed() {
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get('page') || 0);
  const page = Number.isInteger(requestedPage) ? Math.max(0, Math.min(requestedPage, 10000)) : 0;
  const query = useFeedback(page);
  const goToPage = (next: number) => {
    const updated = new URLSearchParams(params);
    if (next === 0) updated.delete('page'); else updated.set('page', String(next));
    setParams(updated);
  };

  return <section aria-label="Community feedback feed" className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="section-title">Latest community posts</h2><span className="text-muted">Page {page + 1}</span></div>
    {query.isPending && <div className="glass p-8 text-muted" role="status">Loading community feedback…</div>}
    {query.error && <div className="glass p-6" role="alert"><p className="text-danger flex items-start gap-2"><CircleAlert size={20} className="shrink-0" aria-hidden="true" />{query.error.message}</p><button type="button" className="btn-secondary mt-4" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Retrying…' : 'Retry feedback'}</button></div>}
    {!query.error && query.data?.length === 0 && <div className="glass"><EmptyState title={page ? 'No more feedback' : 'No feedback published yet'} description={page ? 'Return to an earlier page to read community posts.' : 'Community screenshots and experiences will appear here once members publish them.'} /></div>}
    {query.data && query.data.length > 0 && <div className="grid items-start gap-6 lg:grid-cols-2">{query.data.map(post => <FeedbackCard key={post.id} post={post} likesReady={query.dataUpdatedAt > 0} />)}</div>}
    <nav aria-label="Feedback pagination" className="flex justify-between gap-4"><button type="button" className="btn-secondary" disabled={page === 0 || query.isFetching} onClick={() => goToPage(page - 1)}>Previous page</button><button type="button" className="btn-secondary" disabled={query.isFetching || Boolean(query.error) || query.data?.length !== 20 || page >= 10000} onClick={() => goToPage(page + 1)}>Next page</button></nav>
  </section>;
}
