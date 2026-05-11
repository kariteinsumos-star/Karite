import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedLayout } from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { Dashboard } from './pages/Dashboard';
import { Fraccionamiento } from './pages/Fraccionamiento';
import { Insumos } from './pages/Insumos';
import { Kardex } from './pages/Kardex';
import { Kits } from './pages/Kits';
import { Login } from './pages/Login';
import { Produccion } from './pages/Produccion';
import { Productos } from './pages/Productos';
import { Recetas } from './pages/Recetas';
import { StockCritico } from './pages/StockCritico';
import { Usuarios } from './pages/Usuarios';
import { Ventas } from './pages/Ventas';
import { Reportes } from './pages/Reportes';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/insumos" element={<Insumos />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/recetas" element={<Recetas />} />
            <Route path="/produccion" element={<Produccion />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/fraccionamiento" element={<Fraccionamiento />} />
            <Route path="/kits" element={<Kits />} />
            <Route path="/kardex" element={<Kardex />} />
            <Route path="/stock-critico" element={<StockCritico />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/reportes" element={<Reportes />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
