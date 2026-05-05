import { useEffect, useMemo, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { ModalForm } from '../components/ModalForm';
import { formatCLP, formatNumber } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { Insumo, ProductoCosteo } from '../lib/types';

export function StockCritico() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [productos, setProductos] = useState<ProductoCosteo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAlarm, setShowAlarm] = useState(false);

  const totalCriticos = useMemo(() => {
    return insumos.length + productos.length;
  }, [insumos.length, productos.length]);

  const load = async () => {
    setLoading(true);
    setError(null);

    const [i, p] = await Promise.all([
      supabase.from('v_stock_critico_insumos').select('*').order('nombre'),
      supabase.from('v_stock_critico_productos').select('*').order('nombre')
    ]);

    if (i.error || p.error) {
      setError(
        [
          i.error?.message,
          p.error?.message
        ]
          .filter(Boolean)
          .join(' | ')
      );
    }

    setInsumos((i.data ?? []) as Insumo[]);
    setProductos((p.data ?? []) as ProductoCosteo[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const activarAlarma = async () => {
    setShowAlarm(true);

    if ('Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
          new Notification('Alarma de stock crítico', {
            body: `Hay ${insumos.length} insumo(s) crítico(s) y ${productos.length} producto(s) crítico(s).`
          });
        }
      } catch {
        // Si el navegador bloquea notificaciones, igual se muestra el modal interno.
      }
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="row-between">
        <div className="page-title">
          <h2>Stock crítico</h2>
          <p>Alertas de insumos y productos bajo mínimo.</p>
        </div>

        {totalCriticos > 0 && (
          <button className="btn danger alarm-button" onClick={activarAlarma}>
            🚨 Alarma stock crítico ({totalCriticos})
          </button>
        )}
      </div>

      {error && <AlertBox type="error">{error}</AlertBox>}

      {totalCriticos > 0 ? (
        <AlertBox type="warning">
          Hay {insumos.length} insumo(s) crítico(s) y {productos.length} producto(s) crítico(s).
          Revisa reposición, producción o ajuste de stock mínimo.
        </AlertBox>
      ) : (
        <AlertBox type="success">
          No hay stock crítico activo.
        </AlertBox>
      )}

      <h3>Insumos críticos</h3>
      <DataTable
        rows={insumos}
        columns={[
          { key: 'nombre', header: 'Nombre', render: (r) => r.nombre },
          { key: 'cat', header: 'Categoría', render: (r) => r.categoria },
          { key: 'unidad', header: 'Unidad', render: (r) => r.unidad_medida },
          { key: 'stock', header: 'Stock', render: (r) => formatNumber(r.stock_actual) },
          { key: 'min', header: 'Mínimo', render: (r) => formatNumber(r.stock_minimo) },
          { key: 'costo', header: 'Costo unit.', render: (r) => formatCLP(r.costo_unitario) }
        ]}
      />

      <h3>Productos críticos</h3>
      <DataTable
        rows={productos}
        columns={[
          { key: 'nombre', header: 'Nombre', render: (r) => r.nombre },
          { key: 'tipo', header: 'Tipo', render: (r) => r.tipo_producto },
          { key: 'stock', header: 'Stock', render: (r) => formatNumber(r.stock_producto_terminado) },
          { key: 'min', header: 'Mínimo', render: (r) => formatNumber(r.stock_minimo) },
          { key: 'precio', header: 'Precio sugerido', render: (r) => formatCLP(r.precio_venta_sugerido) }
        ]}
      />

      <ModalForm
        open={showAlarm}
        title="🚨 Alarma de stock crítico"
        onClose={() => setShowAlarm(false)}
      >
        <div className="alarm-summary">
          <p>
            Actualmente existen <strong>{totalCriticos}</strong> registros en estado crítico.
          </p>

          <div className="alarm-grid">
            <div className="alarm-card">
              <span>Insumos críticos</span>
              <strong>{insumos.length}</strong>
            </div>

            <div className="alarm-card">
              <span>Productos críticos</span>
              <strong>{productos.length}</strong>
            </div>
          </div>

          <h3>Acciones recomendadas</h3>
          <ul>
            <li>Revisar insumos con stock bajo o en cero.</li>
            <li>Evaluar reposición de materias primas críticas.</li>
            <li>Validar si el stock mínimo está correctamente configurado.</li>
            <li>Revisar productos terminados con baja disponibilidad.</li>
          </ul>

          <div className="modal-actions">
            <button className="btn secondary" onClick={() => void load()}>
              Actualizar datos
            </button>

            <button className="btn primary" onClick={() => setShowAlarm(false)}>
              Entendido
            </button>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}