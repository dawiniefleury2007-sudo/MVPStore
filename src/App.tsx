
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useDevToolsProtection } from './hooks/useDevToolsProtection';
import { AuthProvider } from '@/hooks/useAuth';
import { StoreProvider } from '@/stores/StoreProvider';
import { LanguageProvider } from '@/hooks/useLanguage';
import GlobalBackground from '@/components/layout/GlobalBackground';
import ErrorBoundary from '@/components/features/ErrorBoundary';
import RouteGuard from '@/components/features/RouteGuard';
import CloudStatus from '@/components/features/CloudStatus';
import NotFound from '@/pages/NotFound';

const Home = lazy(() => import('@/pages/Home'));
const Products = lazy(() => import('@/pages/Products'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Login = lazy(() => import('@/pages/Login'));
const Account = lazy(() => import('@/pages/Account'));
const Admin = lazy(() => import('@/pages/Admin'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Legal = lazy(() => import('@/pages/Legal'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Feedback = lazy(() => import('@/pages/Feedback'));
const CreateFeedback = lazy(() => import('@/pages/CreateFeedback'));
const Reseller = lazy(() => import('@/pages/Reseller'));
const About = lazy(() => import('@/pages/About'));
const Faq = lazy(() => import('@/pages/Faq'));
const Contact = lazy(() => import('@/pages/Contact'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export default function App() {
  useDevToolsProtection();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <StoreProvider>
              <BrowserRouter>
                <GlobalBackground />

                <Suspense
                  fallback={
                    <main className="min-h-screen grid place-items-center">
                      <div className="glass px-10 py-8 text-center">
                        <p className="font-display text-2xl font-bold text-accent">
                          ANTHONY
                        </p>
                        <p className="text-muted mt-3" role="status">
                          Loading your experience…
                        </p>
                      </div>
                    </main>
                  }
                >
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:id" element={<ProductDetail />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/oauth/callback" element={<AuthCallback />} />

                    <Route
                      path="/reset-password"
                      element={
                        <RouteGuard>
                          <ResetPassword />
                        </RouteGuard>
                      }
                    />

                    <Route
                      path="/account"
                      element={
                        <RouteGuard>
                          <Account />
                        </RouteGuard>
                      }
                    />

                    <Route
                      path="/anthony-alone/server/en"
                      element={
                        <RouteGuard role="admin">
                          <Admin />
                        </RouteGuard>
                      }
                    />

                    <Route
                      path="/reseller"
                      element={
                        <RouteGuard role="reseller">
                          <Reseller />
                        </RouteGuard>
                      }
                    />

                    <Route
                      path="/checkout/:id"
                      element={
                        <RouteGuard>
                          <Checkout />
                        </RouteGuard>
                      }
                    />

                    <Route path="/feedback" element={<Feedback />} />

                    <Route
                      path="/feedback/new"
                      element={
                        <RouteGuard>
                          <CreateFeedback />
                        </RouteGuard>
                      }
                    />

                    <Route path="/about" element={<About />} />
                    <Route path="/faq" element={<Faq />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/legal" element={<Legal />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>

                <CloudStatus />

                <Toaster
                  theme="dark"
                  position="bottom-right"
                  toastOptions={{
                    style: {
                      background: 'hsl(var(--surface))',
                      color: 'hsl(var(--foreground))',
                      border: '1px solid hsl(var(--border))',
                    },
                  }}
                />
              </BrowserRouter>
            </StoreProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
