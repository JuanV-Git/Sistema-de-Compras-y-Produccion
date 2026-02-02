// =====================================================
// TIPOS DE ÓRDENES DE COMPRA
// =====================================================

// Estados
export type EstadoOC = 'ABIERTA' | 'CERRADA' | 'CANCELADA';
export type EstadoItemOC = 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO';

export const EstadoOCLabels: Record<EstadoOC, string> = {
    ABIERTA: 'Abierta',
    CERRADA: 'Cerrada',
    CANCELADA: 'Cancelada',
};

export const EstadoItemOCLabels: Record<EstadoItemOC, string> = {
    PENDIENTE: 'Pendiente',
    COMPLETADO: 'Completado',
    CANCELADO: 'Cancelado',
};

// Monedas
export type Moneda = 'ARS' | 'USD';

export const MonedaLabels: Record<Moneda, string> = {
    ARS: 'Pesos Argentinos',
    USD: 'Dólares Estadounidenses',
};

export const MonedaSymbols: Record<Moneda, string> = {
    ARS: '$',
    USD: 'U$D',
};

// =====================================================
// INTERFACES PRINCIPALES
// =====================================================

export interface OrdenCompra {
    id: string;
    numeroOC: string | null; // null cuando está ABIERTA
    proveedorId: string;
    proveedorNombre: string;
    estado: EstadoOC;
    fechaCreacion: string;
    fechaCierre: string | null;
    fechaArriboEstimado: string | null;
    moneda: Moneda;
    tipoCambio: number;
    condicionesPago: string;
    montoNeto: number;
    impuestos: number;
    montoTotal: number;
    usuarioApertura: string;
    usuarioCierre: string | null;
    items: OrdenCompraItem[];
    remitos: RemitoCompra[];
    facturas: FacturaCompra[];
}

export interface OrdenCompraItem {
    id: string;
    ordenCompraId: string;
    productoId: string;
    productoCodigo: string;
    productoNombre: string;
    codigoAlternativo: string;
    descripcion: string;
    cantidadPedida: number;
    precioUnitario: number;
    cantidadRecibida: number; // Acumulado de remitos
    cantidadFacturada: number; // Acumulado de facturas
    estadoItem: EstadoItemOC;
    unidadMedida: string;
}

export interface RemitoCompra {
    id: string;
    ordenCompraId: string;
    numeroRemito: string;
    fecha: string;
    fechaRegistro: string;
    usuarioRegistro: string;
    items: RemitoCompraItem[];
}

export interface RemitoCompraItem {
    id: string;
    remitoId: string;
    ordenCompraItemId: string;
    productoCodigo: string;
    productoNombre: string;
    cantidad: number;
    unidadMedida: string;
}

export interface FacturaCompra {
    id: string;
    ordenCompraId: string;
    numeroFactura: string;
    fecha: string;
    montoTotal: number;
    usuarioRegistro: string;
    items: FacturaCompraItem[];
}

export interface FacturaCompraItem {
    id: string;
    facturaId: string;
    ordenCompraItemId: string;
    productoCodigo: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    unidadMedida: string;
}

// =====================================================
// FUNCIONES DE CÁLCULO
// =====================================================

/**
 * Calcula el saldo logístico (pendiente de entrega)
 */
export function calcularSaldoLogistico(item: OrdenCompraItem): number {
    if (item.estadoItem === 'CANCELADO') return 0;
    return Math.max(0, item.cantidadPedida - item.cantidadRecibida);
}

/**
 * Calcula el saldo financiero (pendiente de facturación)
 */
export function calcularSaldoFinanciero(item: OrdenCompraItem): number {
    if (item.estadoItem === 'CANCELADO') return 0;
    return Math.max(0, item.cantidadPedida - item.cantidadFacturada);
}

/**
 * Determina si un item está pendiente de remito
 */
export function isPendienteRemito(item: OrdenCompraItem): boolean {
    return item.estadoItem !== 'CANCELADO' && calcularSaldoLogistico(item) > 0;
}

/**
 * Determina si un item está pendiente de factura
 */
export function isPendienteFactura(item: OrdenCompraItem): boolean {
    return item.estadoItem !== 'CANCELADO' && calcularSaldoFinanciero(item) > 0;
}

/**
 * Calcula los totales de la OC
 */
export function calcularTotalesOC(
    items: OrdenCompraItem[],
    tasaImpuesto: number = 0.21
): { neto: number; impuestos: number; total: number } {
    const neto = items.reduce((acc, item) => {
        if (item.estadoItem === 'CANCELADO') return acc;
        return acc + item.cantidadPedida * item.precioUnitario;
    }, 0);

    const impuestos = neto * tasaImpuesto;
    const total = neto + impuestos;

    return { neto, impuestos, total };
}

/**
 * Obtiene resumen de estado de la OC
 */
export function getResumenEstadoOC(oc: OrdenCompra): {
    pendienteRemito: boolean;
    pendienteFactura: boolean;
    itemsPendientesRemito: number;
    itemsPendientesFactura: number;
} {
    const itemsActivos = oc.items.filter(i => i.estadoItem !== 'CANCELADO');
    const itemsPendientesRemito = itemsActivos.filter(isPendienteRemito).length;
    const itemsPendientesFactura = itemsActivos.filter(isPendienteFactura).length;

    return {
        pendienteRemito: itemsPendientesRemito > 0,
        pendienteFactura: itemsPendientesFactura > 0,
        itemsPendientesRemito,
        itemsPendientesFactura,
    };
}

/**
 * Valida si se puede editar un campo según el estado de la OC
 */
export function puedeEditarCampo(
    estado: EstadoOC,
    campo: 'proveedor' | 'items' | 'precios' | 'moneda' | 'tipoCambio' | 'cantidadPedida' | 'condicionesPago'
): boolean {
    if (estado === 'CANCELADA') return false;

    if (estado === 'ABIERTA') return true;

    // Estado CERRADA - solo algunos campos editables
    if (estado === 'CERRADA') {
        return campo === 'cantidadPedida' || campo === 'condicionesPago';
    }

    return false;
}

/**
 * Genera el próximo número de OC
 */
export function generarNumeroOC(año: number, secuencia: number): string {
    return `OC-${año}-${secuencia.toString().padStart(4, '0')}`;
}
