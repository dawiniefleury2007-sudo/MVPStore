import { Link } from 'react-router-dom';
import { BookOpen, LifeBuoy, MessageSquare, ShieldCheck } from 'lucide-react';

export default function Support() {
  return <div className="space-y-8 reveal">
    <section className="glass p-6 sm:p-8" aria-labelledby="support-heading">
      <div className="icon-box mb-4"><LifeBuoy size={22} aria-hidden="true" /></div>
      <p className="eyebrow mb-3">Account help center</p>
      <h1 id="support-heading" className="page-title">Support<span className="text-accent">.</span></h1>
      <p className="text-muted mt-4 max-w-2xl leading-relaxed">Get help with payment reviews, license activation and product downloads. Contact the store team for account-specific assistance.</p>
      <Link to="/contact" className="btn mt-6 hover:-translate-y-0.5"><MessageSquare size={18} aria-hidden="true" />Contact the store team</Link>
    </section>
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
      <section className="glass p-6 sm:p-8" aria-labelledby="support-topics">
        <h2 id="support-topics" className="section-title">Start with your account</h2>
        <div className="mt-6 space-y-6">
          <div><h3 className="font-semibold">Payment awaiting review?</h3><p className="text-muted mt-2 leading-relaxed">Payment screenshots are reviewed manually by an administrator. Check your order status before contacting support.</p><Link to="/account?nav=orders" className="btn-secondary mt-3 hover:-translate-y-0.5">View your orders</Link></div>
          <div className="border-t border-accent/15 pt-6"><h3 className="font-semibold">Need to activate a license or download files?</h3><p className="text-muted mt-2 leading-relaxed">Use MVP Panel to redeem a license and access downloads. Product downloads require active, eligible product access.</p><Link to="/account?nav=mvp" className="btn-secondary mt-3 hover:-translate-y-0.5">Open MVP Panel</Link></div>
          <div className="border-t border-accent/15 pt-6"><h3 className="font-semibold">Hardware reset requests</h3><p className="text-muted mt-2 leading-relaxed">Hardware resets are not currently available through the panel. Contact the store team to discuss your product's requirements.</p></div>
        </div>
      </section>
      <aside className="glass p-6 sm:p-8 space-y-6" aria-label="Support guidance">
        <div><h2 className="section-title flex items-center gap-2"><BookOpen size={20} className="text-accent shrink-0" aria-hidden="true" />Common questions</h2><p className="text-muted mt-3 leading-relaxed">Read about license expiry, XP claims, private downloads and reseller access.</p><Link to="/faq" className="btn-secondary mt-4 hover:-translate-y-0.5">Read the FAQ</Link></div>
        <div className="border-t border-accent/15 pt-6"><h2 className="section-title flex items-center gap-2"><ShieldCheck size={20} className="text-accent shrink-0" aria-hidden="true" />Keep your account safe</h2><p className="text-muted mt-3 leading-relaxed">Include your order reference and a clear description of the issue. Never share passwords, verification codes or full license keys.</p></div>
        <p className="text-muted border-t border-accent/15 pt-6 leading-relaxed">For OnSpace platform or billing questions, email <a href="mailto:contact@onspace.ai" className="text-accent underline inline-flex items-center min-h-11">contact@onspace.ai</a>.</p>
      </aside>
    </div>
  </div>;
}
