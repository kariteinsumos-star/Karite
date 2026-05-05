export type AppRole = 'admin' | 'operador' | 'vendedor' | 'solo_lectura';
export type UnidadMedida = 'g' | 'kg' | 'ml' | 'l' | 'lt' | 'unidad';
export type TipoProducto = 'simple' | 'kit';
export type TipoMovimiento =
  | 'carga_inicial'
  | 'produccion'
  | 'armado_kit'
  | 'venta_directa'
  | 'venta_mayorista_insumo'
  | 'ajuste'
  | 'fraccionamiento';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  rol: AppRole;
  activo: boolean;
}

export interface Insumo {
  id_insumo: string;
  nombre: string;
  categoria: string;
  unidad_medida: UnidadMedida;
  unidad_medida_label: string;
  costo_unitario: number;
  stock_actual: number;
  stock_minimo: number;
  stock_critico?: boolean;
  activo: boolean;
}

export interface ProductoCosteo {
  id_producto: string;
  nombre: string;
  tipo_producto: TipoProducto;
  costo_materiales_total: number;
  costo_operacional: number;
  costo_total: number;
  margen_deseado: number;
  precio_venta_sugerido: number;
  stock_producto_terminado: number;
  stock_minimo: number;
  stock_critico?: boolean;
  activo: boolean;
}

export interface RecetaDetalle {
  id_receta: string;
  id_producto: string;
  producto: string;
  id_insumo: string;
  insumo: string;
  categoria: string;
  unidad_medida: UnidadMedida;
  unidad_medida_label: string;
  cantidad_necesaria: number;
  cantidad_con_unidad: string;
  merma_porcentaje: number;
  costo_unitario: number;
  costo_linea: number;
}

export interface KitDetalle {
  id_kit_componente: string;
  id_kit_producto: string;
  kit: string;
  id_componente_producto: string;
  componente: string;
  cantidad_componente: number;
  costo_unitario_componente: number;
  costo_total_componente: number;
}

export interface KardexMovimiento {
  id_movimiento: string;
  fecha: string;
  tipo: TipoMovimiento;
  observacion: string | null;
  referencia_fontana: string | null;
  usuario_id: string | null;
  item_tipo: 'insumo' | 'producto';
  item_nombre: string;
  id_insumo: string | null;
  id_producto: string | null;
  cantidad: number;
  costo_unitario_snapshot: number;
}

export interface ValidacionStock {
  id_insumo: string;
  nombre: string;
  requerido: number;
  stock_actual: number;
  faltante: number;
  suficiente: boolean;
}

export interface ProductoBase {
  id_producto: string;
  nombre: string;
  tipo_producto: TipoProducto;
  activo: boolean;
}
export interface ProductoDisponibilidad {
  id_producto: string;
  nombre: string;
  tipo_producto: string;
  activo: boolean;
  stock_producto_terminado: number;
  stock_minimo: number;
  costo_materiales_total: number;
  costo_operacional: number;
  costo_total: number;
  precio_venta_sugerido: number;
  cantidad_insumos_receta: number;
  tiene_receta: boolean;
  puede_producir_1_unidad: boolean;
  detalle_faltantes: string | null;
  estado_operacional: string;
  puede_producir: boolean;
  puede_vender: boolean;
}