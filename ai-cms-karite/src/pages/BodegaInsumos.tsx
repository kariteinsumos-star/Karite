import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import "./BodegaInsumos.css";

type KPIBodega = {
  total_insumos: number;
  insumos_ok: number;
  insumos_criticos: number;
  insumos_bajo_minimo: number;
  insumos_stock_cero_con_parametros: number;
  insumos_sin_parametros: number;
  insumos_con_lotes_por_vencer: number;
  insumos_con_lotes: number;
  insumos_con_compras: number;
  valorizacion_stock_estimado: number;
};

type InsumoBodega = {
  id_insumo: string;
  nombre: string;
  categoria: string | null;
  unidad_medida: string | null;
  stock: number | null;
  stock_minimo: number | null;
  stock_critico: number | null;
  costo_unitario: number | null;
  fecha_ultimo_costo: string | null;
  estado_stock: string;
  cantidad_lotes: number;
  proximo_vencimiento: string | null;
  lotes_por_vencer: number;
  cantidad_compras: number;
  ultima_compra: string | null;
};

type AlertaBodega = InsumoBodega & {
  accion_recomendada: string;
};

export default function BodegaInsumos() {
  const [kpi, setKpi] = useState<KPIBodega | null>(null);
  const [insumos, setInsumos] = useState<InsumoBodega[]>([]);
  const [alertas, setAlertas] = useState<AlertaBodega[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [errorMensaje, setErrorMensaje] = useState("");
  const [mostrarModalCompra, setMostrarModalCompra] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);
    setErrorMensaje("");

    const { data: kpiData, error: kpiError } = await supabase
      .from("v_kpi_bodega_insumos")
      .select("*")
      .maybeSingle();

    const { data: insumosData, error: insumosError } = await supabase
      .from("v_dashboard_bodega_insumos")
      .select("*")
      .limit(500);

    const { data: alertasData, error: alertasError } = await supabase
      .from("v_alertas_operativas_bodega")
      .select("*")
      .limit(100);

    if (kpiError) {
      console.error("Error KPI bodega:", kpiError);
      setErrorMensaje("No se pudieron cargar los KPI de bodega.");
    }

    if (insumosError) {
      console.error("Error dashboard bodega:", insumosError);
      setErrorMensaje("No se pudo cargar el inventario de insumos.");
    }

    if (alertasError) {
      console.error("Error alertas bodega:", alertasError);
      setErrorMensaje("No se pudieron cargar las alertas operativas.");
    }

    setKpi((kpiData ?? null) as KPIBodega | null);
    setInsumos((insumosData ?? []) as InsumoBodega[]);
    setAlertas((alertasData ?? []) as AlertaBodega[]);

    setLoading(false);
  }

  const insumosFiltrados = useMemo(() => {
    return insumos.filter((item) => {
      const texto = `${item.nombre ?? ""} ${item.categoria ?? ""}`.toLowerCase();
      const coincideBusqueda = texto.includes(busqueda.toLowerCase());
      const coincideEstado =
        filtroEstado === "Todos" || item.estado_stock === filtroEstado;

      return coincideBusqueda && coincideEstado;
    });
  }, [insumos, busqueda, filtroEstado]);

  function formatoNumero(valor: number | null | undefined) {
    return Number(valor ?? 0).toLocaleString("es-CL");
  }

  function formatoMoneda(valor: number | null | undefined) {
    return Number(valor ?? 0).toLocaleString("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    });
  }

  function estadoClase(estado: string) {
    if (estado === "OK") return "estado-pill estado-ok";
    if (estado === "Bajo mínimo") return "estado-pill estado-bajo";
    if (estado === "Crítico") return "estado-pill estado-critico";
    if (estado === "Stock cero con parámetros") return "estado-pill estado-cero";
    return "estado-pill estado-sin";
  }

  if (loading) {
    return (
      <div className="bodega-page">
        <p>Cargando módulo de bodega de insumos...</p>
      </div>
    );
  }

  return (
    <div className="bodega-page">
      <header className="bodega-header">
        <div className="bodega-eyebrow">AI-CMS Karité</div>
        <h1 className="bodega-title">Bodega de Insumos</h1>
        <p className="bodega-subtitle">
          Control de stock, alertas operativas, lotes, vencimientos, historial
          de compras y trazabilidad de insumos.
        </p>
      </header>

      {errorMensaje && (
        <div className="bodega-message bodega-message-error">
          {errorMensaje}
        </div>
      )}

      <section className="bodega-kpi-grid">
        <KpiCard titulo="Total insumos" valor={formatoNumero(kpi?.total_insumos)} />
        <KpiCard titulo="Insumos OK" valor={formatoNumero(kpi?.insumos_ok)} />
        <KpiCard titulo="Bajo mínimo" valor={formatoNumero(kpi?.insumos_bajo_minimo)} />
        <KpiCard titulo="Stock cero" valor={formatoNumero(kpi?.insumos_stock_cero_con_parametros)} />
        <KpiCard titulo="Sin parámetros" valor={formatoNumero(kpi?.insumos_sin_parametros)} />
        <KpiCard titulo="Con lotes" valor={formatoNumero(kpi?.insumos_con_lotes)} />
        <KpiCard titulo="Con compras" valor={formatoNumero(kpi?.insumos_con_compras)} />
        <KpiCard titulo="Valorización stock" valor={formatoMoneda(kpi?.valorizacion_stock_estimado)} />
      </section>

      <section className="bodega-section">
        <div className="bodega-section-header">
          <div>
            <h2 className="bodega-section-title">Alertas operativas</h2>
            <p className="bodega-section-description">
              Casos que requieren revisión, carga de stock, configuración de
              parámetros o reposición.
            </p>
          </div>

          <div className="bodega-actions">
  <button
    className="bodega-button"
    onClick={() => setMostrarModalCompra(true)}
  >
    Registrar compra
  </button>

  <button className="bodega-button" onClick={cargarDatos}>
    Actualizar datos
  </button>
</div>
        </div>

        <div className="bodega-table-wrapper">
          <table className="bodega-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Lotes por vencer</th>
                <th>Acción recomendada</th>
              </tr>
            </thead>

            <tbody>
              {alertas.slice(0, 12).map((item) => (
                <tr key={item.id_insumo}>
                  <td>{item.nombre}</td>
                  <td>{item.categoria ?? "Sin categoría"}</td>
                  <td>
                    {formatoNumero(item.stock)} {item.unidad_medida ?? ""}
                  </td>
                  <td>
                    <span className={estadoClase(item.estado_stock)}>
                      {item.estado_stock}
                    </span>
                  </td>
                  <td>{item.lotes_por_vencer}</td>
                  <td>{item.accion_recomendada}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bodega-section">
        <div className="bodega-section-header">
          <div>
            <h2 className="bodega-section-title">Inventario de insumos</h2>
            <p className="bodega-section-description">
              Vista consolidada de stock, costos, compras, lotes y vencimientos.
            </p>
          </div>
        </div>

        <div className="bodega-filters">
          <input
            className="bodega-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar insumo o categoría..."
          />

          <select
            className="bodega-select"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option>Todos</option>
            <option>OK</option>
            <option>Bajo mínimo</option>
            <option>Crítico</option>
            <option>Stock cero con parámetros</option>
            <option>Sin parámetros de stock</option>
          </select>
        </div>

        <div className="bodega-table-wrapper">
          <table className="bodega-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Categoría</th>
                <th>Stock</th>
                <th>Mínimo</th>
                <th>Crítico</th>
                <th>Estado</th>
                <th>Costo unitario</th>
                <th>Lotes</th>
                <th>Próximo vencimiento</th>
                <th>Compras</th>
                <th>Última compra</th>
              </tr>
            </thead>

            <tbody>
              {insumosFiltrados.map((item) => (
                <tr key={item.id_insumo}>
                  <td>{item.nombre}</td>
                  <td>{item.categoria ?? "Sin categoría"}</td>
                  <td>
                    {formatoNumero(item.stock)} {item.unidad_medida ?? ""}
                  </td>
                  <td>{formatoNumero(item.stock_minimo)}</td>
                  <td>{formatoNumero(item.stock_critico)}</td>
                  <td>
                    <span className={estadoClase(item.estado_stock)}>
                      {item.estado_stock}
                    </span>
                  </td>
                  <td>{formatoMoneda(item.costo_unitario)}</td>
                  <td>{item.cantidad_lotes}</td>
                  <td>{item.proximo_vencimiento ?? "Sin vencimiento"}</td>
                  <td>{item.cantidad_compras}</td>
                  <td>{item.ultima_compra ?? "Sin compra"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {insumosFiltrados.length === 0 && (
          <p style={{ padding: "24px", textAlign: "center", color: "#647067" }}>
            No se encontraron insumos con los filtros seleccionados.
          </p>
        )}
      </section>

      {mostrarModalCompra && (
        <div className="bodega-modal-backdrop">
          <div className="bodega-modal">
            <div className="bodega-modal-header">
              <div>
                <h2>Registrar compra de insumo</h2>
                <p>Modal activo. El formulario se agregará por partes.</p>
              </div>

              <button
                className="bodega-modal-close"
                onClick={() => setMostrarModalCompra(false)}
              >
                ×
              </button>
            </div>

            <div className="bodega-modal-actions">
              <button
                className="bodega-button-secondary"
                onClick={() => setMostrarModalCompra(false)}
              >
                Cancelar
              </button>

              <button
                className="bodega-button"
                onClick={() => alert("Modal funcionando correctamente")}
              >
                Probar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <article className="bodega-card">
      <div className="bodega-card-label">{titulo}</div>
      <div className="bodega-card-value">{valor}</div>
    </article>
  );
}