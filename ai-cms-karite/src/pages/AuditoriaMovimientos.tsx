import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatNumber, getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';

type ItemTipo = 'insumo' | 'producto';

interface AuditoriaStockRow {
  id_auditoria: string;
  id_movimiento: string | null;
  fecha: string;
  usuario_id: string | null;
  usuario_email: string | null;
  usuario_nombre: string | null;
  item_tipo: ItemTipo;
  id_insumo: string | null;
  id_producto: string | null;
  item_nombre: string;
  stock_anterior: number;
  cantidad_ajuste: number;
  stock_nuevo: number;
  motivo: string;
  origen: string;
  created_at: string;
}

interface InsumoOption {
  id_insumo: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  unidad_medida_label?: string;
  stock_actual: number;
  costo_unitario: number;
}

interface ProductoOption {
  id_producto: string;
  nombre: string;
  tipo_producto: string;
  stock_producto_terminado: number;
  costo_total: number;
  precio_venta_sugerido: number;
}

export function AuditoriaMovimientos() {
  const { isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rows, setRows] = useState<AuditoriaStockRow[]>([]);
  const [insumos, setInsumos] = useState<InsumoOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);

  const [itemTipo, setItemTipo] = useState<ItemTipo>('insumo');
  const [idItem, setIdItem] = useState('');
  const [stockNuevo, setStockNuevo] = useState('');
  const [motivo, setMotivo] = useState('');

  const [filtroTipo, setFiltroTipo] = useState<'todos' | ItemTipo>('todos');

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [auditRes, insumosRes, productosRes] = await Promise.all([
        supabase
          .from('v_auditoria_stock_movimientos')
          .select('*')
          .order('fecha', { ascending: false })
          .limit(500),

        supabase
          .from('v_insumos')
          .select(
            'id_insumo,nombre,categoria,unidad_medida,unidad_medida_label,stock_actual,costo_unitario'
          )
          .order('nombre'),

        supabase
          .from('v_productos_costeo')
          .select(
            'id_producto,nombre,tipo_producto,stock_producto_terminado,costo_total,precio_venta_sugerido'
          )
          .order('nombre')
      ]);

      if (auditRes.error) throw auditRes.error;
      if (insumosRes.error) throw insumosRes.error;
      if (productosRes.error) throw productosRes.error;

      setRows((auditRes.data ?? []) as AuditoriaStockRow[]);
      setInsumos((insumosRes.data ?? []) as InsumoOption[]);
      setProductos((productosRes.data ?? []) as ProductoOption[]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const itemsDisponibles = itemTipo === 'insumo' ? insumos : productos;

  const itemSeleccionado = useMemo(() => {
    if (itemTipo === 'insumo') {
      return insumos.find((i) => i.id_insumo === idItem) ?? null;
    }

    return productos.find((p) => p.id_producto === idItem) ?? null;
  }, [idItem, itemTipo, insumos, productos]);

  const stockActual = useMemo(() => {
    if (!itemSeleccionado) return null;

    if (itemTipo === 'insumo') {
      return (itemSeleccionado as InsumoOption).stock_actual;
    }

    return (itemSeleccionado as ProductoOption).stock_producto_terminado;
  }, [itemSeleccionado, itemTipo]);

  const unidadItem = useMemo(() => {
    if (!itemSeleccionado || itemTipo !== 'insumo') return 'unidad';

    const insumo = itemSeleccionado as InsumoOption;

    return insumo.unidad_medida_label ?? insumo.unidad_medida ?? 'unidad';
  }, [itemSeleccionado, itemTipo]);

  const rowsFiltradas = useMemo(() => {
    if (filtroTipo === 'todos') return rows;

    return rows.filter((r) => r.item_tipo === filtroTipo);
  }, [rows, filtroTipo]);

  const registrarAjuste = async (e: FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      setError('Solo usuarios administradores pueden registrar ajustes desde esta pantalla.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!idItem) {
        throw new Error('Debes seleccionar un insumo o producto.');
      }

      if (stockNuevo === '' || Number(stockNuevo) < 0) {
        throw new Error('Debes ingresar un stock nuevo válido.');
      }

      if (!motivo || motivo.trim().length < 3) {
        throw new Error('Debes ingresar un motivo para auditar el ajuste.');
      }

      const { error: rpcError } = await supabase.rpc(
        'registrar_ajuste_stock_auditado',
        {
          p_item_tipo: itemTipo,
          p_id_item: idItem,
          p_stock_nuevo: Number(stockNuevo),
          p_motivo: motivo.trim()
        }
      );

      if (rpcError) throw rpcError;

      setSuccess('Ajuste registrado y auditado correctamente.');
      setIdItem('');
      setStockNuevo('');
      setMotivo('');

      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title row-between">
        <div>
          <h2>Auditoría de movimientos</h2>
          <p>Control de ajustes de stock con usuario, fecha, motivo y cantidad.</p>
        </div>

        <button className="btn secondary" onClick={() => void load()}>
          Actualizar
        </button>
      </div>

      {error && <AlertBox type="error">{error}</AlertBox>}
      {success && <AlertBox type="success">{success}</AlertBox>}

      <AlertBox type="info">
        Todo ajuste registrado desde esta pantalla queda respaldado en Kardex y en la auditoría de stock.
        Se guarda usuario, fecha, motivo, stock anterior, ajuste y stock nuevo.
      </AlertBox>

      {isAdmin && (
        <div className="panel">
          <form className="form-grid" onSubmit={registrarAjuste}>
            <label>
              Tipo de item
              <select
                value={itemTipo}
                onChange={(e) => {
                  setItemTipo(e.target.value as ItemTipo);
                  setIdItem('');
                  setStockNuevo('');
                }}
              >
                <option value="insumo">Insumo</option>
                <option value="producto">Producto terminado</option>
              </select>
            </label>

            <label>
              Item
              <select
                value={idItem}
                onChange={(e) => setIdItem(e.target.value)}
                required
              >
                <option value="">Seleccionar</option>

                {itemTipo === 'insumo' &&
                  (itemsDisponibles as InsumoOption[]).map((i) => (
                    <option key={i.id_insumo} value={i.id_insumo}>
                      {i.nombre} — Stock actual: {formatNumber(i.stock_actual)}{' '}
                      {i.unidad_medida_label ?? i.unidad_medida}
                    </option>
                  ))}

                {itemTipo === 'producto' &&
                  (itemsDisponibles as ProductoOption[]).map((p) => (
                    <option key={p.id_producto} value={p.id_producto}>
                      {p.nombre} — Stock actual:{' '}
                      {formatNumber(p.stock_producto_terminado)}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Stock actual
              <input
                value={
                  stockActual === null
                    ? ''
                    : `${formatNumber(stockActual)} ${unidadItem}`
                }
                disabled
              />
            </label>

            <label>
              Stock nuevo
              <input
                type="number"
                min="0"
                step={itemTipo === 'insumo' ? '0.001' : '1'}
                value={stockNuevo}
                onChange={(e) => setStockNuevo(e.target.value)}
                required
              />
            </label>

            <label className="span-2">
              Motivo del ajuste
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej.: Conteo físico, corrección por merma, ajuste por inventario..."
                required
              />
            </label>

            <div className="modal-actions">
              <button className="btn primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Registrar ajuste auditado'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!isAdmin && (
        <AlertBox type="warning">
          Tu usuario puede consultar auditoría, pero no registrar ajustes desde esta pantalla.
        </AlertBox>
      )}

      <div className="row-between">
        <h3>Historial de auditoría</h3>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as 'todos' | ItemTipo)}
          className="small-select"
        >
          <option value="todos">Todos</option>
          <option value="insumo">Insumos</option>
          <option value="producto">Productos</option>
        </select>
      </div>

      <DataTable
        rows={rowsFiltradas}
        emptyText="Sin movimientos auditados"
        columns={[
          {
            key: 'fecha',
            header: 'Fecha',
            render: (r) => formatDate(r.fecha)
          },
          {
            key: 'usuario',
            header: 'Usuario',
            render: (r) => r.usuario_email ?? r.usuario_nombre ?? '-'
          },
          {
            key: 'tipo',
            header: 'Tipo',
            render: (r) => r.item_tipo
          },
          {
            key: 'item',
            header: 'Item',
            render: (r) => r.item_nombre,
            searchableValue: (r) =>
              `${r.item_nombre} ${r.usuario_email ?? ''} ${r.motivo}`
          },
          {
            key: 'anterior',
            header: 'Stock anterior',
            render: (r) => formatNumber(r.stock_anterior)
          },
          {
            key: 'ajuste',
            header: 'Ajuste',
            render: (r) => {
              const value = Number(r.cantidad_ajuste);

              return value > 0
                ? `+${formatNumber(value)}`
                : formatNumber(value);
            }
          },
          {
            key: 'nuevo',
            header: 'Stock nuevo',
            render: (r) => formatNumber(r.stock_nuevo)
          },
          {
            key: 'motivo',
            header: 'Motivo',
            render: (r) => r.motivo
          },
          {
            key: 'origen',
            header: 'Origen',
            render: (r) => r.origen
          }
        ]}
      />
    </div>
  );
}