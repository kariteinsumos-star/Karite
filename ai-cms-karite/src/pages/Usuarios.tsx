import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertBox } from '../components/AlertBox';
import { DataTable } from '../components/DataTable';
import { Loading } from '../components/Loading';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../lib/formatters';
import { supabase } from '../lib/supabaseClient';
import type { AppRole, Profile } from '../lib/types';

const roles: AppRole[] = ['admin', 'operador', 'vendedor', 'solo_lectura'];

export function Usuarios() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    const { data, error: e } = await supabase.from('profiles').select('id,email,display_name,rol,activo').order('email');
    if (e) setError(e.message);
    setRows((data ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  if (!isAdmin) return <Navigate to="/" replace />;
  if (loading) return <Loading />;

  const updateUser = async (id: string, patch: Partial<Profile>) => {
    setError(null); setSuccess(null);
    try {
      const { error: e } = await supabase.from('profiles').update(patch).eq('id', id);
      if (e) throw e;
      setSuccess('Usuario actualizado.');
      await load();
    } catch (err) { setError(getErrorMessage(err)); }
  };

  return (
    <div className="page">
      <div className="page-title"><h2>Usuarios y roles</h2><p>Administración de permisos de la aplicación.</p></div>
      {error && <AlertBox type="error">{error}</AlertBox>}
      {success && <AlertBox type="success">{success}</AlertBox>}
      <DataTable
        rows={rows}
        columns={[
          { key: 'email', header: 'Email', render: (r) => r.email ?? '-' },
          { key: 'name', header: 'Nombre', render: (r) => r.display_name ?? '-' },
          { key: 'rol', header: 'Rol', render: (r) => <select value={r.rol} onChange={(e) => void updateUser(r.id, { rol: e.target.value as AppRole })}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select> },
          { key: 'activo', header: 'Activo', render: (r) => <input type="checkbox" checked={r.activo} onChange={(e) => void updateUser(r.id, { activo: e.target.checked })} /> }
        ]}
      />
    </div>
  );
}
