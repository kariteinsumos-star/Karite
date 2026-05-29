import { useAuth } from "../context/AuthContext";

export function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="app-header">
      <div>
        <h1>AI-CMS Karité</h1>
        <p>Costos, recetas, inventario, producción y Kardex</p>
      </div>

      <div className="header-user">
        <span>{user?.email ?? "karite.insumos@gmail.com"}</span>
        <span className="role-badge">admin</span>
        <button onClick={signOut}>Salir</button>
      </div>
    </header>
  );
}

export default Header;