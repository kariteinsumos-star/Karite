import { useEffect, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { StatCard } from '../components/StatCard';
import { formatCLP, formatDate, formatNumber, formatPercent, getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { Insumo, KardexMovimiento, ProductoCosteo } from '../lib/types';

interface VentasResumen {
  total_movimientos_venta: number;
  unidades_vendidas: number;
  ventas_estimadas: number;
  costo_estimado: number;
  margen_bruto_estimado: number;
  margen_porcentaje_estimado: number;
  ventas_hoy: number;
  ventas_mes: number;
  unidades_mes: number;
}

interface ProductoVentaResumen {
  id_producto: string;
  nombre: string;
  unidades_vendidas: number;
  ventas_estimadas: number;
  costo_estimado: number;
  margen_bruto_estimado: number;
  margen_porcentaje_estimado: number;
  ultima_venta: string | null;
}

const ventasResumenInicial: VentasResumen = {
  total_movimientos_venta: 0,
  unidades_vendidas: 0,
  ventas_estimadas: 0,
  costo_estimado: 0,
  margen_bruto_estimado: 0,
  margen_porcentaje_estimado: 0,
  ventas_hoy: 0,
  ventas_mes: 0,
  unidades_mes: 0
};

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [productos, setProductos] = useState<ProductoCosteo[]>([]);
  const [insumosCriticos, setInsumosCriticos] = useState<Insumo[]>([]);
  const [productosCriticos, setProductosCriticos] = useState<ProductoCosteo[]>([]);
  const [productosSinReceta, setProductosSinReceta] = useState<ProductoCosteo[]>([]);
  const [kardex, setKardex] = useState<KardexMovimiento[]>([]);

  const [ventasResumen, setVentasResumen] = useState<VentasResumen>(ventasResumenInicial);
  const [topProductosVentas, setTopProductosVentas] = useState<ProductoVentaResumen[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          ins,
          prod,
          insCrit,
          prodCrit,
          sinReceta,
          movs,
          ventas,
          topVentas
        ] = await Promise.all([
          supabase.from('v_insumos').select('*'),
          supabase.from('v_productos_costeo').select('*'),
          supabase.from('v_stock_critico_insumos').select('*'),
          supabase.from('v_stock_critico_productos').select('*'),
          supabase.from('v_productos_sin_receta').select('*'),
          supabase
            .from('v_movimientos_kardex')
            .select('*')
            .order('fecha', { ascending: false })
            .limit(10),
          supabase
            .from('v_dashboard_ventas_resumen')
            .select('*')
            .single(),
          supabase
            .from('v_dashboard_top_productos_ventas')
            .select('*')
            .order('ventas_estimadas', { ascending: false })
            .limit(10)
        ]);

        for (const res of [
          ins,
          prod,
          insCrit,
          prodCrit,
          sinReceta,
          movs,
          ventas,
          topVentas
        ]) {
          if (res.error) throw res.error;
        }

        setInsumos((ins.data ?? []) as Insumo[]);
        setProductos((prod.data ?? []) as ProductoCosteo[]);
        setInsumosCriticos((insCrit.data ?? []) as Insumo[]);
        setProductosCriticos((prodCrit.data ?? []) as ProductoCosteo[]);
        setProductosSinReceta((sinReceta.data ?? []) as ProductoCosteo[]);
        setKardex((movs.data ?? []) as KardexMovimiento[]);

        setVentasResumen((ventas.data ?? ventasResumenInicial) as VentasResumen);
        setTopProductosVentas((topVentas.data ?? []) as ProductoVentaResumen[]);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title">
        <h2>Dashboard</h2>
        <p>Resumen operativo de inventario, ventas, márgenes y movimientos.</p>
      </div>

      {error && <AlertBox type="error">{error}</AlertBox>}

      <h3>Inventario</h3>

      <div className="stats-grid">
        <StatCard 
          label="Total insumos" 
          value={insumos.length} 
        />

        <StatCard 
          label="Insumos críticos" 
          value={insumosCriticos.length} 
          danger={insumosCriticos.length > 0} 
        />

        <StatCard 
          label="Total productos" 
          value={productos.length} 
        />

        <StatCard 
          label="Productos críticos" 
          value={productosCriticos.length} 
          danger={productosCriticos.length > 0} 
        />

        <StatCard 
          label="Productos sin receta" 
          value={productosSinReceta.length} 
          danger={productosSinReceta.length > 0} 
        />
      </div>

      <h3>Ventas y márgenes</h3>

      <div className="stats-grid">
        <StatCard
          label="Ventas estimadas"
          value={formatCLP(ventasResumen.ventas_estimadas)}
          helper="Según precio sugerido"
        />

        <StatCard
          label="Ventas del mes"
          value={formatCLP(ventasResumen.ventas_mes)}
          helper={`${formatNumber(ventasResumen.unidades_mes)} unidad(es) vendidas`}
        />

        <StatCard
          label="Ventas de hoy"
          value={formatCLP(ventasResumen.ventas_hoy)}
        />

        <StatCard
          label="Margen bruto estimado"
          value={formatCLP(ventasResumen.margen_bruto_estimado)}
          danger={ventasResumen.margen_bruto_estimado < 0}
        />

        <StatCard
          label="Margen % estimado"
          value={formatPercent(ventasResumen.margen_porcentaje_estimado)}
          danger={ventasResumen.margen_porcentaje_estimado < 0.3}
          helper="Margen sobre ventas"
        />

        <StatCard
          label="Unidades vendidas"
          value={formatNumber(ventasResumen.unidades_vendidas)}
          helper={`${ventasResumen.total_movimientos_venta} movimiento(s) de venta`}
        />
      </div>

      <AlertBox type="info">
        Los indicadores de ventas son estimados con el precio sugerido actual del producto.
        Para ventas reales exactas, se recomienda guardar el precio real de venta en cada transacción.
      </AlertBox>

      <h3>Top productos vendidos</h3>

      <DataTable
        rows={topProductosVentas}
        emptyText="Sin ventas registradas"
        columns={[
          {
            key: 'producto',
            header: 'Producto',
            render: (r) => r.nombre,
            searchableValue: (r) => r.nombre
          },
          {
            key: 'unidades',
            header: 'Unidades',
            render: (r) => formatNumber(r.unidades_vendidas)
          },
          {
            key: 'ventas',
            header: 'Ventas estimadas',
            render: (r) => formatCLP(r.ventas_estimadas)
          },
          {
            key: 'costo',
            header: 'Costo estimado',
            render: (r) => formatCLP(r.costo_estimado)
          },
          {
            key: 'margen_bruto',
            header: 'Margen bruto',
            render: (r) => formatCLP(r.margen_bruto_estimado)
          },
          {
            key: 'margen_pct',
            header: 'Margen %',
            render: (r) => formatPercent(r.margen_porcentaje_estimado)
          },
          {
            key: 'ultima',
            header: 'Última venta',
            render: (r) => formatDate(r.ultima_venta)
          }
        ]}
      />

      <h3>Últimos movimientos</h3>

      <DataTable
        rows={kardex}
        columns={[
          {
            key: 'fecha',
            header: 'Fecha',
            render: (r) => formatDate(r.fecha)
          },
          {
            key: 'tipo',
            header: 'Tipo',
            render: (r) => r.tipo
          },
          {
            key: 'item',
            header: 'Item',
            render: (r) => r.item_nombre,
            searchableValue: (r) => `${r.item_nombre} ${r.tipo} ${r.observacion ?? ''}`
          },
          {
            key: 'cantidad',
            header: 'Cantidad',
            render: (r) => formatNumber(r.cantidad)
          },
          {
            key: 'costo',
            header: 'Costo snapshot',
            render: (r) => formatCLP(r.costo_unitario_snapshot)
          },
          {
            key: 'obs',
            header: 'Observación',
            render: (r) => r.observacion ?? '-'
          }
        ]}
      />
    </div>
  );
}