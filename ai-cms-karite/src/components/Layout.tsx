import OnboardingKarite from "./OnboardingKarite";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from './Header';
import { Loading } from './Loading';
import { Sidebar } from './Sidebar';

export function ProtectedLayout() {
  const { session, loading } = useAuth();

  if (loading) return <Loading text="Validando sesión..." />;
  if (!session) return <Navigate to="/login" replace />;

  return (
  <div className="app-shell">
    <Sidebar />
    <main className="content">
      <Header />
      <Outlet />
    </main>

    <OnboardingKarite />
  </div>
);
}
