import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { StatCard } from '../components/StatCard';
import { formatCLP, formatDate, formatNumber, formatPercent, getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';

interface ReporteKpis {
  total_insumos: number;
  total_insumos_criticos: number;
  total_productos: number;
  total_productos_criticos: number;
  total_productos_sin_receta: number;
  productos_creados_30d: number;
  recetas_creadas_30d: number;
  unidades_vendidas: number;
  ventas_estimadas: number;
  costo_estimado: number;
  ventas_mes: number;
}

interface InsumoReporte {
  id_insumo: string;
  nombre: string;
  categoria: string;
  unidad_medida_label: string;
  costo_unitario: number;
  stock_actual: number;
  stock_minimo: number;
  stock_critico: boolean;
  activo: boolean;
}

interface ProductoVendidoReporte {
  id_producto: string;
  nombre: string;
  unidades_vendidas: number;
  ventas_estimadas: number;
  costo_estimado: number;
  margen_bruto_estimado: number;
  margen_porcentaje_estimado: number;
  ultima_venta: string | null;
}

interface ProductoCreadoReporte {
  id_producto: string;
  nombre: string;
  tipo_producto: string;
  costo_total: number;
  precio_venta_sugerido: number;
  stock_producto_terminado: number;
  created_at: string;
}

interface RecetaCreadaReporte {
  id_receta: string;
  producto: string;
  insumo: string;
  cantidad_con_unidad: string;
  merma_porcentaje: number;
  costo_linea: number;
  created_at: string;
}

const emptyKpis: ReporteKpis = {
  total_insumos: 0,
  total_insumos_criticos: 0,
  total_productos: 0,
  total_productos_criticos: 0,
  total_productos_sin_receta: 0,
  productos_creados_30d: 0,
  recetas_creadas_30d: 0,
  unidades_vendidas: 0,
  ventas_estimadas: 0,
  costo_estimado: 0,
  ventas_mes: 0
};

type ReporteData = {
  kpis: ReporteKpis;
  insumos: InsumoReporte[];
  insumosCriticos: InsumoReporte[];
  productosVendidos: ProductoVendidoReporte[];
  productosCreados: ProductoCreadoReporte[];
  recetasCreadas: RecetaCreadaReporte[];
};

function shortText(value: string | null | undefined, max = 42) {
  const text = value ?? '-';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function margenBruto(kpis: ReporteKpis) {
  return Number(kpis.ventas_estimadas ?? 0) - Number(kpis.costo_estimado ?? 0);
}

function margenPorcentaje(kpis: ReporteKpis) {
  const ventas = Number(kpis.ventas_estimadas ?? 0);
  if (ventas <= 0) return 0;
  return margenBruto(kpis) / ventas;
}

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);
  return y + 8;
}

function checkPage(doc: jsPDF, y: number) {
  if (y > 265) {
    doc.addPage();
    return 18;
  }
  return y;
}

function drawHorizontalBarChart(
  doc: jsPDF,
  title: string,
  data: { label: string; value: number }[],
  y: number
) {
  y = checkPage(doc, y);
  y = addSectionTitle(doc, title, y);

  if (data.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sin datos disponibles para graficar.', 14, y);
    return y + 10;
  }

  const chartData = data.slice(0, 8);
  const maxValue = Math.max(...chartData.map((d) => Number(d.value || 0)), 1);
  const labelX = 14;
  const barX = 80;
  const barMaxWidth = 95;
  const rowHeight = 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  chartData.forEach((item, index) => {
    const rowY = y + index * rowHeight;
    const width = (Number(item.value || 0) / maxValue) * barMaxWidth;

    doc.text(shortText(item.label, 30), labelX, rowY + 5);
    doc.setFillColor(65, 105, 80);
    doc.rect(barX, rowY, width, 5, 'F');
    doc.text(formatCLP(item.value), barX + width + 3, rowY + 5);
  });

  return y + chartData.length * rowHeight + 10;
}

export function Reportes() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kpis, setKpis] = useState<ReporteKpis>(emptyKpis);
  const [insumos, setInsumos] = useState<InsumoReporte[]>([]);
  const [insumosCriticos, setInsumosCriticos] = useState<InsumoReporte[]>([]);
  const [productosVendidos, setProductosVendidos] = useState<ProductoVendidoReporte[]>([]);
  const [productosCreados, setProductosCreados] = useState<ProductoCreadoReporte[]>([]);
  const [recetasCreadas, setRecetasCreadas] = useState<RecetaCreadaReporte[]>([]);

  const fetchReporteData = async (): Promise<ReporteData> => {
    const [
      kpiRes,
      insumosRes,
      criticosRes,
      vendidosRes,
      productosCreadosRes,
      recetasCreadasRes
    ] = await Promise.all([
      supabase.from('v_reporte_kpis').select('*').single(),
      supabase.from('v_reporte_insumos_estado').select('*').order('nombre'),
      supabase
        .from('v_reporte_insumos_estado')
        .select('*')
        .eq('stock_critico', true)
        .order('nombre'),
      supabase
        .from('v_reporte_productos_vendidos')
        .select('*')
        .order('ventas_estimadas', { ascending: false }),
      supabase
        .from('v_reporte_productos_creados_recientes')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('v_reporte_recetas_creadas_recientes')
        .select('*')
        .order('created_at', { ascending: false })
    ]);

    const errors = [
      kpiRes.error,
      insumosRes.error,
      criticosRes.error,
      vendidosRes.error,
      productosCreadosRes.error,
      recetasCreadasRes.error
    ].filter(Boolean);

    if (errors.length > 0) {
      throw errors[0];
    }

    return {
      kpis: (kpiRes.data ?? emptyKpis) as ReporteKpis,
      insumos: (insumosRes.data ?? []) as InsumoReporte[],
      insumosCriticos: (criticosRes.data ?? []) as InsumoReporte[],
      productosVendidos: (vendidosRes.data ?? []) as ProductoVendidoReporte[],
      productosCreados: (productosCreadosRes.data ?? []) as ProductoCreadoReporte[],
      recetasCreadas: (recetasCreadasRes.data ?? []) as RecetaCreadaReporte[]
    };
  };

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchReporteData();

      setKpis(data.kpis);
      setInsumos(data.insumos);
      setInsumosCriticos(data.insumosCriticos);
      setProductosVendidos(data.productosVendidos);
      setProductosCreados(data.productosCreados);
      setRecetasCreadas(data.recetasCreadas);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const generarPdf = async () => {
    setGenerating(true);
    setError(null);

    try {
      const data = await fetchReporteData();

      const doc = new jsPDF('p', 'mm', 'a4');
      const fecha = new Date();
      const fechaNombre = fecha.toISOString().slice(0, 10);

      let y = 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text('Informe Operacional AI-CMS / Mini-ERP PYME', 14, y);

      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generado: ${fecha.toLocaleString('es-CL')}`, 14, y);

      y += 8;
      doc.setFontSize(9);
      doc.text(
        'Informe generado automáticamente con datos consultados en Supabase al momento de la descarga.',
        14,
        y
      );

      y += 12;
      y = addSectionTitle(doc, '1. Indicadores generales', y);

      autoTable(doc, {
        startY: y,
        head: [['Indicador', 'Valor']],
        body: [
          ['Total insumos', formatNumber(data.kpis.total_insumos)],
          ['Insumos críticos', formatNumber(data.kpis.total_insumos_criticos)],
          ['Total productos', formatNumber(data.kpis.total_productos)],
          ['Productos críticos', formatNumber(data.kpis.total_productos_criticos)],
          ['Productos sin receta', formatNumber(data.kpis.total_productos_sin_receta)],
          ['Productos creados últimos 30 días', formatNumber(data.kpis.productos_creados_30d)],
          ['Recetas creadas últimos 30 días', formatNumber(data.kpis.recetas_creadas_30d)],
          ['Unidades vendidas', formatNumber(data.kpis.unidades_vendidas)],
          ['Ventas estimadas', formatCLP(data.kpis.ventas_estimadas)],
          ['Costo estimado', formatCLP(data.kpis.costo_estimado)],
          ['Margen bruto estimado', formatCLP(margenBruto(data.kpis))],
          ['Margen % estimado', formatPercent(margenPorcentaje(data.kpis))]
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [65, 105, 80] }
      });

      y = ((doc as any).lastAutoTable.finalY ?? y) + 10;

      y = drawHorizontalBarChart(
        doc,
        '2. Gráfico de ventas estimadas por producto',
        data.productosVendidos.map((p) => ({
          label: p.nombre,
          value: Number(p.ventas_estimadas ?? 0)
        })),
        y
      );

      y = checkPage(doc, y);
      y = addSectionTitle(doc, '3. Insumos críticos', y);

      autoTable(doc, {
        startY: y,
        head: [['Insumo', 'Categoría', 'Stock', 'Mínimo', 'Unidad']],
        body: data.insumosCriticos.slice(0, 60).map((i) => [
          shortText(i.nombre),
          shortText(i.categoria),
          formatNumber(i.stock_actual),
          formatNumber(i.stock_minimo),
          i.unidad_medida_label
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [180, 70, 60] }
      });

      y = ((doc as any).lastAutoTable.finalY ?? y) + 10;
      y = checkPage(doc, y);
      y = addSectionTitle(doc, '4. Productos vendidos', y);

      autoTable(doc, {
        startY: y,
        head: [['Producto', 'Unidades', 'Ventas', 'Costo', 'Margen bruto', 'Margen %']],
        body: data.productosVendidos.slice(0, 50).map((p) => [
          shortText(p.nombre),
          formatNumber(p.unidades_vendidas),
          formatCLP(p.ventas_estimadas),
          formatCLP(p.costo_estimado),
          formatCLP(p.margen_bruto_estimado),
          formatPercent(p.margen_porcentaje_estimado)
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [65, 105, 80] }
      });

      y = ((doc as any).lastAutoTable.finalY ?? y) + 10;
      y = checkPage(doc, y);
      y = addSectionTitle(doc, '5. Productos creados recientemente', y);

      autoTable(doc, {
        startY: y,
        head: [['Producto', 'Tipo', 'Costo total', 'Precio sugerido', 'Stock', 'Creado']],
        body: data.productosCreados.slice(0, 50).map((p) => [
          shortText(p.nombre),
          p.tipo_producto,
          formatCLP(p.costo_total),
          formatCLP(p.precio_venta_sugerido),
          formatNumber(p.stock_producto_terminado),
          formatDate(p.created_at)
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [65, 105, 80] }
      });

      y = ((doc as any).lastAutoTable.finalY ?? y) + 10;
      y = checkPage(doc, y);
      y = addSectionTitle(doc, '6. Recetas creadas recientemente', y);

      autoTable(doc, {
        startY: y,
        head: [['Producto', 'Insumo', 'Cantidad', 'Merma %', 'Costo línea', 'Creado']],
        body: data.recetasCreadas.slice(0, 60).map((r) => [
          shortText(r.producto),
          shortText(r.insumo),
          r.cantidad_con_unidad,
          formatNumber(r.merma_porcentaje),
          formatCLP(r.costo_linea),
          formatDate(r.created_at)
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [65, 105, 80] }
      });

      doc.addPage();
      y = 18;
      y = addSectionTitle(doc, '7. Inventario de insumos', y);

      autoTable(doc, {
        startY: y,
        head: [['Insumo', 'Categoría', 'Stock', 'Mínimo', 'Unidad', 'Costo unit.', 'Estado']],
        body: data.insumos.map((i) => [
          shortText(i.nombre),
          shortText(i.categoria),
          formatNumber(i.stock_actual),
          formatNumber(i.stock_minimo),
          i.unidad_medida_label,
          formatCLP(i.costo_unitario),
          i.stock_critico ? 'Crítico' : 'Normal'
        ]),
        styles: { fontSize: 6 },
        headStyles: { fillColor: [65, 105, 80] }
      });

      const pageCount = doc.getNumberOfPages();

      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Página ${page} de ${pageCount}`,
          170,
          288
        );
      }

      doc.save(`Informe_AI_CMS_Mini_ERP_${fechaNombre}.pdf`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title row-between">
        <div>
          <h2>Reportes</h2>
          <p>Genera informes descargables con datos actualizados de inventario, ventas, recetas y stock crítico.</p>
        </div>

        <div className="actions">
          <button className="btn secondary" onClick={() => void load()}>
            Actualizar datos
          </button>

          <button className="btn primary" onClick={() => void generarPdf()} disabled={generating}>
            {generating ? 'Generando...' : 'Descargar informe PDF'}
          </button>
        </div>
      </div>

      {error && <AlertBox type="error">{error}</AlertBox>}

      <AlertBox type="info">
        El informe se genera con datos consultados en Supabase al momento de la descarga.
        Las ventas son estimadas con el precio sugerido del producto.
      </AlertBox>

      <h3>Indicadores principales</h3>

      <div className="stats-grid">
        <StatCard label="Total insumos" value={formatNumber(kpis.total_insumos)} />
        <StatCard label="Insumos críticos" value={formatNumber(kpis.total_insumos_criticos)} danger={kpis.total_insumos_criticos > 0} />
        <StatCard label="Total productos" value={formatNumber(kpis.total_productos)} />
        <StatCard label="Productos críticos" value={formatNumber(kpis.total_productos_criticos)} danger={kpis.total_productos_criticos > 0} />
        <StatCard label="Productos sin receta" value={formatNumber(kpis.total_productos_sin_receta)} danger={kpis.total_productos_sin_receta > 0} />
        <StatCard label="Ventas estimadas" value={formatCLP(kpis.ventas_estimadas)} />
        <StatCard label="Ventas del mes" value={formatCLP(kpis.ventas_mes)} />
        <StatCard label="Margen bruto estimado" value={formatCLP(margenBruto(kpis))} danger={margenBruto(kpis) < 0} />
        <StatCard label="Margen % estimado" value={formatPercent(margenPorcentaje(kpis))} danger={margenPorcentaje(kpis) < 0.3} />
      </div>

      <h3>Productos vendidos</h3>

      <DataTable
        rows={productosVendidos}
        emptyText="Sin productos vendidos"
        columns={[
          { key: 'nombre', header: 'Producto', render: (r) => r.nombre },
          { key: 'unidades', header: 'Unidades', render: (r) => formatNumber(r.unidades_vendidas) },
          { key: 'ventas', header: 'Ventas estimadas', render: (r) => formatCLP(r.ventas_estimadas) },
          { key: 'margen', header: 'Margen bruto', render: (r) => formatCLP(r.margen_bruto_estimado) },
          { key: 'margenp', header: 'Margen %', render: (r) => formatPercent(r.margen_porcentaje_estimado) },
          { key: 'ultima', header: 'Última venta', render: (r) => r.ultima_venta ? formatDate(r.ultima_venta) : '-' }
        ]}
      />

      <h3>Insumos críticos</h3>

      <DataTable
        rows={insumosCriticos}
        emptyText="No hay insumos críticos"
        columns={[
          { key: 'nombre', header: 'Insumo', render: (r) => r.nombre },
          { key: 'categoria', header: 'Categoría', render: (r) => r.categoria },
          { key: 'stock', header: 'Stock', render: (r) => `${formatNumber(r.stock_actual)} ${r.unidad_medida_label}` },
          { key: 'minimo', header: 'Mínimo', render: (r) => `${formatNumber(r.stock_minimo)} ${r.unidad_medida_label}` },
          { key: 'costo', header: 'Costo unit.', render: (r) => formatCLP(r.costo_unitario) }
        ]}
      />

      <h3>Productos creados últimos 30 días</h3>

      <DataTable
        rows={productosCreados}
        emptyText="No hay productos creados recientemente"
        columns={[
          { key: 'nombre', header: 'Producto', render: (r) => r.nombre },
          { key: 'tipo', header: 'Tipo', render: (r) => r.tipo_producto },
          { key: 'costo', header: 'Costo total', render: (r) => formatCLP(r.costo_total) },
          { key: 'precio', header: 'Precio sugerido', render: (r) => formatCLP(r.precio_venta_sugerido) },
          { key: 'stock', header: 'Stock', render: (r) => formatNumber(r.stock_producto_terminado) },
          { key: 'fecha', header: 'Creado', render: (r) => formatDate(r.created_at) }
        ]}
      />

      <h3>Recetas creadas últimos 30 días</h3>

      <DataTable
        rows={recetasCreadas}
        emptyText="No hay recetas creadas recientemente"
        columns={[
          { key: 'producto', header: 'Producto', render: (r) => r.producto },
          { key: 'insumo', header: 'Insumo', render: (r) => r.insumo },
          { key: 'cantidad', header: 'Cantidad', render: (r) => r.cantidad_con_unidad },
          { key: 'merma', header: 'Merma %', render: (r) => formatNumber(r.merma_porcentaje) },
          { key: 'costo', header: 'Costo línea', render: (r) => formatCLP(r.costo_linea) },
          { key: 'fecha', header: 'Creado', render: (r) => formatDate(r.created_at) }
        ]}
      />
    </div>
  );
}