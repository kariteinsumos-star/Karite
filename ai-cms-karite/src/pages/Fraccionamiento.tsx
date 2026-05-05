import { FormEvent, useEffect, useState } from 'react';
import { AlertBox } from '../components/AlertBox';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { Insumo } from '../lib/types';

export function Fraccionamiento() {
  const { canOperate } = useAuth();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [granel, setGranel] = useState('');
  const [consumida, setConsumida] = useState('');
  const [fraccionado, setFraccionado] = useState('');
  const [generada, setGenerada] = useState('');
  const [envase, setEnvase] = useState('');
  const [cantidadEnvases, setCantidadEnvases] = useState('0');

  useEffect(() => {
    const load = async () => {
      const { data, error: e } = await supabase.from('v_insumos').select('*').eq('activo', true).order('nombre');
      if (e) setError(e.message);
      setInsumos((data ?? []) as Insumo[]);
      setLoading(false);
    };
    void load();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      const { error: rpcError } = await supabase.rpc('registrar_fraccionamiento', {
        p_insumo_granel: granel,
        p_cantidad_consumida: Number(consumida),
        p_insumo_fraccionado: fraccionado,
        p_cantidad_generada: Number(generada),
        p_envase_insumo: envase || null,
        p_cantidad_envases: Number(cantidadEnvases || 0),
        p_observacion: 'Fraccionamiento registrado desde interfaz'
      });
      if (rpcError) throw rpcError;
      setSuccess('Fraccionamiento registrado correctamente.');
      setConsumida(''); setGenerada(''); setCantidadEnvases('0');
    } catch (err) { setError(getErrorMessage(err)); }
  };

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="page-title"><h2>Fraccionamiento</h2><p>Baja insumo a granel, alta insumo fraccionado y descuenta envases.</p></div>
      {!canOperate && <AlertBox type="warning">Tu rol no permite registrar fraccionamientos.</AlertBox>}
      {error && <AlertBox type="error">{error}</AlertBox>}
      {success && <AlertBox type="success">{success}</AlertBox>}
      <div className="panel">
        <form className="form-grid" onSubmit={submit}>
          <label>Insumo a granel<select value={granel} onChange={(e) => setGranel(e.target.value)} required><option value="">Seleccionar</option>{insumos.map((i) => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</option>)}</select></label>
          <label>Cantidad consumida<input type="number" min="0.001" step="0.001" value={consumida} onChange={(e) => setConsumida(e.target.value)} required /></label>
          <label>Insumo fraccionado<select value={fraccionado} onChange={(e) => setFraccionado(e.target.value)} required><option value="">Seleccionar</option>{insumos.map((i) => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</option>)}</select></label>
          <label>Cantidad generada<input type="number" min="0.001" step="0.001" value={generada} onChange={(e) => setGenerada(e.target.value)} required /></label>
          <label>Envase usado opcional<select value={envase} onChange={(e) => setEnvase(e.target.value)}><option value="">Sin envase</option>{insumos.map((i) => <option key={i.id_insumo} value={i.id_insumo}>{i.nombre}</option>)}</select></label>
          <label>Cantidad envases<input type="number" min="0" step="0.001" value={cantidadEnvases} onChange={(e) => setCantidadEnvases(e.target.value)} /></label>
          <button className="btn primary" disabled={!canOperate}>Registrar fraccionamiento</button>
        </form>
      </div>
    </div>
  );
}
