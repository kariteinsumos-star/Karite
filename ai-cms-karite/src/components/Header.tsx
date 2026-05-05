import { useAuth } from '../context/AuthContext';

export function Header() {
  const { profile, signOut } = useAuth();

  return (
    <header className="header">
      <div>
        <h1>AI-CMS Karité</h1>
        <p>Costos, recetas, inventario, producción y Kardex</p>
      </div>
      <div className="header-user">
        <span>{profile?.email}</span>
        <span className="badge">{profile?.rol ?? 'sin rol'}</span>
        <button className="btn secondary" onClick={() => void signOut()}>Salir</button>
      </div>
    </header>
  );
}
