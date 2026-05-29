import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/insumos", label: "Insumos" },
  { to: "/bodega-insumos", label: "Bodega de Insumos" },
  { to: "/historial-compras-insumo", label: "Historial de Compras" },
  { to: "/productos", label: "Productos" },
  { to: "/recetas", label: "Recetas" },
  { to: "/produccion", label: "Producción" },
  { to: "/ventas", label: "Ventas" },
  { to: "/fraccionamiento", label: "Fraccionamiento" },
  { to: "/lotes-fraccionamiento", label: "Lotes y Fraccionamiento" },
  { to: "/kits", label: "Kits" },
  { to: "/kardex", label: "Kardex" },
  { to: "/stock-critico", label: "Stock crítico" },
  { to: "/reportes", label: "Reportes" },
  { to: "/usuarios", label: "Usuarios" },
  { to: "/auditoria", label: "Auditoría" },
  { to: "/componentes-costo", label: "Componentes de Costo" },
  { to: "/alertas-costos", label: "Alertas de Costos" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">K</div>
        <div>
          <h2>AI-CMS Karité</h2>
          <p>Gestión operacional</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "nav-link nav-link-active" : "nav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;