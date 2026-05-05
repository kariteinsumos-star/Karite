import { useEffect, useMemo, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { formatCLP, formatDate, formatNumber } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { KardexMovimiento, TipoMovimiento } from '../lib/types';

const tipos: Array<TipoMovimiento | ''> = ['', 'carga_inicial', 'produccion', 'armado_kit', 'venta_directa', 'venta_mayorista_insumo', 'ajuste', 'fraccionamiento'];

export function Kardex() {
  const [rows, setRows] = useState<KardexMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState('');
  const [query, setQuery] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data, error: e } = await supabase.from('v_movimientos_kardex').select('*').order('fecha', { ascending: false }).limit(1000);
      if (e) setError(e.message);
      setRows((data ?? []) as KardexMovimiento[]);
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rows.filter((r) => {
      const byTipo = tipo ? r.tipo === tipo : true;
      const byQuery = q ? `${r.item_nombre} ${r.observacion ?? ''} ${r.referencia_fontana ?? ''}`.toLowerCase().includes(q) : true;
      const byDate = fechaDesde ? new Date(r.fecha) >= new Date(fechaDesde) : true;
      return byTipo && byQuery && byDate;
    });
  }, [fechaDesde, query, rows, tipo]);

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title"><h2>Kardex</h2><p>Trazabilidad de movimientos de inventario.</p></div>
      {error && <AlertBox type="error">{error}</AlertBox>}
      <div className="filters panel">
        <label>Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value)}>{tipos.map((t) => <option key={t} value={t}>{t || 'Todos'}</option>)}</select></label>
        <label>Buscar<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Item, observación o Fontana" /></label>
        <label>Desde<input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} /></label>
      </div>
      <DataTable
        rows={filtered}
        columns={[
          { key: 'fecha', header: 'Fecha', render: (r) => formatDate(r.fecha) },
          { key: 'tipo', header: 'Tipo', render: (r) => r.tipo },
          { key: 'item_tipo', header: 'Item tipo', render: (r) => r.item_tipo },
          { key: 'item', header: 'Item', render: (r) => r.item_nombre, searchableValue: (r) => `${r.item_nombre} ${r.observacion ?? ''}` },
          { key: 'cantidad', header: 'Cantidad', render: (r) => formatNumber(r.cantidad) },
          { key: 'costo', header: 'Costo snapshot', render: (r) => formatCLP(r.costo_unitario_snapshot) },
          { key: 'fontana', header: 'Ref. Fontana', render: (r) => r.referencia_fontana ?? '-' },
          { key: 'obs', header: 'Observación', render: (r) => r.observacion ?? '-' }
        ]}
      />
    </div>
  );
}
