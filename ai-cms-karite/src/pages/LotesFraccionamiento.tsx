import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";

type EstadoLote =
  | "recepcionado"
  | "bodega"
  | "laboratorio"
  | "fraccionado"
  | "etiquetado"
  | "sala_ventas"
  | "cerrado";

type LoteInsumo = {
  id: string;
  codigo_lote: string;
  insumo_id: string;
  insumo_nombre: string;
  proveedor: string | null;
  fecha_recepcion: string;
  cantidad_recibida: number;
  cantidad_disponible: number;
  unidad_medida: string;
  costo_unitario: number | null;
  estado: EstadoLote;
  fecha_vencimiento: string | null;
  observacion: string | null;
  created_at: string;
};

type ComponenteCosto = {
  id: string;
  nombre: string;
  categoria: string;
  unidad_medida: string;
  costo_unitario: number;
};

type MovimientoLote = {
  id: string;
  lote_id: string;
  etapa_origen: string | null;
  etapa_destino: string;
  cantidad_movida: number | null;
  responsable: string | null;
  motivo: string | null;
  observacion: string | null;
  created_at: string;
};

type TrazabilidadLote = {
  lote_id: string;
  codigo_lote: string;
  insumo_id: string;
  insumo_nombre: string;
  proveedor: string | null;
  fecha_recepcion: string;
  cantidad_recibida: number;
  cantidad_disponible: number;
  unidad_medida: string;
  costo_unitario: number | null;
  estado_lote: string;
  fraccionamiento_id: string | null;
  codigo_lote_producto_final: string | null;
  producto_id: string | null;
  producto_nombre: string | null;
  cantidad_usada_origen: number | null;
  formato_final: number | null;
  unidad_formato: string | null;
  unidades_generadas: number | null;
  costo_empaque_unitario: number | null;
  costo_empaque_total: number | null;
  estado_producto_final: string | null;
  fecha_fraccionamiento: string | null;
};

const estadosLote: { value: EstadoLote; label: string }[] = [
  { value: "recepcionado", label: "Recepcionado" },
  { value: "bodega", label: "Bodega" },
  { value: "laboratorio", label: "Laboratorio" },
  { value: "fraccionado", label: "Fraccionado" },
  { value: "etiquetado", label: "Etiquetado" },
  { value: "sala_ventas", label: "Sala de ventas" },
  { value: "cerrado", label: "Cerrado" },
];

const unidades = ["unidad", "g", "kg", "ml", "l"];

const formLoteInicial = {
  codigo_lote: "",
  insumo_id: "",
  insumo_nombre: "",
  proveedor: "",
  fecha_recepcion: new Date().toISOString().slice(0, 10),
  cantidad_recibida: "",
  unidad_medida: "unidad",
  costo_unitario: "",
  estado: "recepcionado" as EstadoLote,
  fecha_vencimiento: "",
  observacion: "",
};

const formMovimientoInicial = {
  lote_id: "",
  etapa_destino: "bodega" as EstadoLote,
  cantidad_movida: "",
  responsable: "",
  motivo: "",
  observacion: "",
};

const formFraccionamientoInicial = {
  lote_origen_id: "",
  codigo_lote_producto_final: "",
  producto_id: "",
  producto_nombre: "",
  cantidad_usada_origen: "",
  unidad_origen: "unidad",
  formato_final: "",
  unidad_formato: "ml",
  unidades_generadas: "",
  envase_componente_id: "",
  etiqueta_componente_id: "",
  embalaje_componente_id: "",
  responsable: "",
  observacion: "",
};

export default function LotesDeFraccionamiento() {
  const [lotes, setLotes] = useState<LoteInsumo[]>([]);
  const [componentes, setComponentes] = useState<ComponenteCosto[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoLote[]>([]);
  const [trazabilidad, setTrazabilidad] = useState<TrazabilidadLote[]>([]);

  const [loading, setLoading] = useState(true);
  const [guardandoLote, setGuardandoLote] = useState(false);
  const [moviendoLote, setMoviendoLote] = useState(false);
  const [fraccionando, setFraccionando] = useState(false);

  const [formLote, setFormLote] = useState(formLoteInicial);
  const [formMovimiento, setFormMovimiento] = useState(formMovimientoInicial);
  const [formFraccionamiento, setFormFraccionamiento] = useState(
    formFraccionamientoInicial
  );

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setLoading(true);

    const { data: lotesData, error: lotesError } = await supabase
      .from("lotes_insumo")
      .select("*")
      .order("created_at", { ascending: false });

    if (lotesError) {
      console.error("Error al cargar lotes:", lotesError);
      alert(`No se pudieron cargar los lotes.\n\n${lotesError.message}`);
      setLoading(false);
      return;
    }

    const { data: componentesData, error: componentesError } = await supabase
      .from("componentes_costo")
      .select("id,nombre,categoria,unidad_medida,costo_unitario")
      .in("categoria", ["envase", "etiqueta", "embalaje"])
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (componentesError) {
      console.error("Error al cargar componentes:", componentesError);
    }

    const { data: movimientosData, error: movimientosError } = await supabase
      .from("movimientos_lote")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (movimientosError) {
      console.error("Error al cargar movimientos:", movimientosError);
    }

    const { data: trazabilidadData, error: trazabilidadError } = await supabase
      .from("v_trazabilidad_lotes")
      .select("*")
      .order("fecha_recepcion", { ascending: false });

    if (trazabilidadError) {
      console.error("Error al cargar trazabilidad:", trazabilidadError);
    }

    setLotes(lotesData || []);
    setComponentes(componentesData || []);
    setMovimientos(movimientosData || []);
    setTrazabilidad(trazabilidadData || []);
    setLoading(false);
  }

  async function registrarLote(e: FormEvent) {
    e.preventDefault();

    if (!formLote.codigo_lote.trim()) {
      alert("Debes ingresar el código del lote.");
      return;
    }

    if (!formLote.insumo_id.trim()) {
      alert("Debes ingresar el ID o código del insumo.");
      return;
    }

    if (!formLote.insumo_nombre.trim()) {
      alert("Debes ingresar el nombre del insumo.");
      return;
    }

    const cantidad = Number(formLote.cantidad_recibida);
    const costo = Number(formLote.costo_unitario || 0);

    if (Number.isNaN(cantidad) || cantidad <= 0) {
      alert("La cantidad recibida debe ser mayor a cero.");
      return;
    }

    if (Number.isNaN(costo) || costo < 0) {
      alert("El costo unitario debe ser mayor o igual a cero.");
      return;
    }

    setGuardandoLote(true);

    const { error } = await supabase.from("lotes_insumo").insert({
      codigo_lote: formLote.codigo_lote.trim(),
      insumo_id: formLote.insumo_id.trim(),
      insumo_nombre: formLote.insumo_nombre.trim(),
      proveedor: formLote.proveedor.trim() || null,
      fecha_recepcion: formLote.fecha_recepcion,
      cantidad_recibida: cantidad,
      cantidad_disponible: cantidad,
      unidad_medida: formLote.unidad_medida,
      costo_unitario: costo,
      estado: formLote.estado,
      fecha_vencimiento: formLote.fecha_vencimiento || null,
      observacion: formLote.observacion.trim() || null,
    });

    if (error) {
      console.error("Error al registrar lote:", error);
      alert(`No se pudo registrar el lote.\n\n${error.message}`);
      setGuardandoLote(false);
      return;
    }

    setFormLote(formLoteInicial);
    await cargarDatos();
    setGuardandoLote(false);
  }

  async function moverLote(e: FormEvent) {
    e.preventDefault();

    if (!formMovimiento.lote_id) {
      alert("Debes seleccionar un lote.");
      return;
    }

    setMoviendoLote(true);

    const cantidadMovida = formMovimiento.cantidad_movida
      ? Number(formMovimiento.cantidad_movida)
      : null;

    const { error } = await supabase.rpc("mover_lote_insumo", {
      p_lote_id: formMovimiento.lote_id,
      p_etapa_destino: formMovimiento.etapa_destino,
      p_cantidad_movida: cantidadMovida,
      p_responsable: formMovimiento.responsable.trim() || null,
      p_motivo: formMovimiento.motivo.trim() || null,
      p_observacion: formMovimiento.observacion.trim() || null,
    });

    if (error) {
      console.error("Error al mover lote:", error);
      alert(`No se pudo mover el lote.\n\n${error.message}`);
      setMoviendoLote(false);
      return;
    }

    setFormMovimiento(formMovimientoInicial);
    await cargarDatos();
    setMoviendoLote(false);
  }

  async function registrarFraccionamiento(e: FormEvent) {
    e.preventDefault();

    if (!formFraccionamiento.lote_origen_id) {
      alert("Debes seleccionar el lote origen.");
      return;
    }

    if (!formFraccionamiento.codigo_lote_producto_final.trim()) {
      alert("Debes ingresar el código del lote de producto final.");
      return;
    }

    if (!formFraccionamiento.producto_id.trim()) {
      alert("Debes ingresar el ID o código del producto final.");
      return;
    }

    if (!formFraccionamiento.producto_nombre.trim()) {
      alert("Debes ingresar el nombre del producto final.");
      return;
    }

    const cantidadUsada = Number(formFraccionamiento.cantidad_usada_origen);
    const formatoFinal = Number(formFraccionamiento.formato_final);
    const unidadesGeneradas = Number(formFraccionamiento.unidades_generadas);

    if (Number.isNaN(cantidadUsada) || cantidadUsada <= 0) {
      alert("La cantidad usada del lote origen debe ser mayor a cero.");
      return;
    }

    if (Number.isNaN(formatoFinal) || formatoFinal <= 0) {
      alert("El formato final debe ser mayor a cero.");
      return;
    }

    if (
      Number.isNaN(unidadesGeneradas) ||
      !Number.isInteger(unidadesGeneradas) ||
      unidadesGeneradas <= 0
    ) {
      alert("Las unidades generadas deben ser un número entero mayor a cero.");
      return;
    }

    setFraccionando(true);

    const { error } = await supabase.rpc("registrar_fraccionamiento_lote", {
      p_lote_origen_id: formFraccionamiento.lote_origen_id,
      p_codigo_lote_producto_final:
        formFraccionamiento.codigo_lote_producto_final.trim(),
      p_producto_id: formFraccionamiento.producto_id.trim(),
      p_producto_nombre: formFraccionamiento.producto_nombre.trim(),
      p_cantidad_usada_origen: cantidadUsada,
      p_unidad_origen: formFraccionamiento.unidad_origen,
      p_formato_final: formatoFinal,
      p_unidad_formato: formFraccionamiento.unidad_formato,
      p_unidades_generadas: unidadesGeneradas,
      p_envase_componente_id:
        formFraccionamiento.envase_componente_id || null,
      p_etiqueta_componente_id:
        formFraccionamiento.etiqueta_componente_id || null,
      p_embalaje_componente_id:
        formFraccionamiento.embalaje_componente_id || null,
      p_responsable: formFraccionamiento.responsable.trim() || null,
      p_observacion: formFraccionamiento.observacion.trim() || null,
    });

    if (error) {
      console.error("Error al registrar fraccionamiento:", error);
      alert(`No se pudo registrar el fraccionamiento.\n\n${error.message}`);
      setFraccionando(false);
      return;
    }

    setFormFraccionamiento(formFraccionamientoInicial);
    await cargarDatos();
    setFraccionando(false);
  }

  function seleccionarLoteParaFraccionar(loteId: string) {
    const lote = lotes.find((item) => item.id === loteId);

    setFormFraccionamiento({
      ...formFraccionamiento,
      lote_origen_id: loteId,
      unidad_origen: lote?.unidad_medida || "unidad",
    });
  }

  function componentesPorCategoria(categoria: string) {
    return componentes.filter((item) => item.categoria === categoria);
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

  function nombreEstado(estado: string | null | undefined) {
    if (!estado) return "-";
    return estadosLote.find((item) => item.value === estado)?.label || estado;
  }

  return (
    <div className="page">
      <h1>Lotes y Fraccionamiento</h1>

      <p>
        Este módulo permite reflejar el flujo operativo de Karité: recepción,
        bodega, laboratorio, fraccionamiento, etiquetado y traslado a sala de
        ventas. Además permite asociar costos de envase, etiqueta y embalaje al
        producto final.
      </p>

      <section className="card" style={{ marginBottom: "24px" }}>
        <h2>1. Registrar lote recibido</h2>

        <form onSubmit={registrarLote}>
          <div className="form-grid">
            <div className="field">
              <label>Código de lote</label>
              <input
                value={formLote.codigo_lote}
                onChange={(e) =>
                  setFormLote({ ...formLote, codigo_lote: e.target.value })
                }
                placeholder="Ej: LOT-2026-0001"
              />
              <small>
                Código interno para identificar la recepción del insumo o
                materia prima.
              </small>
            </div>

            <div className="field">
              <label>ID del insumo</label>
              <input
                value={formLote.insumo_id}
                onChange={(e) =>
                  setFormLote({ ...formLote, insumo_id: e.target.value })
                }
                placeholder="Ej: INS-001"
              />
            </div>

            <div className="field">
              <label>Nombre del insumo</label>
              <input
                value={formLote.insumo_nombre}
                onChange={(e) =>
                  setFormLote({ ...formLote, insumo_nombre: e.target.value })
                }
                placeholder="Ej: Aceite de almendras"
              />
            </div>

            <div className="field">
              <label>Proveedor</label>
              <input
                value={formLote.proveedor}
                onChange={(e) =>
                  setFormLote({ ...formLote, proveedor: e.target.value })
                }
                placeholder="Ej: Proveedor Cosmético Norte"
              />
            </div>

            <div className="field">
              <label>Fecha recepción</label>
              <input
                type="date"
                value={formLote.fecha_recepcion}
                onChange={(e) =>
                  setFormLote({
                    ...formLote,
                    fecha_recepcion: e.target.value,
                  })
                }
              />
            </div>

            <div className="field">
              <label>Cantidad recibida</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={formLote.cantidad_recibida}
                onChange={(e) =>
                  setFormLote({
                    ...formLote,
                    cantidad_recibida: e.target.value,
                  })
                }
                placeholder="Ej: 20"
              />
            </div>

            <div className="field">
              <label>Unidad</label>
              <select
                value={formLote.unidad_medida}
                onChange={(e) =>
                  setFormLote({ ...formLote, unidad_medida: e.target.value })
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
              <label>Costo unitario</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formLote.costo_unitario}
                onChange={(e) =>
                  setFormLote({ ...formLote, costo_unitario: e.target.value })
                }
                placeholder="Ej: 8500"
              />
            </div>

            <div className="field">
              <label>Estado inicial</label>
              <select
                value={formLote.estado}
                onChange={(e) =>
                  setFormLote({
                    ...formLote,
                    estado: e.target.value as EstadoLote,
                  })
                }
              >
                {estadosLote.map((estado) => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Fecha vencimiento</label>
              <input
                type="date"
                value={formLote.fecha_vencimiento}
                onChange={(e) =>
                  setFormLote({
                    ...formLote,
                    fecha_vencimiento: e.target.value,
                  })
                }
              />
            </div>

            <div className="field full">
              <label>Observación</label>
              <textarea
                value={formLote.observacion}
                onChange={(e) =>
                  setFormLote({ ...formLote, observacion: e.target.value })
                }
                placeholder="Ej: lote recibido, pendiente de revisión, compra urgente, etc."
              />
            </div>
          </div>

          <div className="actions">
            <button type="submit" disabled={guardandoLote}>
              {guardandoLote ? "Guardando..." : "Registrar lote"}
            </button>
          </div>
        </form>
      </section>

      <section className="card" style={{ marginBottom: "24px" }}>
        <h2>2. Mover lote entre etapas</h2>

        <form onSubmit={moverLote}>
          <div className="form-grid">
            <div className="field">
              <label>Lote</label>
              <select
                value={formMovimiento.lote_id}
                onChange={(e) =>
                  setFormMovimiento({
                    ...formMovimiento,
                    lote_id: e.target.value,
                  })
                }
              >
                <option value="">Seleccionar lote</option>
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {lote.codigo_lote} · {lote.insumo_nombre} ·{" "}
                    {nombreEstado(lote.estado)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Etapa destino</label>
              <select
                value={formMovimiento.etapa_destino}
                onChange={(e) =>
                  setFormMovimiento({
                    ...formMovimiento,
                    etapa_destino: e.target.value as EstadoLote,
                  })
                }
              >
                {estadosLote.map((estado) => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Cantidad movida</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={formMovimiento.cantidad_movida}
                onChange={(e) =>
                  setFormMovimiento({
                    ...formMovimiento,
                    cantidad_movida: e.target.value,
                  })
                }
                placeholder="Opcional"
              />
            </div>

            <div className="field">
              <label>Responsable</label>
              <input
                value={formMovimiento.responsable}
                onChange={(e) =>
                  setFormMovimiento({
                    ...formMovimiento,
                    responsable: e.target.value,
                  })
                }
                placeholder="Ej: Administradora Karité"
              />
            </div>

            <div className="field">
              <label>Motivo</label>
              <input
                value={formMovimiento.motivo}
                onChange={(e) =>
                  setFormMovimiento({
                    ...formMovimiento,
                    motivo: e.target.value,
                  })
                }
                placeholder="Ej: ingreso a laboratorio"
              />
            </div>

            <div className="field full">
              <label>Observación</label>
              <textarea
                value={formMovimiento.observacion}
                onChange={(e) =>
                  setFormMovimiento({
                    ...formMovimiento,
                    observacion: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="actions">
            <button type="submit" disabled={moviendoLote}>
              {moviendoLote ? "Moviendo..." : "Mover lote"}
            </button>
          </div>
        </form>
      </section>

      <section className="card" style={{ marginBottom: "24px" }}>
        <h2>3. Registrar fraccionamiento y etiquetado</h2>

        <form onSubmit={registrarFraccionamiento}>
          <div className="form-grid">
            <div className="field">
              <label>Lote origen</label>
              <select
                value={formFraccionamiento.lote_origen_id}
                onChange={(e) => seleccionarLoteParaFraccionar(e.target.value)}
              >
                <option value="">Seleccionar lote</option>
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {lote.codigo_lote} · {lote.insumo_nombre} · Disponible:{" "}
                    {formatoNumero(lote.cantidad_disponible)}{" "}
                    {lote.unidad_medida}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Lote producto final</label>
              <input
                value={formFraccionamiento.codigo_lote_producto_final}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    codigo_lote_producto_final: e.target.value,
                  })
                }
                placeholder="Ej: LOT-PF-2026-0001"
              />
            </div>

            <div className="field">
              <label>ID producto final</label>
              <input
                value={formFraccionamiento.producto_id}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    producto_id: e.target.value,
                  })
                }
                placeholder="Ej: PROD-ACEITE-250"
              />
            </div>

            <div className="field">
              <label>Nombre producto final</label>
              <input
                value={formFraccionamiento.producto_nombre}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    producto_nombre: e.target.value,
                  })
                }
                placeholder="Ej: Aceite de almendras 250 ml"
              />
            </div>

            <div className="field">
              <label>Cantidad usada del lote origen</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={formFraccionamiento.cantidad_usada_origen}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    cantidad_usada_origen: e.target.value,
                  })
                }
                placeholder="Ej: 10"
              />
            </div>

            <div className="field">
              <label>Unidad origen</label>
              <select
                value={formFraccionamiento.unidad_origen}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    unidad_origen: e.target.value,
                  })
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
              <label>Formato final</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={formFraccionamiento.formato_final}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    formato_final: e.target.value,
                  })
                }
                placeholder="Ej: 250"
              />
            </div>

            <div className="field">
              <label>Unidad formato</label>
              <select
                value={formFraccionamiento.unidad_formato}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    unidad_formato: e.target.value,
                  })
                }
              >
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="unidad">unidad</option>
              </select>
            </div>

            <div className="field">
              <label>Unidades generadas</label>
              <input
                type="number"
                min="1"
                step="1"
                value={formFraccionamiento.unidades_generadas}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    unidades_generadas: e.target.value,
                  })
                }
                placeholder="Ej: 40"
              />
            </div>

            <div className="field">
              <label>Envase</label>
              <select
                value={formFraccionamiento.envase_componente_id}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    envase_componente_id: e.target.value,
                  })
                }
              >
                <option value="">Sin envase asociado</option>
                {componentesPorCategoria("envase").map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.nombre} · {formatoCLP(comp.costo_unitario)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Etiqueta</label>
              <select
                value={formFraccionamiento.etiqueta_componente_id}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    etiqueta_componente_id: e.target.value,
                  })
                }
              >
                <option value="">Sin etiqueta asociada</option>
                {componentesPorCategoria("etiqueta").map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.nombre} · {formatoCLP(comp.costo_unitario)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Embalaje</label>
              <select
                value={formFraccionamiento.embalaje_componente_id}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    embalaje_componente_id: e.target.value,
                  })
                }
              >
                <option value="">Sin embalaje asociado</option>
                {componentesPorCategoria("embalaje").map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.nombre} · {formatoCLP(comp.costo_unitario)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Responsable</label>
              <input
                value={formFraccionamiento.responsable}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    responsable: e.target.value,
                  })
                }
                placeholder="Ej: Administradora Karité"
              />
            </div>

            <div className="field full">
              <label>Observación</label>
              <textarea
                value={formFraccionamiento.observacion}
                onChange={(e) =>
                  setFormFraccionamiento({
                    ...formFraccionamiento,
                    observacion: e.target.value,
                  })
                }
                placeholder="Ej: lote fraccionado, pendiente de etiquetado, enviado a sala de ventas, etc."
              />
            </div>
          </div>

          <div className="actions">
            <button type="submit" disabled={fraccionando}>
              {fraccionando
                ? "Registrando..."
                : "Registrar fraccionamiento"}
            </button>
          </div>
        </form>
      </section>

      <section className="card" style={{ marginBottom: "24px" }}>
        <h2>4. Trazabilidad completa</h2>

        {loading ? (
          <p>Cargando trazabilidad...</p>
        ) : trazabilidad.length === 0 ? (
          <p>No hay trazabilidad registrada.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lote origen</th>
                  <th>Insumo</th>
                  <th>Estado lote</th>
                  <th>Disponible</th>
                  <th>Producto final</th>
                  <th>Lote producto final</th>
                  <th>Unidades</th>
                  <th>Costo empaque unitario</th>
                  <th>Costo empaque total</th>
                </tr>
              </thead>

              <tbody>
                {trazabilidad.map((item, index) => (
                  <tr key={`${item.lote_id}-${item.fraccionamiento_id || index}`}>
                    <td>
                      <strong>{item.codigo_lote}</strong>
                      <div className="muted">{item.fecha_recepcion}</div>
                    </td>
                    <td>
                      {item.insumo_nombre}
                      <div className="muted">{item.proveedor || "-"}</div>
                    </td>
                    <td>{nombreEstado(item.estado_lote)}</td>
                    <td>
                      {formatoNumero(item.cantidad_disponible)}{" "}
                      {item.unidad_medida}
                    </td>
                    <td>{item.producto_nombre || "-"}</td>
                    <td>{item.codigo_lote_producto_final || "-"}</td>
                    <td>{item.unidades_generadas || "-"}</td>
                    <td>{formatoCLP(item.costo_empaque_unitario)}</td>
                    <td>{formatoCLP(item.costo_empaque_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Últimos movimientos de lote</h2>

        {movimientos.length === 0 ? (
          <p>No hay movimientos registrados.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Cantidad</th>
                  <th>Responsable</th>
                  <th>Motivo</th>
                  <th>Observación</th>
                </tr>
              </thead>

              <tbody>
                {movimientos.map((mov) => (
                  <tr key={mov.id}>
                    <td>{new Date(mov.created_at).toLocaleString("es-CL")}</td>
                    <td>{nombreEstado(mov.etapa_origen)}</td>
                    <td>{nombreEstado(mov.etapa_destino)}</td>
                    <td>{formatoNumero(mov.cantidad_movida)}</td>
                    <td>{mov.responsable || "-"}</td>
                    <td>{mov.motivo || "-"}</td>
                    <td>{mov.observacion || "-"}</td>
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