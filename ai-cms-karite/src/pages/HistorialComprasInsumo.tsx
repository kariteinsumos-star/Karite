import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type CompraInsumo = {
  id: string;
  insumo_id: string;
  insumo_nombre: string;
  proveedor: string;
  fecha_compra: string;
  cantidad: number;
  unidad_medida: string;
  precio_unitario: number;
  precio_total: number;
  precio_unitario_anterior: number | null;
  variacion_precio_abs: number | null;
  variacion_precio_pct: number | null;
  documento_referencia: string | null;
  observacion: string | null;
  created_at: string;
};

type ResumenCompra = {
  insumo_id: string;
  insumo_nombre: string;
  total_compras: number;
  primera_compra: string | null;
  ultima_compra: string | null;
  precio_minimo: number | null;
  precio_maximo: number | null;
  precio_promedio: number | null;
  cantidad_total_comprada: number | null;
  monto_total_comprado: number | null;
  ultimo_proveedor: string | null;
  ultimo_precio_unitario: number | null;
};

const unidades = ["unidad", "g", "kg", "ml", "l", "hora", "lote"];

const formInicial = {
  insumo_id: "",
  insumo_nombre: "",
  proveedor: "",
  fecha_compra: new Date().toISOString().slice(0, 10),
  cantidad: "",
  unidad_medida: "unidad",
  precio_unitario: "",
  documento_referencia: "",
  observacion: "",
};

export default function HistorialComprasInsumo() {
  const [compras, setCompras] = useState<CompraInsumo[]>([]);
  const [resumenes, setResumenes] = useState<ResumenCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [filtroInsumo, setFiltroInsumo] = useState("");
  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    cargarDatos();
  }, [filtroInsumo]);

  async function cargarDatos() {
    setLoading(true);

    let query = supabase
      .from("historial_compras_insumo")
      .select("*")
      .order("fecha_compra", { ascending: false })
      .order("created_at", { ascending: false });

    if (filtroInsumo.trim()) {
      query = query.or(
        `insumo_nombre.ilike.%${filtroInsumo.trim()}%,proveedor.ilike.%${filtroInsumo.trim()}%`
      );
    }

    const { data: comprasData, error: comprasError } = await query;

    if (comprasError) {
      console.error("Error al cargar historial de compras:", comprasError);
      alert(
        `No se pudo cargar el historial de compras.\n\nCódigo: ${comprasError.code}\nMensaje: ${comprasError.message}`
      );
      setLoading(false);
      return;
    }

    const { data: resumenData, error: resumenError } = await supabase
      .from("v_resumen_compras_insumo")
      .select("*")
      .order("ultima_compra", { ascending: false });

    if (resumenError) {
      console.error("Error al cargar resumen de compras:", resumenError);
    }

    setCompras(comprasData || []);
    setResumenes(resumenData || []);
    setLoading(false);
  }

  function validarFormulario() {
    if (!form.insumo_id.trim()) {
      alert("Debes ingresar un código o identificador del insumo.");
      return false;
    }

    if (!form.insumo_nombre.trim()) {
      alert("Debes ingresar el nombre del insumo.");
      return false;
    }

    if (!form.proveedor.trim()) {
      alert("Debes ingresar el proveedor.");
      return false;
    }

    if (!form.fecha_compra) {
      alert("Debes ingresar la fecha de compra.");
      return false;
    }

    const cantidad = Number(form.cantidad);
    const precio = Number(form.precio_unitario);

    if (Number.isNaN(cantidad) || cantidad <= 0) {
      alert("La cantidad debe ser mayor a cero.");
      return false;
    }

    if (Number.isNaN(precio) || precio < 0) {
      alert("El precio unitario debe ser mayor o igual a cero.");
      return false;
    }

    return true;
  }

  async function registrarCompra(e: React.FormEvent) {
    e.preventDefault();

    if (!validarFormulario()) return;

    setGuardando(true);

    const { error } = await supabase.rpc("registrar_compra_insumo", {
      p_insumo_id: form.insumo_id.trim(),
      p_insumo_nombre: form.insumo_nombre.trim(),
      p_proveedor: form.proveedor.trim(),
      p_fecha_compra: form.fecha_compra,
      p_cantidad: Number(form.cantidad),
      p_unidad_medida: form.unidad_medida,
      p_precio_unitario: Number(form.precio_unitario),
      p_documento_referencia: form.documento_referencia.trim() || null,
      p_observacion: form.observacion.trim() || null,
    });

    if (error) {
      console.error("Error al registrar compra:", error);
      alert(
        `No se pudo registrar la compra.\n\nCódigo: ${error.code}\nMensaje: ${error.message}`
      );
      setGuardando(false);
      return;
    }

    setForm({
      ...formInicial,
      fecha_compra: new Date().toISOString().slice(0, 10),
    });

    await cargarDatos();
    setGuardando(false);
  }

  function formatoCLP(valor: number | null | undefined) {
    if (valor === null || valor === undefined) return "-";

    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(valor));
  }

  function formatoNumero(valor: number | null | undefined) {
    if (valor === null || valor === undefined) return "-";

    return new Intl.NumberFormat("es-CL", {
      maximumFractionDigits: 2,
    }).format(Number(valor));
  }

  function formatoPorcentaje(valor: number | null | undefined) {
    if (valor === null || valor === undefined) return "-";
    return `${Number(valor).toFixed(2)}%`;
  }

  function colorVariacion(valor: number | null) {
    if (valor === null || valor === undefined) return "";
    if (valor > 0) return "text-danger";
    if (valor < 0) return "text-success";
    return "";
  }

  return (
    <div className="page">
      <h1>Historial de Compras por Insumo</h1>

      <p>
        Registra las compras realizadas por insumo, proveedor, fecha, cantidad y
        precio. El sistema calculará automáticamente el precio anterior y la
        variación de costo respecto de la última compra registrada.
      </p>

      <section className="card" style={{ marginBottom: "24px" }}>
        <h2>Registrar nueva compra</h2>

        <form onSubmit={registrarCompra}>
          <div className="form-grid">
            <div className="field">
              <label>Código o ID del insumo</label>
              <input
                value={form.insumo_id}
                onChange={(e) =>
                  setForm({ ...form, insumo_id: e.target.value })
                }
                placeholder="Ej: INS-001 o aceite_almendras"
              />
              <small>
                Usa un identificador estable para que el sistema pueda comparar
                compras históricas del mismo insumo.
              </small>
            </div>

            <div className="field">
              <label>Nombre del insumo</label>
              <input
                value={form.insumo_nombre}
                onChange={(e) =>
                  setForm({ ...form, insumo_nombre: e.target.value })
                }
                placeholder="Ej: Aceite de almendras"
              />
            </div>

            <div className="field">
              <label>Proveedor</label>
              <input
                value={form.proveedor}
                onChange={(e) =>
                  setForm({ ...form, proveedor: e.target.value })
                }
                placeholder="Ej: Proveedor Cosmético Norte"
              />
            </div>

            <div className="field">
              <label>Fecha de compra</label>
              <input
                type="date"
                value={form.fecha_compra}
                onChange={(e) =>
                  setForm({ ...form, fecha_compra: e.target.value })
                }
              />
            </div>

            <div className="field">
              <label>Cantidad comprada</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={form.cantidad}
                onChange={(e) =>
                  setForm({ ...form, cantidad: e.target.value })
                }
                placeholder="Ej: 5"
              />
            </div>

            <div className="field">
              <label>Unidad de medida</label>
              <select
                value={form.unidad_medida}
                onChange={(e) =>
                  setForm({ ...form, unidad_medida: e.target.value })
                }
              >
                {unidades.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Precio unitario</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.precio_unitario}
                onChange={(e) =>
                  setForm({ ...form, precio_unitario: e.target.value })
                }
                placeholder="Ej: 8500"
              />
              <small>
                Ingresa el precio por unidad, litro, kilo, gramo o formato
                correspondiente.
              </small>
            </div>

            <div className="field">
              <label>Documento de referencia</label>
              <input
                value={form.documento_referencia}
                onChange={(e) =>
                  setForm({
                    ...form,
                    documento_referencia: e.target.value,
                  })
                }
                placeholder="Ej: Factura 001, boleta, OC"
              />
            </div>

            <div className="field full">
              <label>Observación</label>
              <textarea
                value={form.observacion}
                onChange={(e) =>
                  setForm({ ...form, observacion: e.target.value })
                }
                placeholder="Ej: compra urgente, cambio de proveedor, promoción o comentario relevante."
              />
            </div>
          </div>

          <div className="actions">
            <button type="submit" disabled={guardando}>
              {guardando ? "Registrando..." : "Registrar compra"}
            </button>
          </div>
        </form>
      </section>

      <section className="card" style={{ marginBottom: "24px" }}>
        <div className="section-header">
          <div>
            <h2>Resumen por insumo</h2>
            <p>
              Permite ver el último precio, proveedor, cantidad total comprada y
              rango histórico de precios.
            </p>
          </div>

          <input
            value={filtroInsumo}
            onChange={(e) => setFiltroInsumo(e.target.value)}
            placeholder="Buscar insumo o proveedor..."
          />
        </div>

        {resumenes.length === 0 ? (
          <p>No hay resumen de compras disponible.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th>Compras</th>
                  <th>Última compra</th>
                  <th>Último proveedor</th>
                  <th>Último precio</th>
                  <th>Precio mínimo</th>
                  <th>Precio máximo</th>
                  <th>Promedio</th>
                  <th>Monto total</th>
                </tr>
              </thead>

              <tbody>
                {resumenes.map((item) => (
                  <tr key={item.insumo_id}>
                    <td>
                      <strong>{item.insumo_nombre}</strong>
                      <div className="muted">{item.insumo_id}</div>
                    </td>
                    <td>{item.total_compras}</td>
                    <td>{item.ultima_compra || "-"}</td>
                    <td>{item.ultimo_proveedor || "-"}</td>
                    <td>{formatoCLP(item.ultimo_precio_unitario)}</td>
                    <td>{formatoCLP(item.precio_minimo)}</td>
                    <td>{formatoCLP(item.precio_maximo)}</td>
                    <td>{formatoCLP(item.precio_promedio)}</td>
                    <td>{formatoCLP(item.monto_total_comprado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Historial detallado</h2>

        {loading ? (
          <p>Cargando historial...</p>
        ) : compras.length === 0 ? (
          <p>No hay compras registradas para este filtro.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Insumo</th>
                  <th>Proveedor</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Precio anterior</th>
                  <th>Variación $</th>
                  <th>Variación %</th>
                  <th>Total</th>
                  <th>Documento</th>
                </tr>
              </thead>

              <tbody>
                {compras.map((compra) => (
                  <tr key={compra.id}>
                    <td>{compra.fecha_compra}</td>
                    <td>
                      <strong>{compra.insumo_nombre}</strong>
                      <div className="muted">{compra.insumo_id}</div>
                      {compra.observacion && (
                        <div className="muted">{compra.observacion}</div>
                      )}
                    </td>
                    <td>{compra.proveedor}</td>
                    <td>
                      {formatoNumero(compra.cantidad)} {compra.unidad_medida}
                    </td>
                    <td>{formatoCLP(compra.precio_unitario)}</td>
                    <td>{formatoCLP(compra.precio_unitario_anterior)}</td>
                    <td className={colorVariacion(compra.variacion_precio_abs)}>
                      {formatoCLP(compra.variacion_precio_abs)}
                    </td>
                    <td className={colorVariacion(compra.variacion_precio_pct)}>
                      {formatoPorcentaje(compra.variacion_precio_pct)}
                    </td>
                    <td>{formatoCLP(compra.precio_total)}</td>
                    <td>{compra.documento_referencia || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}