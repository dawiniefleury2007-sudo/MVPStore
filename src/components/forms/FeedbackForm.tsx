import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/stores/StoreProvider';
import { useUpload } from '@/hooks/useUpload';
import { feedbackSchema } from '@/lib/validations';

export default function FeedbackForm() {
  const { data, action, busy } = useStore();
  const navigate = useNavigate();
  const [submissionError, setSubmissionError] = useState('');
  const upload = useUpload('mvp-feedback');
  const { register, watch, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema), defaultValues: { type: 'experience', title: '', productId: '' },
  });
  const productFeedback = watch('type') === 'product';
  const submitting = busy || isSubmitting;
  const submit = handleSubmit(async values => {
    setSubmissionError('');
    if (!upload.path || upload.uploading) { toast.error('Upload your feedback image before publishing.'); return; }
    const result = await action('feedback.publish', {
      type: values.type, title: values.title, imagePath: upload.path,
      ...(values.type === 'product' ? { productId: values.productId } : {}),
    });
    if (result) {
      toast.success('Your feedback has been published.');
      navigate('/feedback');
    } else {
      setSubmissionError('Feedback could not be published. Check your connection and retry.');
    }
  });

  return <form onSubmit={submit} className="glass p-6 sm:p-8 space-y-6">
    <div><h2 className="section-title">Your feedback</h2><p className="text-muted mt-2">Share a screenshot and an optional short title.</p></div>
    <label className="block"><span className="label">Feedback category</span>
      <select className="input" disabled={submitting} {...register('type')}><option value="experience">Store experience</option><option value="product">Product feedback</option><option value="support">Support experience</option></select>
    </label>
    {productFeedback && <label className="block"><span className="label">Product</span>
      <select className="input" disabled={submitting} aria-invalid={Boolean(errors.productId)} aria-describedby="feedback-product-help" {...register('productId')}><option value="">Choose a product</option>{data.products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
      <span id="feedback-product-help" className="block text-muted mt-2">Active access to the selected product is required and checked by the server.</span>
      {errors.productId && <span role="alert" className="text-danger flex items-center gap-2 mt-2"><CircleAlert size={18} aria-hidden="true" />{errors.productId.message}</span>}
    </label>}
    <label className="block"><span className="label">Title · optional, up to 25 characters</span>
      <input className="input" maxLength={25} disabled={submitting} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'feedback-title-error' : undefined} {...register('title')} />
      {errors.title && <span id="feedback-title-error" role="alert" className="text-danger flex items-center gap-2 mt-2"><CircleAlert size={18} aria-hidden="true" />{errors.title.message}</span>}
    </label>
    <label className="block"><span className="label">Feedback image · PNG, JPEG or WebP, up to 5 MB</span>
      <input className="input" type="file" accept="image/png,image/jpeg,image/webp" disabled={submitting || upload.uploading} onChange={event => void upload.upload(event.target.files?.[0])} />
    </label>
    {upload.uploading && <div><p role="status" className="text-muted">Uploading image… {upload.progress}%</p><progress className="w-full mt-2" aria-label="Feedback image upload progress" max={100} value={upload.progress} /></div>}
    {upload.preview && <img src={upload.preview} alt="Your feedback image preview" className="w-full max-h-80 object-contain rounded-xl bg-background/40" />}
    {upload.path && !upload.uploading && <p role="status" className="text-success">Image uploaded and ready to publish.</p>}
    <p className="text-muted">This image will be visible to the community. Remove account details, payment information and license keys before uploading.</p>
    {submissionError && <p role="alert" className="text-danger">{submissionError}</p>}
    <button type="submit" aria-busy={submitting} className="btn w-full hover:-translate-y-0.5 disabled:transform-none" disabled={submitting || upload.uploading || !upload.path}><Send size={18} aria-hidden="true" />{submitting ? 'Publishing…' : 'Publish feedback'}</button>
  </form>;
}
