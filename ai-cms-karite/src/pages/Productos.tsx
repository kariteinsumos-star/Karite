import { FormEvent, useEffect, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { EditableCell } from '../components/EditableCell';
import { Loading } from '../components/Loading';
import { ModalForm } from '../components/ModalForm';
import { useAuth } from '../context/AuthContext';
import { formatCLP, formatNumber, formatPercent, getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { ProductoCosteo, TipoProducto } from '../lib/types';

const empty = {
  nombre: '',
  tipo_producto: 'simple' as TipoProducto,
  costo_operacional: '0',
  margen_deseado: '0.4',
  stock_producto_terminado: '0',
  stock_minimo: '0',
  activo: true
};

interface MargenResult {
  nombre: string;
  costo_total: number;
  precio_venta_manual: number;
  margen_resultante: number;
}

export function Productos() {
  const { isAdmin } = useAuth();

  const [rows, setRows] = useState<ProductoCosteo[]>([]);
  const [sinReceta, setSinReceta] = useState<ProductoCosteo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductoCosteo | null>(null);
  const [form, setForm] = useState(empty);

  const [calcProduct, setCalcProduct] = useState<ProductoCosteo | null>(null);
  const [manualPrice, setManualPrice] = useState('');
  const [calcResult, setCalcResult] = useState<MargenResult | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const [prod, missing] = await Promise.all([
      supabase.from('v_productos_costeo').select('*').order('nombre'),
      supabase.from('v_productos_sin_receta').select('*').order('nombre')
    ]);

    if (prod.error || missing.error) {
      setError(
        [
          prod.error?.message,
          missing.error?.message
        ]
          .filter(Boolean)
          .join(' | ')
      );
    }

    setRows((prod.data ?? []) as ProductoCosteo[]);
    setSinReceta((missing.data ?? []) as ProductoCosteo[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (row: ProductoCosteo) => {
    setEditing(row);
    setForm({
      nombre: row.nombre,
      tipo_producto: row.tipo_producto,
      costo_operacional: String(row.costo_operacional),
      margen_deseado: String(row.margen_deseado),
      stock_producto_terminado: String(row.stock_producto_terminado),
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
        tipo_producto: form.tipo_producto,
        costo_operacional: Number(form.costo_operacional),
        margen_deseado: Number(form.margen_deseado),
        stock_producto_terminado: Number(form.stock_producto_terminado),
        stock_minimo: Number(form.stock_minimo),
        activo: form.activo
      };

      const res = editing
        ? await supabase
            .from('productos_finales')
            .update(payload)
            .eq('id_producto', editing.id_producto)
        : await supabase
            .from('productos_finales')
            .insert(payload);

      if (res.error) throw res.error;

      setOpen(false);
      setSuccess('Producto guardado correctamente.');
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const calculate = async (e: FormEvent) => {
    e.preventDefault();

    if (!calcProduct) return;

    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('calcular_costo_producto', {
        p_id_producto: calcProduct.id_producto,
        p_precio_venta_manual: Number(manualPrice)
      });

      if (rpcError) throw rpcError;

      setCalcResult((data?.[0] ?? null) as MargenResult | null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const editarProductoRapido = async (
    idProducto: string,
    campo: 'operacional' | 'precio_sugerido' | 'stock',
    valor: string
  ) => {
    setError(null);
    setSuccess(null);

    try {
      const { error: rpcError } = await supabase.rpc('editar_producto_rapido_basico', {
        p_id_producto: idProducto,
        p_campo: campo,
        p_valor: valor
      });

      if (rpcError) throw rpcError;

      setSuccess('Cambio guardado correctamente.');
      await load();
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title row-between">
        <div>
          <h2>Productos</h2>
          <p>Costeo, márgenes, stock terminado y precios sugeridos.</p>
        </div>

        {isAdmin && (
          <button className="btn primary" onClick={openCreate}>
            Nuevo producto
          </button>
        )}
      </div>

      {error && <AlertBox type="error">{error}</AlertBox>}
      {success && <AlertBox type="success">{success}</AlertBox>}

      {sinReceta.length > 0 && (
        <AlertBox type="warning" title="Productos sin receta">
          Hay {sinReceta.length} productos simples sin BOM. Revisa el módulo de Recetas.
        </AlertBox>
      )}

      <DataTable
        rows={rows}
        columns={[
          {
            key: 'nombre',
            header: 'Nombre',
            render: (r) => r.nombre,
            searchableValue: (r) => `${r.nombre} ${r.tipo_producto}`
          },
          {
            key: 'tipo',
            header: 'Tipo',
            render: (r) => r.tipo_producto
          },
          {
            key: 'mat',
            header: 'Materiales',
            render: (r) => formatCLP(r.costo_materiales_total)
          },
          {
            key: 'op',
            header: 'Operacional',
            render: (r) => (
              <EditableCell
                value={r.costo_operacional}
                type="number"
                step="1"
                formatter={formatCLP}
                canEdit={isAdmin}
                onSave={(value) =>
                  editarProductoRapido(r.id_producto, 'operacional', value)
                }
              />
            )
          },
          {
            key: 'total',
            header: 'Costo total',
            render: (r) => formatCLP(r.costo_total)
          },
          {
            key: 'margen',
            header: 'Margen',
            render: (r) => formatPercent(r.margen_deseado)
          },
          {
            key: 'precio',
            header: 'Precio sugerido',
            render: (r) => (
              <EditableCell
                value={r.precio_venta_sugerido}
                type="number"
                step="1"
                formatter={formatCLP}
                canEdit={isAdmin}
                onSave={(value) =>
                  editarProductoRapido(r.id_producto, 'precio_sugerido', value)
                }
              />
            )
          },
          {
            key: 'stock',
            header: 'Stock',
            render: (r) => (
              <EditableCell
                value={r.stock_producto_terminado}
                type="number"
                step="1"
                formatter={formatNumber}
                canEdit={isAdmin}
                onSave={(value) =>
                  editarProductoRapido(r.id_producto, 'stock', value)
                }
              />
            )
          },
          {
            key: 'acciones',
            header: 'Acciones',
            render: (r) => (
              <div className="actions">
                <button
                  className="btn small secondary"
                  onClick={() => {
                    setCalcProduct(r);
                    setManualPrice('');
                    setCalcResult(null);
                  }}
                >
                  Margen
                </button>

                {isAdmin && (
                  <button className="btn small" onClick={() => openEdit(r)}>
                    Editar
                  </button>
                )}
              </div>
            )
          }
        ]}
      />

      <ModalForm
        open={open}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
        onClose={() => setOpen(false)}
      >
        <form className="form-grid" onSubmit={save}>
          <label>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </label>

          <label>
            Tipo
            <select
              value={form.tipo_producto}
              onChange={(e) =>
                setForm({ ...form, tipo_producto: e.target.value as TipoProducto })
              }
            >
              <option value="simple">simple</option>
              <option value="kit">kit</option>
            </select>
          </label>

          <label>
            Costo operacional
            <input
              type="number"
              step="0.0001"
              value={form.costo_operacional}
              onChange={(e) =>
                setForm({ ...form, costo_operacional: e.target.value })
              }
            />
          </label>

          <label>
            Margen deseado
            <input
              type="number"
              step="0.01"
              value={form.margen_deseado}
              onChange={(e) =>
                setForm({ ...form, margen_deseado: e.target.value })
              }
            />
          </label>

          <label>
            Stock terminado
            <input
              type="number"
              value={form.stock_producto_terminado}
              onChange={(e) =>
                setForm({ ...form, stock_producto_terminado: e.target.value })
              }
            />
          </label>

          <label>
            Stock mínimo
            <input
              type="number"
              value={form.stock_minimo}
              onChange={(e) =>
                setForm({ ...form, stock_minimo: e.target.value })
              }
            />
          </label>

          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) =>
                setForm({ ...form, activo: e.target.checked })
              }
            />
            Activo
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>

            <button className="btn primary">
              Guardar
            </button>
          </div>
        </form>
      </ModalForm>

      <ModalForm
        open={!!calcProduct}
        title={`Calculadora de margen: ${calcProduct?.nombre ?? ''}`}
        onClose={() => setCalcProduct(null)}
      >
        <form className="form-grid" onSubmit={calculate}>
          <label>
            Precio venta manual
            <input
              type="number"
              step="1"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              required
            />
          </label>

          <button className="btn primary">
            Calcular margen
          </button>

          {calcResult && (
            <AlertBox type="info">
              Costo total: {formatCLP(calcResult.costo_total)} · Precio:{' '}
              {formatCLP(calcResult.precio_venta_manual)} · Margen resultante:{' '}
              {formatPercent(calcResult.margen_resultante)}
            </AlertBox>
          )}
        </form>
      </ModalForm>
    </div>
  );
}