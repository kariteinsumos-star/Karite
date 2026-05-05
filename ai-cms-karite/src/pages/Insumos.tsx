import { FormEvent, useEffect, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { ModalForm } from '../components/ModalForm';
import { useAuth } from '../context/AuthContext';
import { formatCLP, formatNumber, getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { Insumo, UnidadMedida } from '../lib/types';

const emptyForm = {
  nombre: '',
  categoria: '',
  unidad_medida: 'g' as UnidadMedida,
  costo_unitario: '0',
  stock_actual: '0',
  stock_minimo: '0',
  activo: true
};

export function Insumos() {
  const { isAdmin, canOperate } = useAuth();
  const [rows, setRows] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [adjustTarget, setAdjustTarget] = useState<Insumo | null>(null);
  const [delta, setDelta] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('v_insumos').select('*').order('nombre');
    if (e) setError(e.message);
    setRows((data ?? []) as Insumo[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: Insumo) => {
    setEditing(row);
    setForm({
      nombre: row.nombre,
      categoria: row.categoria,
      unidad_medida: row.unidad_medida,
      costo_unitario: String(row.costo_unitario),
      stock_actual: String(row.stock_actual),
      stock_minimo: String(row.stock_minimo),
      activo: row.activo
    });
    setOpen(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        nombre: form.nombre,
        categoria: form.categoria,
        unidad_medida: form.unidad_medida,
        costo_unitario: Number(form.costo_unitario),
        stock_actual: Number(form.stock_actual),
        stock_minimo: Number(form.stock_minimo),
        activo: form.activo
      };
      const res = editing
        ? await supabase.from('insumos').update(payload).eq('id_insumo', editing.id_insumo)
        : await supabase.from('insumos').insert(payload);
      if (res.error) throw res.error;
      setSuccess('Insumo guardado correctamente.');
      setOpen(false);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const saveAdjust = async (e: FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    setError(null);
    setSuccess(null);
    try {
      const { error: rpcError } = await supabase.rpc('registrar_ajuste', {
        p_item_tipo: 'insumo',
        p_id_item: adjustTarget.id_insumo,
        p_cantidad_delta: Number(delta),
        p_observacion: `Ajuste manual desde interfaz para ${adjustTarget.nombre}`
      });
      if (rpcError) throw rpcError;
      setSuccess('Ajuste de stock registrado.');
      setAdjustTarget(null);
      setDelta('');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) return <Loading />;
  const visible = onlyCritical ? rows.filter((r) => r.stock_critico) : rows;

  return (
    <div className="page">
      <div className="page-title row-between">
        <div><h2>Insumos</h2><p>Materias primas, envases y accesorios.</p></div>
        {isAdmin && <button className="btn primary" onClick={openCreate}>Nuevo insumo</button>}
      </div>
      {error && <AlertBox type="error">{error}</AlertBox>}
      {success && <AlertBox type="success">{success}</AlertBox>}
      <label className="checkbox-line"><input type="checkbox" checked={onlyCritical} onChange={(e) => setOnlyCritical(e.target.checked)} /> Mostrar solo críticos</label>
      <DataTable
        rows={visible}
        columns={[
          { key: 'nombre', header: 'Nombre', render: (r) => r.nombre, searchableValue: (r) => `${r.nombre} ${r.categoria}` },
          { key: 'categoria', header: 'Categoría', render: (r) => r.categoria },
          { key: 'unidad', header: 'Unidad', render: (r) => r.unidad_medida },
          { key: 'costo', header: 'Costo unit.', render: (r) => formatCLP(r.costo_unitario) },
          { key: 'stock', header: 'Stock', render: (r) => formatNumber(r.stock_actual) },
          { key: 'min', header: 'Mínimo', render: (r) => formatNumber(r.stock_minimo) },
          { key: 'critico', header: 'Estado', render: (r) => r.stock_critico ? <span className="badge danger">Crítico</span> : <span className="badge ok">OK</span> },
          { key: 'acciones', header: 'Acciones', render: (r) => <div className="actions">{isAdmin && <button className="btn small" onClick={() => openEdit(r)}>Editar</button>}{canOperate && <button className="btn small secondary" onClick={() => setAdjustTarget(r)}>Ajustar</button>}</div> }
        ]}
      />
      <ModalForm open={open} title={editing ? 'Editar insumo' : 'Nuevo insumo'} onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={save}>
          <label>Nombre<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></label>
          <label>Categoría<input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required /></label>
          <label>Unidad<select value={form.unidad_medida} onChange={(e) => setForm({ ...form, unidad_medida: e.target.value as UnidadMedida })}><option value="g">g</option><option value="ml">ml</option><option value="unidad">unidad</option></select></label>
          <label>Costo unitario<input type="number" step="0.0001" value={form.costo_unitario} disabled={!isAdmin} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} /></label>
          <label>Stock actual<input type="number" step="0.001" value={form.stock_actual} onChange={(e) => setForm({ ...form, stock_actual: e.target.value })} /></label>
          <label>Stock mínimo<input type="number" step="0.001" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} /></label>
          <label className="checkbox-line"><input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} /> Activo</label>
          <div className="modal-actions"><button className="btn secondary" type="button" onClick={() => setOpen(false)}>Cancelar</button><button className="btn primary">Guardar</button></div>
        </form>
      </ModalForm>
      <ModalForm open={!!adjustTarget} title={`Ajustar stock: ${adjustTarget?.nombre ?? ''}`} onClose={() => setAdjustTarget(null)}>
        <form className="form-grid" onSubmit={saveAdjust}>
          <p>Usa valor positivo para reponer y negativo para descontar.</p>
          <label>Cantidad delta<input type="number" step="0.001" value={delta} onChange={(e) => setDelta(e.target.value)} required /></label>
          <div className="modal-actions"><button className="btn secondary" type="button" onClick={() => setAdjustTarget(null)}>Cancelar</button><button className="btn primary">Registrar ajuste</button></div>
        </form>
      </ModalForm>
    </div>
  );
}
