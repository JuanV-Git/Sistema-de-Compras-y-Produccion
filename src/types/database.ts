// =====================================================
// TIPOS TYPESCRIPT GENERADOS DESDE SUPABASE
// =====================================================

export type TipoProducto = 'MP' | 'SE' | 'PT' | 'ENVASE' | 'ETIQUETA';
// ... (rest of the file remains, I will verify services first)
export type TipoMateriaPrima = 'RESINA' | 'PIGMENTO' | 'CARGA' | 'SOLVENTE' | 'ADITIVO';
export type UnidadMedida = 'KG' | 'LT' | 'UN' | 'MT' | 'GL';
export type EstadoReceta = 'ACTIVA' | 'INACTIVA' | 'BORRADOR';
export type EstadoOC = 'BORRADOR' | 'ENVIADA' | 'PARCIAL' | 'RECIBIDA' | 'CANCELADA';
export type EstadoOP = 'PLANIFICADA' | 'EN_PRODUCCION' | 'COMPLETADA' | 'CANCELADA' | 'PAUSADA';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
export type OrigenMovimiento = 'REMITO_COMPRA' | 'ORDEN_PRODUCCION' | 'AJUSTE_MANUAL' | 'INVENTARIO_INICIAL' | 'COMPRA' | 'PRODUCCION_PT' | 'CONSUMO_PRODUCCION' | 'DEVOLUCION_PROVEEDOR' | 'TRASPASO_ENTRADA' | 'TRASPASO_SALIDA';

// =====================================================
// INTERFACES DE TABLAS
// =====================================================

export interface TenantSettings {
    modulos: {
        produccion: boolean;
        compras: boolean;
        ventas: boolean;
    };
    recetas: {
        habilitar_semielaborados: boolean;
        permite_duplicados_ingredientes: boolean;
        nivel_detalle_pasos: 'simple' | 'detallado';
    };
    monedas: {
        principal: 'ARS' | 'USD' | 'EUR' | 'MXN';
        secundaria?: 'ARS' | 'USD' | 'EUR' | 'MXN';
        lista_habilitadas: string[];
    };
    ui: {
        theme_color: string;
        logo_url?: string;
    };
}

export interface Configuracion {
    id: string;
    nombre_empresa: string;
    moneda_principal: string;
    logo_url?: string;
    theme_color: string;
    params: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface Tenant {
    id: string;
    nombre: string;
    slug: string;
    configuracion: TenantSettings;
    plan: string;
    created_at: string;
}

export interface Usuario {
    id: string;
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
    lista_costo_id?: string;
    costo_promedio: number;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export interface ListaPrecio {
    id: string;
    nombre: string;
    tipo: 'COSTO' | 'VENTA';
    descripcion?: string;
    activa: boolean;
    moneda?: 'ARS' | 'USD';
    created_at: string;
    updated_at: string;
}

export interface PrecioProducto {
    id: string;
    lista_id: string;
    producto_id: string;
    precio: number;
    moneda: string;
    fecha_vigencia: string;
    usuario_id?: string;
    created_at: string;
    // Joined
    lista?: ListaPrecio;
    producto?: Producto;
}

export interface Proveedor {
    id: string;
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
    codigo: string;
    nombre: string;
    version: number;
    producto_id?: string;
    cantidad_producida: number;
    unidad_medida: string;
    estado: EstadoReceta;
    costo_total: number;
    costo_por_unidad: number;
    costo_total_usd?: number;
    costo_por_unidad_usd?: number;
    observaciones?: string;
    created_at: string;
    updated_at: string;
}

export interface RecetaComponente {
    id: string;
    receta_id: string;
    producto_id: string;
    cantidad: number;
    unidad_medida: string;
    orden: number;
    costo_unitario: number;
    moneda?: string;
    costo_subtotal: number;
    instrucciones?: string;
    created_at: string;
    // Joined
    producto?: Producto;
}

export interface OrdenCompra {
    id: string;
    numero: string;
    proveedor_id: string;
    estado: EstadoOC;
    fecha_emision: string;
    fecha_entrega_estimada?: string;
    subtotal: number;
    iva: number;
    total: number;
    moneda: 'ARS' | 'USD';
    tipo_cambio: number;
    observaciones?: string;
    usuario_creacion?: string;
    created_at: string;
    updated_at: string;
    // Joined
    proveedor?: Proveedor;
}

export interface OrdenCompraItem {
    id: string;
    orden_compra_id: string;
    producto_id: string;
    cantidad_pedida: number;
    cantidad_recibida: number;
    precio_unitario: number;
    subtotal: number;
    estado: 'PENDIENTE' | 'PARCIAL' | 'COMPLETADO' | 'CANCELADO';
    created_at: string;
    // Joined
    producto?: Producto;
}

export interface OrdenProduccion {
    id: string;
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

export const TipoProductoPrefixes: Record<TipoProducto, string> = {
    MP: 'MP',
    SE: 'SE',
    PT: 'PT',
    ENVASE: 'ENV',
    ETIQUETA: 'ETIQ',
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
    PAUSADA: 'Pausada',
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

