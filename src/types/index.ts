// =====================================================
// TIPOS DE PRODUCTO
// =====================================================

export type TipoProducto = 'MP' | 'ETIQUETA' | 'ENVASE' | 'PT' | 'SE';

export type TipoMateriaPrima = 'RESINA' | 'PIGMENTO' | 'CARGA' | 'SOLVENTE' | 'ADITIVO';

export const TipoProductoLabels: Record<TipoProducto, string> = {
    MP: 'Materia Prima',
    ETIQUETA: 'Etiqueta',
    ENVASE: 'Envase',
    PT: 'Producto Terminado',
    SE: 'Semi Elaborado',
};

export const TipoMateriaPrimaLabels: Record<TipoMateriaPrima, string> = {
    RESINA: 'Resina',
    PIGMENTO: 'Pigmento',
    CARGA: 'Carga',
    SOLVENTE: 'Solvente',
    ADITIVO: 'Aditivo',
};

// =====================================================
// INTERFACES
// =====================================================

export interface Producto {
    id: string;
    codigo: string;
    nombre: string;
    tipo: TipoProducto;
    tipoMateriaPrima?: TipoMateriaPrima;
    unidadMedida: string;
    stockActual: number;
    stockMinimo: number;
    activo: boolean;
}

export interface ProveedorProducto {
    id: string;
    codigo: string;
    razonSocial: string;
    codigoAlternativo: string;
    ultimaCompra: string;
    totalComprado: number;
}

export interface IngresoProducto {
    id: string;
    fecha: string;
    cantidad: number;
    proveedor: string;
    numeroOC: string;
}

export interface PendienteEntrega {
    id: string;
    numeroOC: string;
    proveedor: string;
    cantidadPendiente: number;
    fechaEstimada: string;
}

export interface ConsumoMensual {
    mes: string;
    año: number;
    cantidad: number;
}

// =====================================================
// TIPOS DE PROVEEDOR
// =====================================================

export type CondicionPago = 'ANTICIPADO' | 'CONTRA_FACTURA';

export const CondicionPagoLabels: Record<CondicionPago, string> = {
    ANTICIPADO: 'Anticipado',
    CONTRA_FACTURA: 'Contra Factura',
};

export interface Proveedor {
    id: string;
    codigo: string;
    razonSocial: string;
    contacto: string;
    telefono: string;
    email: string;
    direccion: string;
    activo: boolean;
    // Nuevos campos
    condicionPago: CondicionPago;
    plazoPagoDias: number;
    plazoEnvioValoresDias: number;
    emailOrdenes: string;
    whatsappOrdenes: string;
}

export interface OrdenCompraProveedor {
    id: string;
    numeroOrden: string;
    fecha: string;
    items: number;
    total: string;
    estado: 'ABIERTA' | 'CERRADA';
    fechaCierre?: string;
}

export interface PendienteEntregaProveedor {
    id: string;
    numeroOC: string;
    producto: string;
    cantidadPendiente: number;
    unidad: string;
    fechaEstimada: string;
}
