import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppLayout } from './components/AppLayout';
import { SplashScreen } from './components/Logo';
import { PageLoader } from './components/ui/Spinner';
import { isFirebaseConfigured } from './lib/firebase';
import { ONBOARDING_KEY } from './pages/OnboardingPage';
import TodayPage from './pages/TodayPage';
import SetupRequiredPage from './pages/SetupRequiredPage';

const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AgendaPage = lazy(() => import('./pages/AgendaPage'));
const ItemDetailPage = lazy(() => import('./pages/ItemDetailPage'));
const ItemFormPage = lazy(() => import('./pages/ItemFormPage'));
const RemindersPage = lazy(() => import('./pages/RemindersPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AgendasPage = lazy(() => import('./pages/AgendasPage'));
const JoinAgendaPage = lazy(() => import('./pages/JoinAgendaPage'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SplashScreen />;
  if (!user) {
    const onboarded = localStorage.getItem(ONBOARDING_KEY) === '1';
    return <Navigate to={onboarded ? '/accedi' : '/benvenuto'} replace state={{ from: location.pathname + location.search }} />;
  }
  return <DataProvider>{children}</DataProvider>;
}

/**
 * iOS apre la web app dall'URL in cui è stata aggiunta alla Home: se era /benvenuto,
 * chi è già connesso (o ha già visto la presentazione) non deve rivederla a ogni avvio.
 */
function OnboardingGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SplashScreen />;
  if (user) return <Navigate to="/" replace />;
  const replay = (location.state as { replay?: boolean } | null)?.replay;
  if (!replay && localStorage.getItem(ONBOARDING_KEY) === '1') return <Navigate to="/accedi" replace />;
  return <OnboardingPage />;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  return loading ? <SplashScreen /> : <>{children}</>;
}

export default function App() {
  if (!isFirebaseConfigured) return <SetupRequiredPage />;
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/benvenuto" element={<OnboardingGate />} />
                <Route path="/accedi" element={<PublicOnly><AuthPage /></PublicOnly>} />
                <Route path="/registrati" element={<PublicOnly><AuthPage /></PublicOnly>} />
                <Route
                  element={
                    <RequireAuth>
                      <AppLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<TodayPage />} />
                  <Route path="agenda" element={<AgendaPage />} />
                  <Route path="nuovo" element={<ItemFormPage />} />
                  <Route path="voce/:id" element={<ItemDetailPage />} />
                  <Route path="voce/:id/modifica" element={<ItemFormPage />} />
                  <Route path="promemoria" element={<RemindersPage />} />
                  <Route path="notifiche" element={<NotificationsPage />} />
                  <Route path="impostazioni" element={<SettingsPage />} />
                  <Route path="agende" element={<AgendasPage />} />
                  <Route path="unisciti/:code" element={<JoinAgendaPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
