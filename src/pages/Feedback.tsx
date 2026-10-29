import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FeedbackCard from '@/components/features/FeedbackCard';
import { api } from '@/lib/api';
import type { FeedbackPost } from '@/types/feedback';
export default function Feedback(){const [page,setPage]=useState(0);const query=useQuery<FeedbackPost[],Error>({queryKey:['feed',page],queryFn:()=>api('feed',{page}),refetchInterval:15000});return <><Header/><main className="max-w-6xl mx-auto px-5 py-12"><div className="flex justify-between flex-wrap gap-5 mb-8"><div><p className="eyebrow mb-3">MVP Community</p><h1 className="page-title">Shared experiences</h1><p className="text-muted mt-3">Real feedback from MVP members. Refreshed every 15 seconds.</p></div><Link to="/feedback/new" className="btn h-fit">Publish feedback</Link></div>{query.isPending&&<p role="status">Loading feedback…</p>}{query.error&&<p className="text-danger">! {query.error.message}</p>}<div className="grid lg:grid-cols-2 gap-6 items-start">{query.data?.map(post=><FeedbackCard key={post.id} post={post}/>)}</div>{query.data?.length===0&&<p className="glass p-8 text-muted">No feedback published yet. Share your experience with the community.</p>}<div className="flex gap-3 mt-8"><button disabled={!page} className="btn-secondary" onClick={()=>setPage(page-1)}>Previous</button><button disabled={query.data?.length!==20} className="btn-secondary" onClick={()=>setPage(page+1)}>Next page</button></div></main><Footer/></>;}

