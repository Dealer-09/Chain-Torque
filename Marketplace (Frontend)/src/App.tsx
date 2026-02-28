import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import {
  StatusPanelProvider,
  useStatusPanel,
} from '@/contexts/StatusPanelContext';
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
} from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import ProductDetail from './pages/ProductDetail';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Edit from './pages/Edit';
import NotFound from './pages/NotFound';
import BackendStatus from './components/BackendStatus';
import SignUp from './pages/SignUp';
import ChatPage from './pages/ChatPage';
import { getLandingUrl } from '@/lib/urls';

const queryClient = new QueryClient();
const LANDING_URL = getLandingUrl();

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key');
}



const AppContent = () => {
  const { showStatusPanel, closeStatusPanel } = useStatusPanel();

  return (
    <>
      <BackendStatus isVisible={showStatusPanel} onClose={closeStatusPanel} />
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path='/signup' element={<SignUp />} />
          <Route
            path='/'
            element={
              <SignedIn>
                <Index />
              </SignedIn>
            }
          />
          <Route
            path='/product/:id'
            element={
              <SignedIn>
                <ProductDetail />
              </SignedIn>
            }
          />
          <Route
            path='/dashboard'
            element={
              <SignedIn>
                <Dashboard />
              </SignedIn>
            }
          />
          <Route
            path='/edit'
            element={
              <SignedIn>
                <Edit />
              </SignedIn>
            }
          />
          <Route
            path='/upload'
            element={
              <SignedIn>
                <Upload />
              </SignedIn>
            }
          />
          <Route
            path='/chat'
            element={
              <SignedIn>
                <ChatPage />
              </SignedIn>
            }
          />
          <Route path='*' element={<NotFound />} />
        </Routes>
        <SignedOut>
          <div className='min-h-screen flex items-center justify-center bg-gray-50'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold mb-4'>Access Required</h2>
              <p className='text-gray-600 mb-4'>
                Please sign in to access the marketplace
              </p>
              <a
                href={`${LANDING_URL}/sign-in`}
                className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700'
              >
                Sign In
              </a>
            </div>
          </div>
        </SignedOut>
      </BrowserRouter>
    </>
  );
};

// Check if we're in production (satellite mode)
const isProduction = typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

const App = () => (
  // @ts-expect-error - Clerk types are complex but isSatellite/domain props work at runtime
  <ClerkProvider
    publishableKey={clerkPubKey}
    afterSignOutUrl={LANDING_URL}
    signInUrl={`${LANDING_URL}/sign-in`}
    signUpUrl={`${LANDING_URL}/sign-up`}
    signInFallbackRedirectUrl="/"
    signUpFallbackRedirectUrl="/"
    isSatellite={isProduction}
    domain={isProduction ? 'chaintorque-landing.onrender.com' : undefined}
  >
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <StatusPanelProvider>
            <TooltipProvider>
              <AppContent />
            </TooltipProvider>
          </StatusPanelProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ClerkProvider>
);

export default App;
