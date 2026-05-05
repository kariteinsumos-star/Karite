import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { formatNumber, getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { ProductoBase, ValidacionStock } from '../lib/types';

export function Produccion() {
  const { canOperate } = useAuth();
  const [productos, setProductos] = useState<ProductoBase[]>([]);
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [validacion, setValidacion] = useState<ValidacionStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error: e } = await supabase.from('productos_finales').select('id_producto,nombre,tipo_producto,activo').eq('tipo_producto', 'simple').eq('activo', true).order('nombre');
      if (e) setError(e.message);
      setProductos((data ?? []) as ProductoBase[]);
      setLoading(false);
    };
    void load();
  }, []);

  const allOk = useMemo(() => validacion.length > 0 && validacion.every((v) => v.suficiente), [validacion]);

  const validar = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null); setSuccess(null); setValidacion([]);
    try {
      if (!productoId) throw new Error('Selecciona un producto.');
      const unidades = Number(cantidad);
      if (!Number.isFinite(unidades) || unidades <= 0) throw new Error('La cantidad debe ser mayor a cero.');
      const { data, error: rpcError } = await supabase.rpc('validar_stock_produccion', {
        p_id_producto: productoId,
        p_unidades: unidades
      });
      if (rpcError) throw rpcError;
      setValidacion((data ?? []) as ValidacionStock[]);
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const producir = async () => {
    setSubmitting(true); setError(null); setSuccess(null);
    try {
      const { error: rpcError } = await supabase.rpc('registrar_produccion', {
        p_id_producto: productoId,
        p_unidades: Number(cantidad),
        p_observacion: `Producción registrada desde interfaz (${cantidad} unidad/es)`
      });
      if (rpcError) throw rpcError;
      setSuccess('Producción registrada correctamente.');
      await validar();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title"><h2>Producción</h2><p>Valida stock antes de fabricar y registra lotes de productos propios.</p></div>
      {!canOperate && <AlertBox type="warning">Tu rol no permite registrar producción. Puedes consultar información.</AlertBox>}
      {error && <AlertBox type="error">{error}</AlertBox>}
      {success && <AlertBox type="success">{success}</AlertBox>}
      <div className="panel">
        <form className="form-grid" onSubmit={validar}>
          <label>Producto<select value={productoId} onChange={(e) => { setProductoId(e.target.value); setValidacion([]); }} required><option value="">Seleccionar producto</option>{productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}</select></label>
          <label>Cantidad a producir<input type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required /></label>
          <button className="btn primary">Validar stock</button>
          <button type="button" className="btn success" disabled={!canOperate || !allOk || submitting} onClick={() => void producir()}>{submitting ? 'Registrando...' : 'Registrar producción'}</button>
        </form>
      </div>
      {validacion.length > 0 && (
        <>
          {!allOk && <AlertBox type="warning">Hay insumos faltantes. No se permite registrar producción hasta reponer stock.</AlertBox>}
          {allOk && <AlertBox type="success">Stock suficiente para producir.</AlertBox>}
          <DataTable
            rows={validacion}
            columns={[
              { key: 'nombre', header: 'Insumo', render: (r) => r.nombre },
              { key: 'req', header: 'Requerido', render: (r) => formatNumber(r.requerido) },
              { key: 'stock', header: 'Stock actual', render: (r) => formatNumber(r.stock_actual) },
              { key: 'faltante', header: 'Faltante', render: (r) => formatNumber(r.faltante) },
              { key: 'ok', header: 'Estado', render: (r) => r.suficiente ? <span className="badge ok">Suficiente</span> : <span className="badge danger">Faltante</span> }
            ]}
          />
        </>
      )}
    </div>
  );
}
