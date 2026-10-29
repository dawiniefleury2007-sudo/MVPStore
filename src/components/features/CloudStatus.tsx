import { useIsFetching } from '@tanstack/react-query';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useStore } from '@/stores/StoreProvider';

export default function CloudStatus() {
  const { error, refresh } = useStore();
  const retrying = useIsFetching({ queryKey: ['snapshot'] }) > 0;

  if (!error) return null;

  return (
    <aside
      role="alert"
      aria-label="Store connection status"
      className="glass fixed bottom-4 left-4 right-4 z-50 p-4 sm:right-auto sm:max-w-md"
    >
      <div className="flex items-start gap-3">
        <CloudOff size={20} className="text-danger mt-1 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="font-semibold">Store connection unavailable</h2>
          <p className="text-muted mt-2 break-words leading-relaxed">
            {error.message || 'Unable to load store data. Check your connection and retry.'}
          </p>
          <button
            type="button"
            className="btn-secondary mt-3 min-h-11 gap-2 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={retrying}
            onClick={refresh}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {retrying ? 'Retrying…' : 'Retry connection'}
          </button>
        </div>
      </div>
    </aside>
  );
}
