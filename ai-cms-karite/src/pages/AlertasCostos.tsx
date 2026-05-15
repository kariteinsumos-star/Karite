import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type AlertaCosto = {
  id: string;
  producto_id: string;
  componente_id: string;
  costo_componente_anterior: number | null;
  costo_componente_nuevo: number | null;
  variacion_componente_pct: number | null;
  variacion_producto_pct: number | null;
  estado: "pendiente" | "revisada" | "aplicada" | "descartada";
  mensaje: string | null;
  created_at: string;
};

export default function AlertasCostos() {
  const [alertas, setAlertas] = useState<AlertaCosto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("pendiente");

  useEffect(() => {
    cargarAlertas();
  }, [filtroEstado]);

  async function cargarAlertas() {
    setLoading(true);

    let query = supabase
      .from("alertas_costos_producto")
      .select("*")
      .order("created_at", { ascending: false });

    if (filtroEstado !== "todas") {
      query = query.eq("estado", filtroEstado);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al cargar alertas de costos:", error);
      alert("No se pudieron cargar las alertas de costos.");
      setLoading(false);
      return;
    }

    setAlertas(data || []);
    setLoading(false);
  }

  async function cambiarEstado(
    alertaId: string,
    nuevoEstado: "revisada" | "aplicada" | "descartada"
  ) {
    const { error } = await supabase
      .from("alertas_costos_producto")
      .update({
        estado: nuevoEstado,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", alertaId);

    if (error) {
      console.error("Error al cambiar estado:", error);
      alert("No se pudo actualizar el estado de la alerta.");
      return;
    }

    await cargarAlertas();
  }

  function formatoCLP(valor: number | null) {
    if (valor === null || valor === undefined) return "-";
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(valor);
  }

  function formatoPorcentaje(valor: number | null) {
    if (valor === null || valor === undefined) return "-";
    return `${valor.toFixed(2)}%`;
  }

  function formatoFecha(fecha: string) {
    return new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function colorEstado(estado: string) {
    switch (estado) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "revisada":
        return "bg-blue-100 text-blue-800";
      case "aplicada":
        return "bg-green-100 text-green-800";
      case "descartada":
        return "bg-gray-200 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Alertas de Costos
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Revisa los productos afectados cuando cambia el costo de un insumo,
          envase, etiqueta u otro componente de costo.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-800">
            Filtro de alertas
          </h2>
          <p className="text-xs text-gray-500">
            Por defecto se muestran las alertas pendientes de revisión.
          </p>
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="pendiente">Pendientes</option>
          <option value="revisada">Revisadas</option>
          <option value="aplicada">Aplicadas</option>
          <option value="descartada">Descartadas</option>
          <option value="todas">Todas</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-gray-600">Cargando alertas...</div>
        ) : alertas.length === 0 ? (
          <div className="p-6 text-gray-600">
            No hay alertas de costos para el filtro seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Mensaje</th>
                  <th className="px-4 py-3 text-right">Costo anterior</th>
                  <th className="px-4 py-3 text-right">Costo nuevo</th>
                  <th className="px-4 py-3 text-right">Variación componente</th>
                  <th className="px-4 py-3 text-right">Variación producto</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {alertas.map((alerta) => (
                  <tr
                    key={alerta.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatoFecha(alerta.created_at)}
                    </td>

                    <td className="px-4 py-3 min-w-[280px]">
                      <p className="font-medium text-gray-800">
                        {alerta.mensaje || "Alerta de cambio de costo"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Producto ID: {alerta.producto_id}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatoCLP(alerta.costo_componente_anterior)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatoCLP(alerta.costo_componente_nuevo)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatoPorcentaje(alerta.variacion_componente_pct)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {formatoPorcentaje(alerta.variacion_producto_pct)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${colorEstado(
                          alerta.estado
                        )}`}
                      >
                        {alerta.estado}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {alerta.estado === "pendiente" ? (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() =>
                              cambiarEstado(alerta.id, "revisada")
                            }
                            className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                          >
                            Marcar revisada
                          </button>

                          <button
                            onClick={() =>
                              cambiarEstado(alerta.id, "aplicada")
                            }
                            className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                          >
                            Marcar aplicada
                          </button>

                          <button
                            onClick={() =>
                              cambiarEstado(alerta.id, "descartada")
                            }
                            className="px-3 py-1 rounded-lg bg-gray-500 text-white text-xs hover:bg-gray-600"
                          >
                            Descartar
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Sin acciones pendientes
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}