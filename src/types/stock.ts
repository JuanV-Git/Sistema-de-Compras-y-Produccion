// =====================================================
// TIPOS DE CONTROL DE STOCK
// =====================================================

import { TipoProducto, TipoMateriaPrima } from './index';

// Tipos de movimiento de stock
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';

export const TipoMovimientoLabels: Record<TipoMovimiento, string> = {
    ENTRADA: 'Entrada',
    SALIDA: 'Salida',
    AJUSTE_POSITIVO: 'Ajuste (+)',
    AJUSTE_NEGATIVO: 'Ajuste (-)',
};

// Orígenes de movimiento
export type OrigenMovimiento =
    | 'COMPRA'
    | 'REMITO_COMPRA' // Legacy support if needed, or remove
    | 'PRODUCCION_PT'
    | 'ORDEN_PRODUCCION' // Legacy
    | 'CONSUMO_PRODUCCION'
    | 'DEVOLUCION_PROVEEDOR'
    | 'AJUSTE_POSITIVO'
    | 'AJUSTE_NEGATIVO'
    | 'AJUSTE_MANUAL' // Legacy
    | 'INVENTARIO_INICIAL'
    | 'TRASPASO_ENTRADA'
    | 'TRASPASO_SALIDA';

export const OrigenMovimientoLabels: Record<OrigenMovimiento, string> = {
    COMPRA: 'Compra',
    REMITO_COMPRA: 'Remito Compra',
    PRODUCCION_PT: 'Producción (PT)',
    ORDEN_PRODUCCION: 'Orden Producción',
    CONSUMO_PRODUCCION: 'Consumo Producción',
    DEVOLUCION_PROVEEDOR: 'Devolución Prov.',
    AJUSTE_POSITIVO: 'Ajuste (+)',
    AJUSTE_NEGATIVO: 'Ajuste (-)',
    AJUSTE_MANUAL: 'Ajuste Manual',
    INVENTARIO_INICIAL: 'Inv. Inicial',
    TRASPASO_ENTRADA: 'Traspaso Ent.',
    TRASPASO_SALIDA: 'Traspaso Sal.',
};

// =====================================================
// INTERFACES
// =====================================================

export interface ProductoStock {
    id: string;
    codigo: string;
    nombre: string;
    tipo: TipoProducto;
    tipoMateriaPrima?: TipoMateriaPrima;
    unidadMedida: string;
    // Stock
    stockActual: number;
    stockMinimo: number;
    stockMaximo?: number;
    // Calculados
    nivelStock: 'CRITICO' | 'BAJO' | 'NORMAL' | 'ALTO';
    porcentajeNivel: number;
    // Costos
    costoUnitario: number;
    valorizado: number; // stockActual * costoUnitario
}

export interface MovimientoStock {
    id: string;
    fecha: string;
    hora: string;
    productoId: string;
    productoCodigo: string;
    productoNombre: string;
    tipoMovimiento: TipoMovimiento;
    origen: OrigenMovimiento;
    // Documento origen
    documentoId?: string;
    documentoNumero?: string;
    // Cantidades
    cantidad: number;
    unidadMedida: string;
    stockAnterior: number;
    stockPosterior: number;
    // Costo
    costoUnitario?: number;
    costoTotal?: number;
    // Metadata
    usuario: string;
    observaciones?: string;
}

// =====================================================
// FUNCIONES DE CÁLCULO
// =====================================================

/**
 * Calcula el nivel de stock de un producto
 */
export function calcularNivelStock(
    stockActual: number,
    stockMinimo: number,
    stockMaximo?: number
): { nivel: ProductoStock['nivelStock']; porcentaje: number } {
    if (stockActual <= 0) {
        return { nivel: 'CRITICO', porcentaje: 0 };
    }

    if (stockActual < stockMinimo) {
        const porcentaje = (stockActual / stockMinimo) * 50; // 0-50%
        return { nivel: 'CRITICO', porcentaje: Math.round(porcentaje) };
    }

    if (stockActual === stockMinimo) {
        return { nivel: 'BAJO', porcentaje: 50 };
    }

    if (stockMaximo && stockActual >= stockMaximo) {
        return { nivel: 'ALTO', porcentaje: 100 };
    }

    // Entre mínimo y máximo (o sin máximo definido)
    const rangoNormal = stockMaximo ? stockMaximo - stockMinimo : stockMinimo * 2;
    const posicionEnRango = stockActual - stockMinimo;
    const porcentaje = 50 + (posicionEnRango / rangoNormal) * 50;

    return {
        nivel: stockActual < stockMinimo * 1.5 ? 'BAJO' : 'NORMAL',
        porcentaje: Math.min(100, Math.round(porcentaje))
    };
}

/**
 * Obtiene el color del nivel de stock
 */
export function getNivelStockColor(nivel: ProductoStock['nivelStock']): string {
    const colors: Record<string, string> = {
        CRITICO: 'var(--color-danger)',
        BAJO: 'var(--color-warning)',
        NORMAL: 'var(--color-success)',
        ALTO: 'var(--accent-gold)',
    };
    return colors[nivel];
}

/**
 * Obtiene el color del tipo de movimiento
 */
export function getTipoMovimientoColor(tipo: TipoMovimiento): string {
    const colors: Record<TipoMovimiento, string> = {
        ENTRADA: 'var(--color-success)',
        SALIDA: 'var(--color-danger)',
        AJUSTE_POSITIVO: 'var(--accent-gold)',
        AJUSTE_NEGATIVO: 'var(--color-warning)',
    };
    return colors[tipo];
}

/**
 * Formatea cantidad con signo según tipo de movimiento
 */
export function formatCantidadMovimiento(cantidad: number, tipo: TipoMovimiento): string {
    const signo = tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO' ? '+' : '-';
    return `${signo}${cantidad.toLocaleString()}`;
}

// Mocks eliminados para usar datos reales

// =====================================================
// FUNCIONES DE RESUMEN
// =====================================================

export function getResumenStock(productos: ProductoStock[]) {
    const total = productos.length;
    const criticos = productos.filter(p => p.nivelStock === 'CRITICO').length;
    const bajos = productos.filter(p => p.nivelStock === 'BAJO').length;
    const normales = productos.filter(p => p.nivelStock === 'NORMAL').length;
    const valorTotal = productos.reduce((acc, p) => acc + p.valorizado, 0);

    return { total, criticos, bajos, normales, valorTotal };
}
