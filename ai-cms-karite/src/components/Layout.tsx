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
      <main>
        <Header />
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
