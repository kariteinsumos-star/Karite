import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertBox } from './AlertBox';
import { Loading } from './Loading';
import { supabase } from '../lib/supabaseClient';
import { getErrorMessage } from '../lib/formatters';

interface AccionRecomendada {
  id_accion: string;
  tipo_alerta: string;
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA' | string;
  prioridad_orden: number;
  modulo: string;
  entidad_tipo: string;
  entidad_id: string;
  entidad_nombre: string;
  estado: string;
  diagnostico: string;
  accion_recomendada: string;
  ruta_sugerida: string;
  generado_en: string;
}

function prioridadClass(prioridad: string) {
  if (prioridad === 'ALTA') return 'recommendation-priority high';
  if (prioridad === 'MEDIA') return 'recommendation-priority medium';
  return 'recommendation-priority low';
}

export function ActionRecommendations() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acciones, setAcciones] = useState<AccionRecomendada[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('v_acciones_recomendadas')
        .select('*')
        .order('prioridad_orden', { ascending: true })
        .order('entidad_nombre', { ascending: true })
        .limit(20);

      if (queryError) throw queryError;

      setAcciones((data ?? []) as AccionRecomendada[]);
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

  if (loading) {
    return (
      <div className="panel">
        <Loading />
      </div>
    );
  }

  if (error) {
    return <AlertBox type="error">{error}</AlertBox>;
  }

  if (acciones.length === 0) {
    return (
      <AlertBox type="success">
        No hay acciones recomendadas pendientes. El sistema no detecta alertas operativas relevantes.
      </AlertBox>
    );
  }

  return (
    <section className="recommendations-section">
      <div className="row-between">
        <div>
          <h3>Acciones recomendadas</h3>
          <p className="muted">
            Sugerencias automáticas generadas desde inventario, recetas, producción y ventas.
          </p>
        </div>

        <button className="btn secondary" onClick={() => void load()}>
          Actualizar
        </button>
      </div>

      <div className="recommendations-grid">
        {acciones.map((accion) => (
          <article key={accion.id_accion} className="recommendation-card">
            <div className="recommendation-header">
              <span className={prioridadClass(accion.prioridad)}>
                {accion.prioridad}
              </span>

              <span className="recommendation-module">
                {accion.modulo}
              </span>
            </div>

            <h4>{accion.entidad_nombre}</h4>

            <div className="recommendation-status">
              {accion.estado}
            </div>

            <p>
              <strong>Diagnóstico:</strong> {accion.diagnostico}
            </p>

            <p>
              <strong>Acción recomendada:</strong> {accion.accion_recomendada}
            </p>

            <div className="recommendation-actions">
              <button
                className="btn small primary"
                onClick={() => navigate(accion.ruta_sugerida)}
              >
                Ir a {accion.modulo}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}