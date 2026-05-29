import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type CategoriaCosto =
  | "materia_prima"
  | "envase"
  | "etiqueta"
  | "embalaje"
  | "mano_obra"
  | "transporte"
  | "electricidad"
  | "agua"
  | "costo_indirecto"
  | "otro";

type UnidadMedida =
  | "unidad"
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "hora"
  | "lote"
  | "porcentaje";

type ComponenteCosto = {
  id: string;
  nombre: string;
  categoria: CategoriaCosto;
  unidad_medida: UnidadMedida;
  costo_unitario: number;
  afecta_stock: boolean;
  es_variable: boolean;
  observacion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

const categorias: { value: CategoriaCosto; label: string }[] = [
  { value: "materia_prima", label: "Materia prima" },
  { value: "envase", label: "Envase" },
  { value: "etiqueta", label: "Etiqueta" },
  { value: "embalaje", label: "Embalaje" },
  { value: "mano_obra", label: "Mano de obra" },
  { value: "transporte", label: "Transporte" },
  { value: "electricidad", label: "Electricidad" },
  { value: "agua", label: "Agua" },
  { value: "costo_indirecto", label: "Costo indirecto" },
  { value: "otro", label: "Otro" },
];

const unidades: UnidadMedida[] = [
  "unidad",
  "g",
  "kg",
  "ml",
  "l",
  "hora",
  "lote",
  "porcentaje",
];

const formInicial = {
  nombre: "",
  categoria: "envase" as CategoriaCosto,
  unidad_medida: "unidad" as UnidadMedida,
  costo_unitario: "",
  afecta_stock: false,
  es_variable: true,
  observacion: "",
};

export default function ComponentesCosto() {
  const [componentes, setComponentes] = useState<ComponenteCosto[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    cargarComponentes();
  }, [filtroCategoria, mostrarInactivos]);

  async function cargarComponentes() {
    setLoading(true);

    let query = supabase
      .from("componentes_costo")
      .select("*")
      .order("created_at", { ascending: false });

    if (filtroCategoria !== "todas") {
      query = query.eq("categoria", filtroCategoria);
    }

    if (!mostrarInactivos) {
      query = query.eq("activo", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al cargar componentes de costo:", error);
      alert(
        `No se pudieron cargar los componentes de costo.\n\nCódigo: ${error.code}\nMensaje: ${error.message}`
      );
      setLoading(false);
      return;
    }

    setComponentes(data || []);
    setLoading(false);
  }

  function limpiarFormulario() {
    setForm(formInicial);
    setEditandoId(null);
  }

  function validarFormulario() {
    if (!form.nombre.trim()) {
      alert("Debes ingresar el nombre del componente de costo.");
      return false;
    }

    const costo = Number(form.costo_unitario);

    if (Number.isNaN(costo) || costo < 0) {
      alert("El costo unitario debe ser un número mayor o igual a cero.");
      return false;
    }

    return true;
  }

  async function guardarComponente(e: React.FormEvent) {
    e.preventDefault();

    if (!validarFormulario()) return;

    setGuardando(true);

    const payload = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      unidad_medida: form.unidad_medida,
      costo_unitario: Number(form.costo_unitario),
      afecta_stock: form.afecta_stock,
      es_variable: form.es_variable,
      observacion: form.observacion.trim() || null,
      activo: true,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("componentes_costo")
        .update(payload)
        .eq("id", editandoId);

      if (error) {
        console.error("Error al actualizar componente:", error);
        alert(
          `No se pudo actualizar el componente.\n\nCódigo: ${error.code}\nMensaje: ${error.message}`
        );
        setGuardando(false);
        return;
      }
    } else {
      const { error } = await supabase.from("componentes_costo").insert(payload);

      if (error) {
        console.error("Error al crear componente:", error);
        alert(
          `No se pudo crear el componente.\n\nCódigo: ${error.code}\nMensaje: ${error.message}`
        );
        setGuardando(false);
        return;
      }
    }

    limpiarFormulario();
    await cargarComponentes();
    setGuardando(false);
  }

  function editarComponente(componente: ComponenteCosto) {
    setEditandoId(componente.id);
    setForm({
      nombre: componente.nombre,
      categoria: componente.categoria,
      unidad_medida: componente.unidad_medida,
      costo_unitario: String(componente.costo_unitario),
      afecta_stock: componente.afecta_stock,
      es_variable: componente.es_variable,
      observacion: componente.observacion || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function cambiarEstado(id: string, activo: boolean) {
    const { error } = await supabase
      .from("componentes_costo")
      .update({ activo })
      .eq("id", id);

    if (error) {
      console.error("Error al cambiar estado del componente:", error);
      alert("No se pudo cambiar el estado del componente.");
      return;
    }

    await cargarComponentes();
  }

  function formatoCLP(valor: number) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(valor || 0));
  }

  function nombreCategoria(categoria: string) {
    return categorias.find((c) => c.value === categoria)?.label || categoria;
  }

  return (
    <div className="page">
      <h1>Componentes de Costo</h1>

      <p>
        Registra los elementos que forman parte del costo real de los productos:
        envases, etiquetas, embalaje, transporte, mano de obra, electricidad,
        agua, costos indirectos y otros componentes.
      </p>

      <section className="card" style={{ marginBottom: "24px" }}>
        <h2>{editandoId ? "Editar componente" : "Nuevo componente de costo"}</h2>

        <form onSubmit={guardarComponente}>
          <div className="form-grid">
            <div className="field">
              <label>Nombre del componente</label>
              <input
                value={form.nombre}
                onChange={(e) =>
                  setForm({ ...form, nombre: e.target.value })
                }
                placeholder="Ej: Frasco 250 ml, Etiqueta 500 ml, Mano de obra preparación"
              />
              <small>
                Usa un nombre claro para identificar el componente dentro de la
                estructura de costos.
              </small>
            </div>

            <div className="field">
              <label>Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) =>
                  setForm({
                    ...form,
                    categoria: e.target.value as CategoriaCosto,
                  })
                }
              >
                {categorias.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <small>
                Clasifica el componente según el tipo de costo que representa.
              </small>
            </div>

            <div className="field">
              <label>Unidad de medida</label>
              <select
                value={form.unidad_medida}
                onChange={(e) =>
                  setForm({
                    ...form,
                    unidad_medida: e.target.value as UnidadMedida,
                  })
                }
              >
                {unidades.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
              <small>
                Define si el costo se mide por unidad, gramos, mililitros, hora,
                lote o porcentaje.
              </small>
            </div>

            <div className="field">
              <label>Costo unitario</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.costo_unitario}
                onChange={(e) =>
                  setForm({ ...form, costo_unitario: e.target.value })
                }
                placeholder="Ej: 260"
              />
              <small>
                Valor asociado a una unidad del componente. Por ejemplo, costo
                de un frasco, una etiqueta o una hora de trabajo.
              </small>
            </div>

            <div className="field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  checked={form.afecta_stock}
                  onChange={(e) =>
                    setForm({ ...form, afecta_stock: e.target.checked })
                  }
                />
                Afecta stock
              </label>
              <small>
                Marca esta opción si el componente debe controlarse como
                inventario físico, por ejemplo envases, etiquetas o embalajes.
              </small>
            </div>

            <div className="field checkbox-field">
              <label>
                <input
                  type="checkbox"
                  checked={form.es_variable}
                  onChange={(e) =>
                    setForm({ ...form, es_variable: e.target.checked })
                  }
                />
                Es costo variable
              </label>
              <small>
                Marca esta opción si el costo cambia según la cantidad producida
                o vendida.
              </small>
            </div>

            <div className="field full">
              <label>Observación</label>
              <textarea
                value={form.observacion}
                onChange={(e) =>
                  setForm({ ...form, observacion: e.target.value })
                }
                placeholder="Ej: Proveedor, condiciones de compra, formato asociado o criterio de cálculo."
              />
            </div>
          </div>

          <div className="actions">
            <button type="submit" disabled={guardando}>
              {guardando
                ? "Guardando..."
                : editandoId
                ? "Actualizar componente"
                : "Crear componente"}
            </button>

            {editandoId && (
              <button type="button" onClick={limpiarFormulario}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>Listado de componentes</h2>
            <p>
              Estos componentes serán utilizados posteriormente para construir la
              estructura de costos de cada producto.
            </p>
          </div>

          <div className="filters">
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="todas">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <label className="check-inline">
              <input
                type="checkbox"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
              />
              Mostrar inactivos
            </label>
          </div>
        </div>

        {loading ? (
          <p>Cargando componentes...</p>
        ) : componentes.length === 0 ? (
          <p>No hay componentes de costo registrados para este filtro.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Unidad</th>
                  <th>Costo unitario</th>
                  <th>Afecta stock</th>
                  <th>Variable</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {componentes.map((comp) => (
                  <tr key={comp.id}>
                    <td>
                      <strong>{comp.nombre}</strong>
                      {comp.observacion && (
                        <div className="muted">{comp.observacion}</div>
                      )}
                    </td>
                    <td>{nombreCategoria(comp.categoria)}</td>
                    <td>{comp.unidad_medida}</td>
                    <td>{formatoCLP(comp.costo_unitario)}</td>
                    <td>{comp.afecta_stock ? "Sí" : "No"}</td>
                    <td>{comp.es_variable ? "Sí" : "No"}</td>
                    <td>{comp.activo ? "Activo" : "Inactivo"}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => editarComponente(comp)}>
                          Editar
                        </button>

                        {comp.activo ? (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(comp.id, false)}
                          >
                            Desactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(comp.id, true)}
                          >
                            Activar
                          </button>
                        )}
                      </div>
                    </td>
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