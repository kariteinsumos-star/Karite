import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/insumos', label: 'Insumos' },
  { to: '/productos', label: 'Productos' },
  { to: '/recetas', label: 'Recetas' },
  { to: '/produccion', label: 'Producción' },
  { to: '/ventas', label: 'Ventas' },
  { to: '/fraccionamiento', label: 'Fraccionamiento' },
  { to: '/kits', label: 'Kits' },
  { to: '/kardex', label: 'Kardex' },
  { to: '/stock-critico', label: 'Stock crítico' }
];

export function Sidebar() {
  const { isAdmin } = useAuth();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">K</div>
        <div>
          <strong>Karité</strong>
          <small>MVP Operacional</small>
        </div>
      </div>
      <nav>
        {links.map((link) => <NavLink key={link.to} to={link.to} end={link.to === '/'}>{link.label}</NavLink>)}
        {isAdmin && <NavLink to="/usuarios">Usuarios y roles</NavLink>}
      </nav>
    </aside>
  );
}
