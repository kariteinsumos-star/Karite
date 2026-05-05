import { FormEvent, useEffect, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { formatCLP, getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { KitDetalle, ProductoBase } from '../lib/types';

export function Kits() {
  const { isAdmin, canOperate } = useAuth();
  const [productos, setProductos] = useState<ProductoBase[]>([]);
  const [kits, setKits] = useState<ProductoBase[]>([]);
  const [detalles, setDetalles] = useState<KitDetalle[]>([]);
  const [kitId, setKitId] = useState('');
  const [componenteId, setComponenteId] = useState('');
  const [cantidadComp, setCantidadComp] = useState('1');
  const [kitArmadoId, setKitArmadoId] = useState('');
  const [cantidadArmado, setCantidadArmado] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [p, k, d] = await Promise.all([
      supabase.from('productos_finales').select('id_producto,nombre,tipo_producto,activo').eq('activo', true).order('nombre'),
      supabase.from('productos_finales').select('id_producto,nombre,tipo_producto,activo').eq('tipo_producto', 'kit').eq('activo', true).order('nombre'),
      supabase.from('v_kit_componentes_detalle').select('*').order('kit')
    ]);
    if (p.error) setError(p.error.message);
    if (k.error) setError(k.error.message);
    if (d.error) setError(d.error.message);
    setProductos((p.data ?? []) as ProductoBase[]);
    setKits((k.data ?? []) as ProductoBase[]);
    setDetalles((d.data ?? []) as KitDetalle[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const addComponent = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      const { error: e2 } = await supabase.from('kit_componentes').insert({ id_kit_producto: kitId, id_componente_producto: componenteId, cantidad_componente: Number(cantidadComp) });
      if (e2) throw e2;
      setSuccess('Componente agregado al kit.'); await load();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const armarKit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      const { error: rpcError } = await supabase.rpc('registrar_armado_kit', { p_id_kit_producto: kitArmadoId, p_unidades: Number(cantidadArmado), p_observacion: 'Armado de kit desde interfaz' });
      if (rpcError) throw rpcError;
      setSuccess('Kit armado correctamente.');
    } catch (err) { setError(getErrorMessage(err)); }
  };

  const remove = async (row: KitDetalle) => {
    if (!window.confirm(`Eliminar ${row.componente} del kit ${row.kit}?`)) return;
    const { error: e } = await supabase.from('kit_componentes').delete().eq('id_kit_componente', row.id_kit_componente);
    if (e) setError(e.message); else { setSuccess('Componente eliminado.'); await load(); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title"><h2>Kits</h2><p>Configura componentes y registra armado de kits.</p></div>
      {error && <AlertBox type="error">{error}</AlertBox>}
      {success && <AlertBox type="success">{success}</AlertBox>}
      <div className="two-columns">
        <div className="panel">
          <h3>Administrar componentes</h3>
          <form className="form-grid" onSubmit={addComponent}>
            <label>Kit<select value={kitId} onChange={(e) => setKitId(e.target.value)} required><option value="">Seleccionar kit</option>{kits.map((k) => <option key={k.id_producto} value={k.id_producto}>{k.nombre}</option>)}</select></label>
            <label>Componente<select value={componenteId} onChange={(e) => setComponenteId(e.target.value)} required><option value="">Seleccionar producto</option>{productos.filter((p) => p.id_producto !== kitId).map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}</select></label>
            <label>Cantidad<input type="number" min="1" step="1" value={cantidadComp} onChange={(e) => setCantidadComp(e.target.value)} required /></label>
            <button className="btn primary" disabled={!isAdmin}>Agregar componente</button>
          </form>
        </div>
        <div className="panel">
          <h3>Armar kit</h3>
          <form className="form-grid" onSubmit={armarKit}>
            <label>Kit<select value={kitArmadoId} onChange={(e) => setKitArmadoId(e.target.value)} required><option value="">Seleccionar kit</option>{kits.map((k) => <option key={k.id_producto} value={k.id_producto}>{k.nombre}</option>)}</select></label>
            <label>Cantidad a armar<input type="number" min="1" step="1" value={cantidadArmado} onChange={(e) => setCantidadArmado(e.target.value)} required /></label>
            <button className="btn success" disabled={!canOperate}>Registrar armado</button>
          </form>
        </div>
      </div>
      <DataTable
        rows={detalles}
        columns={[
          { key: 'kit', header: 'Kit', render: (r) => r.kit, searchableValue: (r) => `${r.kit} ${r.componente}` },
          { key: 'comp', header: 'Componente', render: (r) => r.componente },
          { key: 'cant', header: 'Cantidad', render: (r) => r.cantidad_componente },
          { key: 'unit', header: 'Costo unit.', render: (r) => formatCLP(r.costo_unitario_componente) },
          { key: 'total', header: 'Costo total', render: (r) => formatCLP(r.costo_total_componente) },
          { key: 'acciones', header: 'Acciones', render: (r) => isAdmin ? <button className="btn small danger" onClick={() => void remove(r)}>Eliminar</button> : '-' }
        ]}
      />
    </div>
  );
}
