import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/insumos', label: 'Insumos' },
  { to: '/productos', label: 'Productos' },
  { to: '/recetas', label: 'Recetas' },
  { to: '/produccion', label: 'Producción' },
  { to: '/ventas', label: 'Ventas' },
  { to: '/fraccionamiento', label: 'Fraccionamiento' },
  { to: '/kits', label: 'Kits' },
  { to: '/kardex', label: 'Kardex' },
  { to: '/stock-critico', label: 'Stock crítico' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/usuarios', label: 'Usuarios' },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">K</div>

        <div>
          <strong>Karité</strong>
          <span>MVP Operacional</span>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? 'nav-link active' : 'nav-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}