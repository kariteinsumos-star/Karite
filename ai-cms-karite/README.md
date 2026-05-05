# AI-CMS Karité MVP

Aplicación web React + TypeScript conectada a Supabase para operar el MVP de Karité: insumos, productos, recetas, producción, ventas, fraccionamiento, kits, stock crítico y Kardex.

## Requisitos previos

- Node.js instalado.
- Proyecto Supabase ya creado.
- SQL backend de Karité ya ejecutado en Supabase.
- Usuario admin creado en `public.profiles`.

## Instalación local

```bash
npm install
cp .env.example .env
npm run dev
```

Edita `.env`:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON_O_PUBLISHABLE
```

No uses `service_role key` en el frontend.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Inicializa AI-CMS Karité MVP"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/ai-cms-karite.git
git push -u origin main
```

## Build

```bash
npm run build
```

## Pantallas incluidas

- Login con Supabase Auth.
- Dashboard.
- Insumos.
- Productos.
- Recetas/BOM.
- Producción con validación de stock por RPC.
- Ventas de productos e insumos.
- Fraccionamiento.
- Kits.
- Kardex.
- Stock crítico.
- Usuarios y roles.

## Variables usadas

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Tablas, vistas y RPC esperadas

La app consume las tablas, vistas y funciones Supabase definidas en el backend del MVP Karité:

- `profiles`
- `insumos`
- `productos_finales`
- `recetas`
- `kit_componentes`
- `v_insumos`
- `v_productos_costeo`
- `v_recetas_detalle`
- `v_kit_componentes_detalle`
- `v_stock_critico_insumos`
- `v_stock_critico_productos`
- `v_movimientos_kardex`
- `v_productos_sin_receta`
- `validar_stock_produccion`
- `registrar_produccion`
- `registrar_armado_kit`
- `registrar_venta_directa`
- `registrar_venta_mayorista_insumo`
- `registrar_fraccionamiento`
- `registrar_ajuste`
- `calcular_costo_producto`
