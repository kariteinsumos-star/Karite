import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertBox } from '../components/AlertBox';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/formatters';

export function Login() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand-logo large">K</div>
        <h1>AI-CMS Karité</h1>
        <p>Acceso al sistema de costos, inventario y producción.</p>
        {error && <AlertBox type="error">{error}</AlertBox>}
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="karite.proyecto@gmail.com" />
        <label>Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn primary full" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
      </form>
    </div>
  );
}
