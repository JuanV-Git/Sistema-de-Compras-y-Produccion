// =====================================================
// TIPOS TYPESCRIPT GENERADOS DESDE SUPABASE
// =====================================================

export type TipoProducto = 'MP' | 'SE' | 'PT' | 'ENVASE' | 'ETIQUETA';
export type TipoMateriaPrima = 'RESINA' | 'PIGMENTO' | 'CARGA' | 'SOLVENTE' | 'ADITIVO';
export type UnidadMedida = 'KG' | 'LT' | 'UN' | 'MT' | 'GL';
export type EstadoReceta = 'ACTIVA' | 'INACTIVA' | 'BORRADOR';
export type EstadoOC = 'BORRADOR' | 'ENVIADA' | 'PARCIAL' | 'RECIBIDA' | 'CANCELADA';
export type EstadoOP = 'PLANIFICADA' | 'EN_PRODUCCION' | 'COMPLETADA' | 'CANCELADA';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
export type OrigenMovimiento = 'REMITO_COMPRA' | 'ORDEN_PRODUCCION' | 'AJUSTE_MANUAL' | 'INVENTARIO_INICIAL';



// =====================================================
// INTERFACES DE TABLAS
// =====================================================

export interface Tenant {
    id: string;
    nombre: string;
    codigo: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export interface Usuario {
    id: string;
    tenant_id: string;
    auth_user_id: string;
    email: string;
    nombre: string;
    rol: string;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export interface Producto {
    id: string;
    tenant_id: string;
    codigo: string;
    nombre: string;
    descripcion?: string;
    tipo: TipoProducto;
    tipo_materia_prima?: TipoMateriaPrima | null;
    unidad_medida: string;
    stock_actual: number;
    stock_minimo: number;
    stock_maximo?: number;
    costo_unitario: number;
    costo_promedio: number;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export interface Proveedor {
    id: string;
    tenant_id: string;
    codigo: string;
    nombre: string;
    razon_social?: string;
    cuit?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    contacto_nombre?: string;
    contacto_email?: string;
    contacto_telefono?: string;
    condicion_pago?: string;
    plazo_entrega_dias: number;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProductoProveedor {
    id: string;
    tenant_id: string;
    producto_id: string;
    proveedor_id: string;
    codigo_alternativo?: string;
    precio_unitario?: number;
    es_principal: boolean;
    created_at: string;
    // Joined
    proveedor?: Proveedor;
    producto?: Producto;
}

export interface Receta {
    id: string;
    tenant_id: string;
    codigo: string;
    nombre: string;
    version: number;
    producto_id?: string;
    cantidad_producida: number;
    unidad_medida: string;
    estado: EstadoReceta;
    costo_total: number;
    costo_por_unidad: number;
    observaciones?: string;
    created_at: string;
    updated_at: string;
}

export interface RecetaComponente {
    id: string;
    tenant_id: string;
    receta_id: string;
    producto_id: string;
    cantidad: number;
    unidad_medida: string;
    orden: number;
    costo_unitario: number;
    costo_subtotal: number;
    created_at: string;
    // Joined
    producto?: Producto;
}

export interface OrdenCompra {
    id: string;
    tenant_id: string;
    numero: string;
    proveedor_id: string;
    estado: EstadoOC;
    fecha_emision: string;
    fecha_entrega_estimada?: string;
    subtotal: number;
    iva: number;
    total: number;
    observaciones?: string;
    usuario_creacion?: string;
    created_at: string;
    updated_at: string;
    // Joined
    proveedor?: Proveedor;
}

export interface OrdenCompraItem {
    id: string;
    tenant_id: string;
    orden_compra_id: string;
    producto_id: string;
    cantidad_pedida: number;
    cantidad_recibida: number;
    precio_unitario: number;
    subtotal: number;
    estado: string;
    created_at: string;
    // Joined
    producto?: Producto;
}

export interface OrdenProduccion {
    id: string;
    tenant_id: string;
    numero: string;
    receta_id: string;
    producto_id: string;
    estado: EstadoOP;
    cantidad_programada: number;
    cantidad_producida: number;
    unidad_medida: string;
    costo_teorico_total: number;
    costo_real_total: number;
    variacion_porcentaje: number;
    fecha_creacion: string;
    fecha_inicio?: string;
    fecha_cierre?: string;
    usuario_creacion?: string;
    usuario_cierre?: string;
    observaciones?: string;
    created_at: string;
    updated_at: string;
    // Joined
    receta?: Receta;
    producto?: Producto;
}

export interface OrdenProduccionConsumo {
    id: string;
    tenant_id: string;
    orden_produccion_id: string;
    producto_id: string;
    cantidad_teorica: number;
    cantidad_real: number;
    costo_unitario: number;
    costo_teorico: number;
    costo_real: number;
    variacion_cantidad: number;
    created_at: string;
    // Joined
    producto?: Producto;
}

export interface MovimientoStock {
    id: string;
    tenant_id: string;
    producto_id: string;
    tipo_movimiento: TipoMovimiento;
    origen: OrigenMovimiento;
    documento_id?: string;
    documento_numero?: string;
    cantidad: number;
    stock_anterior: number;
    stock_posterior: number;
    costo_unitario?: number;
    costo_total?: number;
    usuario_id?: string;
    observaciones?: string;
    created_at: string;
    // Joined
    producto?: Producto;
}

// =====================================================
// LABELS PARA UI
// =====================================================

export const TipoProductoLabels: Record<TipoProducto, string> = {
    MP: 'Materia Prima',
    SE: 'Semielaborado',
    PT: 'Prod. Terminado',
    ENVASE: 'Envase',
    ETIQUETA: 'Etiqueta',
};

export const TipoMateriaPrimaLabels: Record<TipoMateriaPrima, string> = {
    RESINA: 'Resina',
    PIGMENTO: 'Pigmento',
    CARGA: 'Carga',
    SOLVENTE: 'Solvente',
    ADITIVO: 'Aditivo',
};

export const EstadoRecetaLabels: Record<EstadoReceta, string> = {
    ACTIVA: 'Activa',
    INACTIVA: 'Inactiva',
    BORRADOR: 'Borrador',
};

export const EstadoOCLabels: Record<EstadoOC, string> = {
    BORRADOR: 'Borrador',
    ENVIADA: 'Enviada',
    PARCIAL: 'Recepción Parcial',
    RECIBIDA: 'Recibida Completa',
    CANCELADA: 'Cancelada',
};

export const EstadoOPLabels: Record<EstadoOP, string> = {
    PLANIFICADA: 'Planificada',
    EN_PRODUCCION: 'En Producción',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',
};

export const TipoMovimientoLabels: Record<TipoMovimiento, string> = {
    ENTRADA: 'Entrada',
    SALIDA: 'Salida',
    AJUSTE_POSITIVO: 'Ajuste (+)',
    AJUSTE_NEGATIVO: 'Ajuste (-)',
};

export const UnidadMedidaLabels: Record<UnidadMedida, string> = {
    KG: 'Kilogramos',
    LT: 'Litros',
    UN: 'Unidades',
    MT: 'Metros',
    GL: 'Galones',
};

