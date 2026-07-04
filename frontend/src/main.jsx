import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './app/App';
import './styles/index.css';
import './lib/i18n';

function logError(message, stack, url, userAgent) {
  try {
    navigator.sendBeacon('/api/admin/log-error', JSON.stringify({ message, stack, url, userAgent }));
  } catch { /* best-effort */ }
}

window.onerror = (msg, source, line, col, error) => {
  logError(msg?.toString?.() || String(msg), error?.stack || `${source}:${line}:${col}`);
};

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || event.reason?.toString() || 'Unhandled Promise Rejection';
  logError(msg, event.reason?.stack);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  </React.StrictMode>,
);
