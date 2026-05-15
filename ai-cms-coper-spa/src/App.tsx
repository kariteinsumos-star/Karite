import { useEffect, useState } from 'react';
import { supabase } from './config/supabaseClient';

export default function App() {
  const [mensaje, setMensaje] = useState('Probando conexión...');
  const [cantidad, setCantidad] = useState<number | null>(null);

  useEffect(() => {
    async function probarConexion() {
      try {
        const { data, error } = await supabase
          .from('ordenes_importacion')
          .select('id, codigo, proveedor')
          .limit(5);

        if (error) {
          console.error(error);
          setMensaje('Error al conectar con Supabase. Revisa RLS o sesión.');
          return;
        }

        setCantidad(data?.length ?? 0);
        setMensaje('Conexión correcta con Supabase.');
      } catch (error) {
        console.error(error);
        setMensaje('Error inesperado en React o Supabase.');
      }
    }

    probarConexion();
  }, []);

  return (
    <main style={{ padding: 40, fontFamily: 'Arial' }}>
      <h1>ERP COPER SPA</h1>
      <p>{mensaje}</p>
      {cantidad !== null && <p>Órdenes encontradas: {cantidad}</p>}
    </main>
  );
}