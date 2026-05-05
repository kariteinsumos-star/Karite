import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { formatCLP, formatNumber, getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { Insumo, ProductoBase, RecetaDetalle } from '../lib/types';

export function Recetas() {
  const { isAdmin } = useAuth();

  const [productos, setProductos] = useState<ProductoBase[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetas, setRecetas] = useState<RecetaDetalle[]>([]);

  const [productoId, setProductoId] = useState('');
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [merma, setMerma] = useState('0');

  const [editing, setEditing] = useState<RecetaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const insumoSeleccionado = insumos.find((i) => i.id_insumo === insumoId);

  const unidadSeleccionada =
    insumoSeleccionado?.unidad_medida_label ??
    insumoSeleccionado?.unidad_medida ??
    'unidad';

  const load = async () => {
    setLoading(true);
    setError(null);

    const [p, i, r] = await Promise.all([
      supabase
        .from('productos_finales')
        .select('id_producto,nombre,tipo_producto,activo')
        .eq('tipo_producto', 'simple')
        .order('nombre'),

      supabase
        .from('v_insumos')
        .select('*')
        .order('nombre'),

      supabase
        .from('v_recetas_detalle')
        .select('*')
        .order('producto')
    ]);

    if (p.error || i.error || r.error) {
      setError(
        [
          p.error?.message,
          i.error?.message,
          r.error?.message
        ]
          .filter(Boolean)
          .join(' | ')
      );
    }

    setProductos((p.data ?? []) as ProductoBase[]);
    setInsumos((i.data ?? []) as Insumo[]);
    setRecetas((r.data ?? []) as RecetaDetalle[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return productoId
      ? recetas.filter((r) => r.id_producto === productoId)
      : recetas;
  }, [productoId, recetas]);

  const total = filtered.reduce(
    (sum, r) => sum + Number(r.costo_linea ?? 0),
    0
  );

  const resetForm = () => {
    setInsumoId('');
    setCantidad('');
    setMerma('0');
    setEditing(null);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();

    if (!isAdmin) return;

    setError(null);
    setSuccess(null);

    try {
      if (!productoId) {
        throw new Error('Debes seleccionar un producto.');
      }

      if (!insumoId) {
        throw new Error('Debes seleccionar un insumo.');
      }

      if (!cantidad || Number(cantidad) <= 0) {
        throw new Error('La cantidad necesaria debe ser mayor a cero.');
      }

      const payload = {
        id_producto: productoId,
        id_insumo: insumoId,
        cantidad_necesaria: Number(cantidad),
        merma_porcentaje: Number(merma || 0)
      };

      const res = editing
        ? await supabase
            .from('recetas')
            .update(payload)
            .eq('id_receta', editing.id_receta)
        : await supabase
            .from('recetas')
            .insert(payload);

      if (res.error) throw res.error;

      setSuccess('Receta actualizada correctamente.');
      resetForm();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const edit = (row: RecetaDetalle) => {
    setProductoId(row.id_producto);
    setInsumoId(row.id_insumo);
    setCantidad(String(row.cantidad_necesaria));
    setMerma(String(row.merma_porcentaje));
    setEditing(row);
  };

  const remove = async (row: RecetaDetalle) => {
    if (!window.confirm(`¿Eliminar ${row.insumo} de ${row.producto}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const { error: deleteError } = await supabase
        .from('recetas')
        .delete()
        .eq('id_receta', row.id_receta);

      if (deleteError) throw deleteError;

      setSuccess('Línea de receta eliminada correctamente.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title">
        <h2>Recetas / BOM</h2>
        <p>Configura los insumos consumidos por cada producto simple.</p>
      </div>

      {error && <AlertBox type="error">{error}</AlertBox>}
      {success && <AlertBox type="success">{success}</AlertBox>}

      <div className="panel">
        <form className="form-grid" onSubmit={save}>
          <label>
            Producto
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              required
            >
              <option value="">Seleccionar producto</option>
              {productos.map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>

          <label>
            Insumo
            <select
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
              required
              disabled={!isAdmin}
            >
              <option value="">Seleccionar insumo</option>
              {insumos.map((i) => (
                <option key={i.id_insumo} value={i.id_insumo}>
                  {i.nombre} ({i.unidad_medida_label ?? i.unidad_medida})
                </option>
              ))}
            </select>
          </label>

          <label>
            Cantidad necesaria
            <div className="input-with-unit">
              <input
                type="number"
                step="0.001"
                min="0"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
                disabled={!isAdmin}
              />

              <span className="unit-badge">
                {unidadSeleccionada}
              </span>
            </div>
          </label>

          <label>
            Merma %
            <input
              type="number"
              step="0.001"
              min="0"
              value={merma}
              onChange={(e) => setMerma(e.target.value)}
              disabled={!isAdmin}
            />
          </label>

          {isAdmin && (
            <div className="modal-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={resetForm}
              >
                Limpiar
              </button>

              <button className="btn primary">
                {editing ? 'Actualizar línea' : 'Agregar línea'}
              </button>
            </div>
          )}
        </form>
      </div>

      <h3>
  Costo total receta filtrada: {formatCLP(total)} CLP
</h3>

      <DataTable
        rows={filtered}
        columns={[
          {
            key: 'producto',
            header: 'Producto',
            render: (r) => r.producto,
            searchableValue: (r) => `${r.producto} ${r.insumo}`
          },
          {
            key: 'insumo',
            header: 'Insumo',
            render: (r) => r.insumo
          },
          {
            key: 'cantidad',
            header: 'Cantidad necesaria',
            render: (r) =>
              r.cantidad_con_unidad ??
              `${formatNumber(r.cantidad_necesaria)} ${r.unidad_medida_label ?? r.unidad_medida ?? ''}`
          },
          {
            key: 'merma',
            header: 'Merma %',
            render: (r) => formatNumber(r.merma_porcentaje)
          },
          {
            key: 'costo_unit',
            header: 'Costo unit.',
            render: (r) => formatCLP(r.costo_unitario)
          },
          {
            key: 'costo_linea',
            header: 'Costo línea (CLP)',
            render: (r) => `${formatCLP(r.costo_linea)} CLP`
     },
          {
            key: 'acciones',
            header: 'Acciones',
            render: (r) =>
              isAdmin ? (
                <div className="actions">
                  <button className="btn small" onClick={() => edit(r)}>
                    Editar
                  </button>

                  <button
                    className="btn small danger"
                    onClick={() => void remove(r)}
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                '-'
              )
          }
        ]}
      />
    </div>
  );
}