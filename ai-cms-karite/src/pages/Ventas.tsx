import { FormEvent, useEffect, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { Insumo, ProductoBase } from '../lib/types';

export function Ventas() {
  const { canSell } = useAuth();
  const [productos, setProductos] = useState<ProductoBase[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [productoId, setProductoId] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState('1');
  const [refProducto, setRefProducto] = useState('');
  const [insumoId, setInsumoId] = useState('');
  const [cantidadInsumo, setCantidadInsumo] = useState('1');
  const [refInsumo, setRefInsumo] = useState('');

  useEffect(() => {
    const load = async () => {
      const [p, i] = await Promise.all([
        supabase.from('productos_finales').select('id_producto,nombre,tipo_producto,activo').eq('activo', true).order('nombre'),
        supabase.from('v_productos_disponibilidad').select('*').eq('puede_vender', true).order('nombre')
      ]);
      if (p.error) setError(p.error.message);
      if (i.error) setError(i.error.message);
      setProductos((p.data ?? []) as ProductoBase[]);
      setInsumos((i.data ?? []) as Insumo[]);
      setLoading(false);
    };
    void load();
  }, []);

  const venderProducto = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      const { error: rpcError } = await supabase.rpc('registrar_venta_directa', {
        p_id_producto: productoId,
        p_unidades: Number(cantidadProducto),
        p_observacion: 'Venta directa registrada desde interfaz',
        p_referencia_fontana: refProducto || null
      });
      if (rpcError) throw rpcError;
      setSuccess('Venta directa registrada.');
      setCantidadProducto('1'); setRefProducto('');
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const venderInsumo = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      const { error: rpcError } = await supabase.rpc('registrar_venta_mayorista_insumo', {
        p_id_insumo: insumoId,
        p_cantidad: Number(cantidadInsumo),
        p_observacion: 'Venta mayorista de insumo desde interfaz',
        p_referencia_fontana: refInsumo || null
      });
      if (rpcError) throw rpcError;
      setSuccess('Venta mayorista de insumo registrada.');
      setCantidadInsumo('1'); setRefInsumo('');
    } catch (err) { setError(getErrorMessage(err)); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title"><h2>Ventas</h2><p>Registra venta de producto terminado o venta mayorista de insumos.</p></div>
      {!canSell && <AlertBox type="warning">Tu rol no permite registrar ventas.</AlertBox>}
      {error && <AlertBox type="error">{error}</AlertBox>}
      {success && <AlertBox type="success">{success}</AlertBox>}
      <div className="two-columns">
        <div className="panel">
          <h3>Venta directa de producto</h3>
          <form className="form-grid" onSubmit={venderProducto}>
            <label>Producto<select value={productoId} onChange={(e) => setProductoId(e.target.value)} required><option value="">Seleccionar producto</option>{productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}</select></label>
            <label>Cantidad<input type="number" min="1" step="1" value={cantidadProducto} onChange={(e) => setCantidadProducto(e.target.value)} required /></label>
            <label>Referencia Fontana<input value={refProducto} onChange={(e) => setRefProducto(e.target.value)} placeholder="Boleta/Factura opcional" /></label>
            <button className="btn primary" disabled={!canSell}>Registrar venta</button>
          </form>
        </div>
        <div className="panel">
          <h3>Venta mayorista de insumo</h3>
          <form className="form-grid" onSubmit={venderInsumo}>
            <label>Insumo<select value={insumoId} onChange={(e) => setInsumoId(e.target.value)} required><option value="">Seleccionar insumo</option>{insumos.map((i) => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</option>)}</select></label>
            <label>Cantidad<input type="number" min="0.001" step="0.001" value={cantidadInsumo} onChange={(e) => setCantidadInsumo(e.target.value)} required /></label>
            <label>Referencia Fontana<input value={refInsumo} onChange={(e) => setRefInsumo(e.target.value)} placeholder="Boleta/Factura opcional" /></label>
            <button className="btn primary" disabled={!canSell}>Registrar venta mayorista</button>
          </form>
        </div>
      </div>
    </div>
  );
}
