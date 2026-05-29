import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

type Tab = "guia" | "checklist" | "modulos" | "flujo";

type OnboardingStep = {
  title: string;
  module: string;
  objective: string;
  whyItMatters: string;
  recommendedAction: string;
  path?: string;
  checks: string[];
};

type ChecklistTask = {
  id: string;
  title: string;
  module: string;
  description: string;
  path?: string;
};

type ModuleCard = {
  name: string;
  path?: string;
  purpose: string;
  keyAction: string;
  priority: "Alta" | "Media" | "Baja";
};

type OnboardingStatus = {
  completed: boolean;
  stepIndex: number;
  completedTasks: string[];
};

const STORAGE_KEY = "karite_onboarding_status_v2";

const steps: OnboardingStep[] = [
  {
    title: "Bienvenida al AI-CMS Karité",
    module: "Inicio",
    objective:
      "Entender que el sistema centraliza información de costos, inventario, recetas, producción, ventas y reportes.",
    whyItMatters:
      "El objetivo no es solo registrar datos, sino transformar la información operativa en decisiones útiles para la empresa.",
    recommendedAction:
      "Comienza usando el sistema como apoyo para controlar stock, actualizar costos y revisar alertas.",
    path: "/",
    checks: [
      "Identificar el menú lateral.",
      "Reconocer los módulos principales.",
      "Comprender que el sistema todavía evoluciona desde un MVP hacia un ERP.",
    ],
  },
  {
    title: "Revisar el estado general del negocio",
    module: "Dashboard",
    objective:
      "Usar el Dashboard como primera pantalla de control para revisar indicadores, alertas y movimientos recientes.",
    whyItMatters:
      "Permite detectar rápidamente problemas de stock, movimientos relevantes o situaciones que requieren gestión.",
    recommendedAction:
      "Revisa el Dashboard al iniciar la jornada antes de registrar ventas, compras o producción.",
    path: "/",
    checks: [
      "Revisar indicadores principales.",
      "Detectar alertas visibles.",
      "Identificar si existen productos o insumos críticos.",
    ],
  },
  {
    title: "Registrar y mantener insumos",
    module: "Insumos",
    objective:
      "Mantener actualizadas las materias primas, unidades de medida, costos y stock disponible.",
    whyItMatters:
      "El costo de los insumos impacta directamente el costo real de los productos y el precio sugerido.",
    recommendedAction:
      "Cada vez que cambie el precio de compra de un insumo, actualiza su costo en el sistema.",
    path: "/insumos",
    checks: [
      "Registrar nombre del insumo.",
      "Definir unidad de medida.",
      "Actualizar costo unitario.",
      "Revisar stock disponible.",
    ],
  },
  {
    title: "Administrar productos y formatos",
    module: "Productos",
    objective:
      "Registrar los productos comercializados por Karité y diferenciarlos por formato de venta.",
    whyItMatters:
      "Karité trabaja con múltiples presentaciones, como 100 ml, 250 ml, 500 ml, 1 L y 5 L. Cada formato puede tener costo y precio distinto.",
    recommendedAction:
      "Crea cada formato como producto identificable para facilitar el costeo y el control comercial.",
    path: "/productos",
    checks: [
      "Crear producto con nombre claro.",
      "Diferenciar formato o presentación.",
      "Revisar precio actual.",
      "Confirmar estado activo del producto.",
    ],
  },
  {
    title: "Definir recetas y consumo de insumos",
    module: "Recetas",
    objective:
      "Relacionar cada producto con los insumos que consume y las cantidades utilizadas.",
    whyItMatters:
      "La receta es la base para calcular consumo de materia prima, disponibilidad productiva y costo técnico.",
    recommendedAction:
      "Verifica que cada producto tenga asociada su receta antes de usarlo para producción o costeo.",
    path: "/recetas",
    checks: [
      "Seleccionar producto.",
      "Agregar insumos utilizados.",
      "Definir cantidades.",
      "Revisar que la unidad sea coherente.",
    ],
  },
  {
    title: "Registrar componentes de costo",
    module: "Componentes de Costo",
    objective:
      "Agregar costos que no corresponden solo a materia prima, como envases, etiquetas, embalaje, transporte, mano de obra, electricidad y agua.",
    whyItMatters:
      "Este módulo permite acercarse al costo real completo del producto, no solo al costo de los insumos.",
    recommendedAction:
      "Registra cada componente con su costo unitario y clasifícalo correctamente.",
    path: "/componentes-costo",
    checks: [
      "Registrar envases.",
      "Registrar etiquetas.",
      "Registrar embalaje.",
      "Registrar mano de obra.",
      "Registrar costos indirectos.",
    ],
  },
  {
    title: "Revisar alertas de costos",
    module: "Alertas de Costos",
    objective:
      "Detectar productos afectados cuando cambia el costo de un componente o insumo.",
    whyItMatters:
      "Con un catálogo amplio, revisar manualmente todos los productos sería lento y riesgoso. Las alertas ayudan a priorizar revisión de precios.",
    recommendedAction:
      "Cuando aparezca una alerta pendiente, revisa el producto afectado y define si corresponde actualizar su precio.",
    path: "/alertas-costos",
    checks: [
      "Revisar alertas pendientes.",
      "Identificar componente modificado.",
      "Evaluar impacto en el producto.",
      "Marcar alerta como revisada, aplicada o descartada.",
    ],
  },
  {
    title: "Controlar ventas y movimientos",
    module: "Ventas / Kardex",
    objective:
      "Registrar ventas y revisar movimientos históricos de entrada y salida de stock.",
    whyItMatters:
      "Permite mantener trazabilidad y evitar diferencias entre stock físico y stock registrado.",
    recommendedAction:
      "Después de vender o ajustar stock, revisa el Kardex para validar que el movimiento quedó registrado.",
    path: "/ventas",
    checks: [
      "Registrar venta.",
      "Validar descuento de stock.",
      "Revisar movimiento en Kardex.",
      "Confirmar que el producto vendido existe en el sistema.",
    ],
  },
  {
    title: "Consultar reportes para tomar decisiones",
    module: "Reportes",
    objective:
      "Usar reportes para analizar ventas, stock, costos, productos críticos y tendencias.",
    whyItMatters:
      "Los reportes permiten transformar el registro operativo en información útil para decidir compras, producción y precios.",
    recommendedAction:
      "Revisa reportes al menos una vez por semana para evaluar productos con mayor rotación y costos que requieren actualización.",
    path: "/reportes",
    checks: [
      "Revisar ventas recientes.",
      "Revisar productos críticos.",
      "Analizar costos actualizados.",
      "Identificar productos que requieren gestión.",
    ],
  },
];

const checklistTasks: ChecklistTask[] = [
  {
    id: "dashboard",
    title: "Revisar el Dashboard",
    module: "Dashboard",
    description:
      "Entrar al panel principal y observar indicadores generales, stock crítico y alertas visibles.",
    path: "/",
  },
  {
    id: "insumo",
    title: "Registrar o revisar un insumo",
    module: "Insumos",
    description:
      "Validar que los insumos tengan nombre, unidad de medida, costo unitario y stock correcto.",
    path: "/insumos",
  },
  {
    id: "producto",
    title: "Revisar un producto y su formato",
    module: "Productos",
    description:
      "Confirmar que los productos estén correctamente diferenciados por presentación comercial.",
    path: "/productos",
  },
  {
    id: "receta",
    title: "Revisar una receta",
    module: "Recetas",
    description:
      "Verificar que el producto tenga asociados los insumos y cantidades correctas.",
    path: "/recetas",
  },
  {
    id: "componente-costo",
    title: "Crear un componente de costo",
    module: "Componentes de Costo",
    description:
      "Registrar un envase, etiqueta, embalaje, mano de obra u otro costo asociado al producto.",
    path: "/componentes-costo",
  },
  {
    id: "alertas",
    title: "Revisar alertas de costos",
    module: "Alertas de Costos",
    description:
      "Entrar al módulo de alertas y validar si existen productos afectados por cambios de costo.",
    path: "/alertas-costos",
  },
  {
    id: "venta",
    title: "Registrar una venta de prueba",
    module: "Ventas",
    description:
      "Registrar una venta controlada y revisar si el stock se actualiza correctamente.",
    path: "/ventas",
  },
  {
    id: "kardex",
    title: "Revisar el Kardex",
    module: "Kardex",
    description:
      "Confirmar que los movimientos de entrada, salida o ajuste quedan trazados correctamente.",
    path: "/kardex",
  },
  {
    id: "reportes",
    title: "Consultar reportes",
    module: "Reportes",
    description:
      "Revisar información consolidada para apoyar decisiones de compra, producción y venta.",
    path: "/reportes",
  },
];

const moduleCards: ModuleCard[] = [
  {
    name: "Dashboard",
    path: "/",
    priority: "Alta",
    purpose: "Vista general del estado del negocio.",
    keyAction: "Revisar alertas, stock crítico e indicadores principales.",
  },
  {
    name: "Insumos",
    path: "/insumos",
    priority: "Alta",
    purpose: "Control de materias primas y costos base.",
    keyAction: "Actualizar stock y costo unitario de cada insumo.",
  },
  {
    name: "Productos",
    path: "/productos",
    priority: "Alta",
    purpose: "Catálogo de productos y formatos de venta.",
    keyAction: "Registrar productos por formato: 100 ml, 250 ml, 500 ml, 1 L o 5 L.",
  },
  {
    name: "Recetas",
    path: "/recetas",
    priority: "Alta",
    purpose: "Relación entre productos e insumos consumidos.",
    keyAction: "Definir cantidades usadas por producto.",
  },
  {
    name: "Componentes de Costo",
    path: "/componentes-costo",
    priority: "Alta",
    purpose: "Registro de envases, etiquetas, embalaje, mano de obra e indirectos.",
    keyAction: "Agregar costos no considerados en la materia prima.",
  },
  {
    name: "Alertas de Costos",
    path: "/alertas-costos",
    priority: "Alta",
    purpose: "Avisos cuando cambia un costo que puede afectar productos.",
    keyAction: "Revisar productos afectados y decidir actualización de precios.",
  },
  {
    name: "Ventas",
    path: "/ventas",
    priority: "Media",
    purpose: "Registro comercial y descuento de stock.",
    keyAction: "Registrar ventas y validar stock disponible.",
  },
  {
    name: "Kardex",
    path: "/kardex",
    priority: "Media",
    purpose: "Trazabilidad de movimientos de inventario.",
    keyAction: "Auditar entradas, salidas y ajustes.",
  },
  {
    name: "Reportes",
    path: "/reportes",
    priority: "Media",
    purpose: "Análisis para la toma de decisiones.",
    keyAction: "Revisar tendencias, costos, rotación y stock.",
  },
];

const workflow = [
  {
    title: "Inicio de jornada",
    description:
      "Revisar Dashboard, stock crítico y alertas pendientes antes de operar.",
  },
  {
    title: "Actualización de datos base",
    description:
      "Actualizar insumos, costos de compra, productos y componentes de costo cuando existan cambios.",
  },
  {
    title: "Gestión operativa",
    description:
      "Registrar ventas, producción, fraccionamientos o ajustes de stock según corresponda.",
  },
  {
    title: "Control y trazabilidad",
    description:
      "Revisar Kardex, auditoría de movimientos y alertas de costos generadas.",
  },
  {
    title: "Análisis semanal",
    description:
      "Usar reportes para decidir compras, producción, precios y priorización comercial.",
  },
];

function readStatus(): OnboardingStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        completed: false,
        stepIndex: 0,
        completedTasks: [],
      };
    }

    const parsed = JSON.parse(raw) as Partial<OnboardingStatus>;

    return {
      completed: Boolean(parsed.completed),
      stepIndex:
        typeof parsed.stepIndex === "number"
          ? Math.min(Math.max(parsed.stepIndex, 0), steps.length - 1)
          : 0,
      completedTasks: Array.isArray(parsed.completedTasks)
        ? parsed.completedTasks
        : [],
    };
  } catch {
    return {
      completed: false,
      stepIndex: 0,
      completedTasks: [],
    };
  }
}

function saveStatus(status: OnboardingStatus) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

export default function OnboardingKarite() {
  const navigate = useNavigate();

  const initialStatus = useMemo(() => readStatus(), []);

  const [open, setOpen] = useState(!initialStatus.completed);
  const [activeTab, setActiveTab] = useState<Tab>("guia");
  const [completed, setCompleted] = useState(initialStatus.completed);
  const [stepIndex, setStepIndex] = useState(initialStatus.stepIndex);
  const [completedTasks, setCompletedTasks] = useState<string[]>(
    initialStatus.completedTasks
  );

  const currentStep = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const stepProgress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const checklistProgress = Math.round(
    (completedTasks.length / checklistTasks.length) * 100
  );

  useEffect(() => {
    saveStatus({
      completed,
      stepIndex,
      completedTasks,
    });
  }, [completed, stepIndex, completedTasks]);

  function openGuide(tab: Tab = "guia") {
    setActiveTab(tab);
    setOpen(true);
  }

  function closeGuide() {
    setOpen(false);
  }

  function finishGuide() {
    setCompleted(true);
    setOpen(false);
  }

  function restartGuide() {
    setCompleted(false);
    setStepIndex(0);
    setCompletedTasks([]);
    setActiveTab("guia");
    setOpen(true);
  }

  function goToPath(path?: string) {
    if (!path) return;
    navigate(path);
    setOpen(false);
  }

  function toggleTask(taskId: string) {
    setCompletedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  }

  function priorityColor(priority: ModuleCard["priority"]) {
    if (priority === "Alta") return "#b85c38";
    if (priority === "Media") return "#9a7b28";
    return "#607064";
  }

  return (
    <>
      <div style={floatingWrapper}>
        <button type="button" onClick={() => openGuide("guia")} style={guideButton}>
          Guía rápida
        </button>

        <button
          type="button"
          onClick={() => openGuide("checklist")}
          style={progressButton}
        >
          Inducción {checklistProgress}%
        </button>
      </div>

      {open && (
        <div style={overlay}>
          <div style={modal}>
            <div style={modalHeader}>
              <div style={brandBlock}>
                <div style={logo}>K</div>
                <div>
                  <h2 style={modalTitle}>Inducción AI-CMS Karité</h2>
                  <p style={modalSubtitle}>
                    Guía operativa para usar el sistema de costos, inventario,
                    producción y reportes.
                  </p>
                </div>
              </div>

              <button type="button" onClick={closeGuide} style={closeButton}>
                ×
              </button>
            </div>

            <div style={summaryBar}>
              <div style={summaryItem}>
                <strong>{stepProgress}%</strong>
                <span>Ruta guiada</span>
              </div>

              <div style={summaryItem}>
                <strong>{completedTasks.length}/{checklistTasks.length}</strong>
                <span>Checklist</span>
              </div>

              <div style={summaryItem}>
                <strong>{completed ? "Finalizada" : "En proceso"}</strong>
                <span>Estado inducción</span>
              </div>
            </div>

            <div style={tabs}>
              <button
                type="button"
                onClick={() => setActiveTab("guia")}
                style={activeTab === "guia" ? tabActive : tab}
              >
                Ruta guiada
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("checklist")}
                style={activeTab === "checklist" ? tabActive : tab}
              >
                Checklist
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("modulos")}
                style={activeTab === "modulos" ? tabActive : tab}
              >
                Mapa de módulos
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("flujo")}
                style={activeTab === "flujo" ? tabActive : tab}
              >
                Flujo recomendado
              </button>
            </div>

            <div style={content}>
              {activeTab === "guia" && (
                <section>
                  <p style={eyebrow}>
                    Paso {stepIndex + 1} de {steps.length} ·{" "}
                    {currentStep.module}
                  </p>

                  <h3 style={sectionTitle}>{currentStep.title}</h3>

                  <div style={infoGrid}>
                    <div style={infoCard}>
                      <strong>Objetivo</strong>
                      <p>{currentStep.objective}</p>
                    </div>

                    <div style={infoCard}>
                      <strong>Por qué es importante</strong>
                      <p>{currentStep.whyItMatters}</p>
                    </div>

                    <div style={infoCardWide}>
                      <strong>Acción recomendada</strong>
                      <p>{currentStep.recommendedAction}</p>
                    </div>
                  </div>

                  <div style={checkBox}>
                    <strong>La usuaria debería comprender:</strong>

                    <ul style={checkList}>
                      {currentStep.checks.map((check) => (
                        <li key={check}>{check}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={progressTrack}>
                    <div style={{ ...progressFill, width: `${stepProgress}%` }} />
                  </div>

                  <div style={footerActions}>
                    <div style={buttonGroup}>
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() =>
                          setStepIndex((prev) => Math.max(prev - 1, 0))
                        }
                        style={isFirst ? disabledButton : secondaryButton}
                      >
                        Anterior
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          isLast
                            ? finishGuide()
                            : setStepIndex((prev) => prev + 1)
                        }
                        style={primaryButton}
                      >
                        {isLast ? "Finalizar inducción" : "Siguiente"}
                      </button>
                    </div>

                    <div style={buttonGroup}>
                      {currentStep.path && (
                        <button
                          type="button"
                          onClick={() => goToPath(currentStep.path)}
                          style={outlineButton}
                        >
                          Ir al módulo
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveTab("checklist")}
                        style={secondaryButton}
                      >
                        Ver checklist
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === "checklist" && (
                <section>
                  <h3 style={sectionTitle}>Checklist de inducción</h3>

                  <p style={bodyText}>
                    Esta lista permite guiar una inducción práctica. Cada punto
                    representa una acción mínima que las administradoras deberían
                    conocer para operar el sistema.
                  </p>

                  <div style={progressTrack}>
                    <div
                      style={{
                        ...progressFill,
                        width: `${checklistProgress}%`,
                      }}
                    />
                  </div>

                  <p style={smallText}>
                    Avance: {completedTasks.length} de {checklistTasks.length}{" "}
                    tareas completadas.
                  </p>

                  <div style={taskList}>
                    {checklistTasks.map((task) => {
                      const checked = completedTasks.includes(task.id);

                      return (
                        <div key={task.id} style={checked ? taskDone : taskCard}>
                          <label style={taskLabel}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTask(task.id)}
                            />

                            <div>
                              <strong>{task.title}</strong>
                              <span>{task.module}</span>
                            </div>
                          </label>

                          <p style={taskDescription}>{task.description}</p>

                          {task.path && (
                            <button
                              type="button"
                              onClick={() => goToPath(task.path)}
                              style={miniButton}
                            >
                              Abrir módulo
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={footerActions}>
                    <button type="button" onClick={restartGuide} style={outlineButton}>
                      Reiniciar inducción
                    </button>

                    <button type="button" onClick={finishGuide} style={primaryButton}>
                      Guardar como finalizada
                    </button>
                  </div>
                </section>
              )}

              {activeTab === "modulos" && (
                <section>
                  <h3 style={sectionTitle}>Mapa de módulos del sistema</h3>

                  <p style={bodyText}>
                    Este mapa resume la utilidad práctica de cada módulo para que
                    la usuaria entienda dónde debe registrar, revisar o analizar
                    información.
                  </p>

                  <div style={moduleGrid}>
                    {moduleCards.map((module) => (
                      <div key={module.name} style={moduleCard}>
                        <div style={moduleCardHeader}>
                          <h4>{module.name}</h4>
                          <span
                            style={{
                              ...priorityBadge,
                              color: priorityColor(module.priority),
                              borderColor: priorityColor(module.priority),
                            }}
                          >
                            {module.priority}
                          </span>
                        </div>

                        <p>
                          <strong>Función:</strong> {module.purpose}
                        </p>

                        <p>
                          <strong>Acción clave:</strong> {module.keyAction}
                        </p>

                        {module.path && (
                          <button
                            type="button"
                            onClick={() => goToPath(module.path)}
                            style={miniButton}
                          >
                            Ir al módulo
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === "flujo" && (
                <section>
                  <h3 style={sectionTitle}>Flujo recomendado de uso</h3>

                  <p style={bodyText}>
                    Esta secuencia sirve como rutina sugerida para que Karité use
                    el sistema de forma ordenada.
                  </p>

                  <div style={workflowList}>
                    {workflow.map((item, index) => (
                      <div key={item.title} style={workflowItem}>
                        <div style={workflowNumber}>{index + 1}</div>

                        <div>
                          <h4>{item.title}</h4>
                          <p>{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={recommendationBox}>
                    <strong>Recomendación operativa:</strong>
                    <p>
                      Durante la etapa piloto, conviene que una administradora
                      registre datos y otra revise los resultados. Así se detectan
                      errores de uso, campos poco claros y mejoras necesarias
                      antes de escalar el sistema.
                    </p>
                  </div>

                  <div style={footerActions}>
                    <button
                      type="button"
                      onClick={() => setActiveTab("checklist")}
                      style={outlineButton}
                    >
                      Ir al checklist
                    </button>

                    <button type="button" onClick={finishGuide} style={primaryButton}>
                      Finalizar inducción
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const floatingWrapper: CSSProperties = {
  position: "fixed",
  right: "24px",
  bottom: "24px",
  zIndex: 60,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const guideButton: CSSProperties = {
  border: "none",
  borderRadius: "999px",
  padding: "12px 18px",
  background: "#244d35",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
};

const progressButton: CSSProperties = {
  border: "1px solid #d9c78c",
  borderRadius: "999px",
  padding: "10px 16px",
  background: "#fff9e8",
  color: "#244d35",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
};

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(0,0,0,0.48)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const modal: CSSProperties = {
  width: "min(1050px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto",
  background: "#fffdf8",
  borderRadius: "26px",
  padding: "26px",
  boxShadow: "0 28px 90px rgba(0,0,0,0.28)",
};

const modalHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "18px",
};

const brandBlock: CSSProperties = {
  display: "flex",
  gap: "16px",
  alignItems: "center",
};

const logo: CSSProperties = {
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  background: "#d8b85f",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
  fontWeight: 900,
  color: "#10241a",
};

const modalTitle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
  color: "#10241a",
};

const modalSubtitle: CSSProperties = {
  margin: "6px 0 0",
  color: "#5c6c61",
  lineHeight: 1.5,
};

const closeButton: CSSProperties = {
  width: "38px",
  height: "38px",
  borderRadius: "999px",
  border: "none",
  background: "#f0eee8",
  fontSize: "26px",
  cursor: "pointer",
};

const summaryBar: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const summaryItem: CSSProperties = {
  background: "#f5f2ea",
  border: "1px solid #e7ddc7",
  borderRadius: "16px",
  padding: "14px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  color: "#213428",
};

const tabs: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "20px",
};

const tab: CSSProperties = {
  border: "1px solid #d8d8d8",
  background: "#fff",
  color: "#244d35",
  borderRadius: "999px",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const tabActive: CSSProperties = {
  ...tab,
  border: "1px solid #244d35",
  background: "#244d35",
  color: "#fff",
};

const content: CSSProperties = {
  background: "#fff",
  border: "1px solid #ece5d8",
  borderRadius: "20px",
  padding: "22px",
};

const eyebrow: CSSProperties = {
  color: "#55705f",
  fontSize: "13px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin: "0 0 8px",
};

const sectionTitle: CSSProperties = {
  margin: "0 0 14px",
  color: "#10241a",
  fontSize: "26px",
};

const bodyText: CSSProperties = {
  color: "#34443a",
  lineHeight: 1.6,
  marginTop: 0,
};

const smallText: CSSProperties = {
  color: "#65746b",
  fontSize: "14px",
};

const infoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "14px",
  marginBottom: "16px",
};

const infoCard: CSSProperties = {
  background: "#f9f7f0",
  border: "1px solid #e7ddc7",
  borderRadius: "16px",
  padding: "16px",
  lineHeight: 1.5,
};

const infoCardWide: CSSProperties = {
  ...infoCard,
  gridColumn: "1 / -1",
};

const checkBox: CSSProperties = {
  background: "#eef5ee",
  border: "1px solid #cfe0d0",
  borderRadius: "16px",
  padding: "16px",
  marginBottom: "18px",
};

const checkList: CSSProperties = {
  marginBottom: 0,
  lineHeight: 1.8,
};

const progressTrack: CSSProperties = {
  width: "100%",
  height: "9px",
  background: "#eef0eb",
  borderRadius: "999px",
  overflow: "hidden",
  margin: "12px 0 18px",
};

const progressFill: CSSProperties = {
  height: "100%",
  background: "#244d35",
  borderRadius: "999px",
};

const footerActions: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap",
};

const buttonGroup: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const primaryButton: CSSProperties = {
  border: "none",
  background: "#244d35",
  color: "#fff",
  borderRadius: "12px",
  padding: "11px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton: CSSProperties = {
  border: "1px solid #d8d8d8",
  background: "#fff",
  color: "#26382c",
  borderRadius: "12px",
  padding: "11px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const outlineButton: CSSProperties = {
  border: "1px solid #244d35",
  background: "#fff",
  color: "#244d35",
  borderRadius: "12px",
  padding: "11px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const disabledButton: CSSProperties = {
  ...secondaryButton,
  background: "#eee",
  color: "#999",
  cursor: "not-allowed",
};

const taskList: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
  gap: "14px",
  marginTop: "18px",
  marginBottom: "18px",
};

const taskCard: CSSProperties = {
  border: "1px solid #e6dfd1",
  borderRadius: "16px",
  padding: "16px",
  background: "#fffdf8",
};

const taskDone: CSSProperties = {
  ...taskCard,
  background: "#eef7ef",
  border: "1px solid #bdd9c0",
};

const taskLabel: CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  cursor: "pointer",
};

const taskDescription: CSSProperties = {
  color: "#536157",
  lineHeight: 1.5,
  marginBottom: "12px",
};

const miniButton: CSSProperties = {
  border: "none",
  background: "#e8eadf",
  color: "#244d35",
  borderRadius: "10px",
  padding: "8px 12px",
  fontWeight: 800,
  cursor: "pointer",
};

const moduleGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "14px",
};

const moduleCard: CSSProperties = {
  border: "1px solid #e6dfd1",
  borderRadius: "16px",
  padding: "16px",
  background: "#fffdf8",
  lineHeight: 1.5,
};

const moduleCardHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  alignItems: "center",
};

const priorityBadge: CSSProperties = {
  border: "1px solid",
  borderRadius: "999px",
  padding: "4px 8px",
  fontSize: "12px",
  fontWeight: 800,
};

const workflowList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  marginTop: "18px",
};

const workflowItem: CSSProperties = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  border: "1px solid #e6dfd1",
  borderRadius: "16px",
  padding: "16px",
  background: "#fffdf8",
};

const workflowNumber: CSSProperties = {
  minWidth: "38px",
  height: "38px",
  borderRadius: "999px",
  background: "#244d35",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};

const recommendationBox: CSSProperties = {
  background: "#fff8df",
  border: "1px solid #e5d18d",
  borderRadius: "16px",
  padding: "16px",
  lineHeight: 1.6,
  marginTop: "18px",
  marginBottom: "18px",
};