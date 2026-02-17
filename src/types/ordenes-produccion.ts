// =====================================================
// TIPOS DE ÓRDENES DE PRODUCCIÓN
// =====================================================

import { TipoProducto } from './index';
import { mockRecetas, mockProductosConCosto, calcularCostoReceta } from './recetas';

// Estados de OP
export type EstadoOP = 'ABIERTA' | 'EN_PROCESO' | 'CERRADA' | 'CANCELADA';

export const EstadoOPLabels: Record<EstadoOP, string> = {
    ABIERTA: 'Abierta',
    EN_PROCESO: 'En Proceso',
    CERRADA: 'Cerrada',
    CANCELADA: 'Cancelada',
};

// =====================================================
// INTERFACES
// =====================================================

export interface ConsumoOP {
    id: string;
    productoId: string;
    productoCodigo: string;
    productoNombre: string;
    productoTipo: TipoProducto;
    unidadMedida: string;
    // Cantidades
    cantidadTeorica: number;      // Calculada desde la receta
    cantidadReal: number;         // Ingresada al cerrar (editable)
    // Costos
    costoUnitario: number;
    costoTeorico: number;         // cantidadTeorica * costoUnitario
    costoReal: number;            // cantidadReal * costoUnitario
    // Variación
    variacionCantidad: number;    // % diferencia real vs teórico
    variacionCosto: number;       // Diferencia en $ 
}

export interface OrdenProduccion {
    id: string;
    numeroOP: string;
    estado: EstadoOP;
    // Receta base
    recetaId: string;
    recetaCodigo: string;
    recetaNombre: string;
    // Producto resultante
    productoId: string;
    productoCodigo: string;
    productoNombre: string;
    productoTipo: TipoProducto;
    // Cantidades
    cantidadProgramada: number;   // Lo que se quiere producir
    cantidadProducida: number;    // Lo que realmente se produjo
    unidadMedida: string;
    // Consumos
    consumos: ConsumoOP[];
    // Costos totales
    costoTeoricoTotal: number;
    costoRealTotal: number;
    variacionTotal: number;       // % variación costo total
    // Metadata
    fechaCreacion: string;
    fechaInicio?: string;
    fechaCierre?: string;
    usuarioCreacion: string;
    usuarioCierre?: string;
    observaciones?: string;
}

// =====================================================
// FUNCIONES DE CÁLCULO
// =====================================================

/**
 * Genera los consumos teóricos para una OP basándose en la receta
 * @param recetaId ID de la receta base
 * @param cantidadProgramada Cantidad a producir
 */
export function generarConsumosDesdeReceta(
    recetaId: string,
    cantidadProgramada: number
): ConsumoOP[] {
    const receta = mockRecetas[recetaId];
    if (!receta) return [];

    // Calcular costos de la receta
    const { componentes } = calcularCostoReceta(receta, mockRecetas, mockProductosConCosto);

    // Factor de escala: si la receta produce 100kg y queremos 50kg, factor = 0.5
    const factorEscala = cantidadProgramada / receta.cantidadProducida;

    return componentes.map((comp, idx) => {
        const cantidadTeorica = comp.cantidad * factorEscala;
        const costoTeorico = comp.costoUnitario * cantidadTeorica;

        return {
            id: `consumo-${idx}`,
            productoId: comp.productoId,
            productoCodigo: comp.productoCodigo,
            productoNombre: comp.productoNombre,
            productoTipo: comp.productoTipo,
            unidadMedida: comp.unidadMedida,
            cantidadTeorica: Math.round(cantidadTeorica * 100) / 100,
            cantidadReal: Math.round(cantidadTeorica * 100) / 100, // Inicia igual al teórico
            costoUnitario: comp.costoUnitario,
            costoTeorico: Math.round(costoTeorico * 100) / 100,
            costoReal: Math.round(costoTeorico * 100) / 100,
            variacionCantidad: 0,
            variacionCosto: 0,
        };
    });
}

/**
 * Recalcula los consumos reales y variaciones
 */
export function recalcularConsumos(consumos: ConsumoOP[]): ConsumoOP[] {
    return consumos.map(c => {
        const costoReal = c.cantidadReal * c.costoUnitario;
        const variacionCantidad = c.cantidadTeorica > 0
            ? ((c.cantidadReal - c.cantidadTeorica) / c.cantidadTeorica) * 100
            : 0;
        const variacionCosto = costoReal - c.costoTeorico;

        return {
            ...c,
            costoReal: Math.round(costoReal * 100) / 100,
            variacionCantidad: Math.round(variacionCantidad * 10) / 10,
            variacionCosto: Math.round(variacionCosto * 100) / 100,
        };
    });
}

/**
 * Calcula totales de una OP
 */
export function calcularTotalesOP(consumos: ConsumoOP[]): {
    costoTeoricoTotal: number;
    costoRealTotal: number;
    variacionTotal: number;
} {
    const costoTeoricoTotal = consumos.reduce((acc, c) => acc + c.costoTeorico, 0);
    const costoRealTotal = consumos.reduce((acc, c) => acc + c.costoReal, 0);
    const variacionTotal = costoTeoricoTotal > 0
        ? ((costoRealTotal - costoTeoricoTotal) / costoTeoricoTotal) * 100
        : 0;

    return {
        costoTeoricoTotal: Math.round(costoTeoricoTotal * 100) / 100,
        costoRealTotal: Math.round(costoRealTotal * 100) / 100,
        variacionTotal: Math.round(variacionTotal * 10) / 10,
    };
}

/**
 * Formatea variación con color
 */
export function getVariacionColor(variacion: number): string {
    if (variacion > 5) return 'text-[var(--color-danger)]';
    if (variacion < -5) return 'text-[var(--color-success)]';
    return 'text-[var(--text-secondary)]';
}

/**
 * Formatea variación con símbolo
 */
export function formatVariacion(variacion: number): string {
    const signo = variacion > 0 ? '+' : '';
    return `${signo}${variacion.toFixed(1)}%`;
}

// =====================================================
// MOCK DATA - Órdenes de Producción
// =====================================================

// OP Abierta (recién creada)
const consumosOP1 = generarConsumosDesdeReceta('1', 50);

// OP Cerrada con variaciones reales
const consumosOP2Base = generarConsumosDesdeReceta('2', 100);
const consumosOP2 = recalcularConsumos(consumosOP2Base.map((c, i) => ({
    ...c,
    cantidadReal: c.cantidadTeorica * (1 + (i % 2 === 0 ? 0.05 : -0.03)), // Variaciones simuladas
})));

// OP En Proceso
const consumosOP3 = generarConsumosDesdeReceta('1', 200);

export const mockOrdenesProduccion: Record<string, OrdenProduccion> = {
    '1': {
        id: '1',
        numeroOP: 'OP-2026-0042',
        estado: 'ABIERTA',
        recetaId: '1',
        recetaCodigo: 'REC-001',
        recetaNombre: 'Base Blanca Standard',
        productoId: 'SE-001',
        productoCodigo: 'SE-001',
        productoNombre: 'Base Blanca',
        productoTipo: 'SE',
        cantidadProgramada: 50,
        cantidadProducida: 0,
        unidadMedida: 'kg',
        consumos: consumosOP1,
        ...calcularTotalesOP(consumosOP1),
        fechaCreacion: '01/02/2026',
        usuarioCreacion: 'Juan Pérez',
    },
    '2': {
        id: '2',
        numeroOP: 'OP-2026-0041',
        estado: 'CERRADA',
        recetaId: '2',
        recetaCodigo: 'REC-002',
        recetaNombre: 'Esmalte Sintético Blanco 20L',
        productoId: 'PT-001',
        productoCodigo: 'PT-001',
        productoNombre: 'Esmalte Sintético Blanco',
        productoTipo: 'PT',
        cantidadProgramada: 100,
        cantidadProducida: 98,
        unidadMedida: 'L',
        consumos: consumosOP2,
        ...calcularTotalesOP(consumosOP2),
        fechaCreacion: '28/01/2026',
        fechaInicio: '29/01/2026',
        fechaCierre: '30/01/2026',
        usuarioCreacion: 'María García',
        usuarioCierre: 'Juan Pérez',
        observaciones: 'Leve merma en solvente por evaporación',
    },
    '3': {
        id: '3',
        numeroOP: 'OP-2026-0043',
        estado: 'EN_PROCESO',
        recetaId: '1',
        recetaCodigo: 'REC-001',
        recetaNombre: 'Base Blanca Standard',
        productoId: 'SE-001',
        productoCodigo: 'SE-001',
        productoNombre: 'Base Blanca',
        productoTipo: 'SE',
        cantidadProgramada: 200,
        cantidadProducida: 0,
        unidadMedida: 'kg',
        consumos: consumosOP3,
        ...calcularTotalesOP(consumosOP3),
        fechaCreacion: '01/02/2026',
        fechaInicio: '01/02/2026',
        usuarioCreacion: 'Carlos López',
    },
};
