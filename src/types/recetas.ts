// =====================================================
// TIPOS DE RECETAS CON COSTEO TEÓRICO
// =====================================================

import { TipoProducto, TipoMateriaPrima } from './index';

// Estados de receta
export type EstadoReceta = 'ACTIVA' | 'INACTIVA' | 'BORRADOR';

export const EstadoRecetaLabels: Record<EstadoReceta, string> = {
    ACTIVA: 'Activa',
    INACTIVA: 'Inactiva',
    BORRADOR: 'Borrador',
};

// =====================================================
// INTERFACES
// =====================================================

export interface ProductoConCosto {
    id: string;
    codigo: string;
    nombre: string;
    tipo: TipoProducto;
    tipoMateriaPrima?: TipoMateriaPrima;
    unidadMedida: string;
    // Datos de costo
    costoUnitario: number;          // Último precio de compra o costo calculado
    costoPromedioPonderado?: number; // Costo promedio histórico
    fechaUltimoCosto: string;        // Fecha del último precio
    variacionPrecio?: number;        // % variación vs precio anterior
}

export interface ComponenteReceta {
    id: string;
    productoId: string;
    productoCodigo: string;
    productoNombre: string;
    productoTipo: TipoProducto;
    unidadMedida: string;
    cantidad: number;
    // Costos calculados
    costoUnitario: number;
    costoSubtotal: number;
    esRecetaAnidada: boolean;       // true si es SE/PT con sub-receta
    recetaId?: string;              // ID de la receta del componente (si aplica)
    variacionPrecio?: number;       // % variación para alertas
}

export interface Receta {
    id: string;
    codigo: string;
    nombre: string;
    version: number;
    estado: EstadoReceta;
    // Producto resultante
    productoId: string;
    productoCodigo: string;
    productoNombre: string;
    productoTipo: TipoProducto;
    // Cantidades
    cantidadProducida: number;      // Ej: 100 kg, 50 L
    unidadMedida: string;
    // Componentes
    componentes: ComponenteReceta[];
    // Costos calculados
    costoTotal: number;             // Suma de todos los subtotales
    costoPorUnidad: number;         // costoTotal / cantidadProducida
    // Metadata
    fechaCreacion: string;
    fechaModificacion: string;
    usuarioCreacion: string;
}

export interface HistoricoCostoReceta {
    id: string;
    recetaId: string;
    fecha: string;
    costoTotal: number;
    costoPorUnidad: number;
    motivo: 'PRODUCCION' | 'ACTUALIZACION_PRECIOS' | 'MANUAL';
    ordenProduccionId?: string;
}

// =====================================================
// MOCK DATA - Productos con costos
// =====================================================
export const mockProductosConCosto: Record<string, ProductoConCosto> = {
    'MP-001': {
        id: '1',
        codigo: 'MP-001',
        nombre: 'Dióxido de Titanio',
        tipo: 'MP',
        tipoMateriaPrima: 'PIGMENTO',
        unidadMedida: 'kg',
        costoUnitario: 2.80,
        costoPromedioPonderado: 2.65,
        fechaUltimoCosto: '30/01/2026',
        variacionPrecio: 5.6,
    },
    'MP-002': {
        id: '2',
        codigo: 'MP-002',
        nombre: 'Resina Alquídica',
        tipo: 'MP',
        tipoMateriaPrima: 'RESINA',
        unidadMedida: 'kg',
        costoUnitario: 3.50,
        costoPromedioPonderado: 3.20,
        fechaUltimoCosto: '28/01/2026',
        variacionPrecio: 9.4,
    },
    'MP-003': {
        id: '3',
        codigo: 'MP-003',
        nombre: 'Solvente Industrial',
        tipo: 'MP',
        tipoMateriaPrima: 'SOLVENTE',
        unidadMedida: 'L',
        costoUnitario: 1.20,
        costoPromedioPonderado: 1.15,
        fechaUltimoCosto: '25/01/2026',
        variacionPrecio: 4.3,
    },
    'MP-004': {
        id: '4',
        codigo: 'MP-004',
        nombre: 'Carbonato de Calcio',
        tipo: 'MP',
        tipoMateriaPrima: 'CARGA',
        unidadMedida: 'kg',
        costoUnitario: 0.45,
        costoPromedioPonderado: 0.42,
        fechaUltimoCosto: '20/01/2026',
        variacionPrecio: 7.1,
    },
    'ENV-001': {
        id: '5',
        codigo: 'ENV-001',
        nombre: 'Balde 20L',
        tipo: 'ENVASE',
        unidadMedida: 'un',
        costoUnitario: 2.50,
        fechaUltimoCosto: '15/01/2026',
        variacionPrecio: 0,
    },
    'ETQ-001': {
        id: '6',
        codigo: 'ETQ-001',
        nombre: 'Etiqueta Esmalte 20L',
        tipo: 'ETIQUETA',
        unidadMedida: 'un',
        costoUnitario: 0.15,
        fechaUltimoCosto: '10/01/2026',
        variacionPrecio: 0,
    },
};

// =====================================================
// FUNCIONES DE CÁLCULO DE COSTOS
// =====================================================

/**
 * Calcula el costo de un componente
 */
export function calcularCostoComponente(
    cantidad: number,
    costoUnitario: number
): number {
    return cantidad * costoUnitario;
}

/**
 * Calcula el costo total de una receta (recursivo para semielaborados)
 * @param receta - La receta a calcular
 * @param recetasMap - Mapa de todas las recetas para resolver sub-recetas
 * @param productosMap - Mapa de productos con sus costos actuales
 */
export function calcularCostoReceta(
    receta: Receta,
    recetasMap: Record<string, Receta>,
    productosMap: Record<string, ProductoConCosto>
): { costoTotal: number; costoPorUnidad: number; componentes: ComponenteReceta[] } {
    let costoTotal = 0;
    const componentesCalculados: ComponenteReceta[] = [];

    for (const comp of receta.componentes) {
        let costoUnitario = 0;
        let esRecetaAnidada = false;

        // Si es un Semielaborado o Producto Terminado, buscar su receta
        if ((comp.productoTipo === 'SE' || comp.productoTipo === 'PT') && comp.recetaId) {
            const subReceta = recetasMap[comp.recetaId];
            if (subReceta) {
                // Llamada recursiva para calcular el costo del semielaborado
                const subCosto = calcularCostoReceta(subReceta, recetasMap, productosMap);
                costoUnitario = subCosto.costoPorUnidad;
                esRecetaAnidada = true;
            }
        } else {
            // Materia Prima, Envase o Etiqueta: usar costo del producto
            const producto = productosMap[comp.productoCodigo];
            if (producto) {
                costoUnitario = producto.costoUnitario;
            }
        }

        const costoSubtotal = calcularCostoComponente(comp.cantidad, costoUnitario);
        costoTotal += costoSubtotal;

        componentesCalculados.push({
            ...comp,
            costoUnitario,
            costoSubtotal,
            esRecetaAnidada,
        });
    }

    const costoPorUnidad = receta.cantidadProducida > 0
        ? costoTotal / receta.cantidadProducida
        : 0;

    return {
        costoTotal,
        costoPorUnidad,
        componentes: componentesCalculados,
    };
}

/**
 * Determina si un costo tiene variación significativa (para alertas)
 */
export function tieneVariacionSignificativa(
    variacionPrecio: number | undefined,
    umbral: number = 5
): boolean {
    return variacionPrecio !== undefined && Math.abs(variacionPrecio) >= umbral;
}

/**
 * Formatea un costo en moneda
 */
export function formatearCosto(valor: number, decimales: number = 2): string {
    return `$${valor.toFixed(decimales)}`;
}

// =====================================================
// MOCK DATA - Recetas
// =====================================================
export const mockRecetas: Record<string, Receta> = {
    '1': {
        id: '1',
        codigo: 'REC-001',
        nombre: 'Base Blanca Standard',
        version: 1,
        estado: 'ACTIVA',
        productoId: 'SE-001',
        productoCodigo: 'SE-001',
        productoNombre: 'Base Blanca',
        productoTipo: 'SE',
        cantidadProducida: 100,
        unidadMedida: 'kg',
        componentes: [
            { id: '1', productoId: '1', productoCodigo: 'MP-001', productoNombre: 'Dióxido de Titanio', productoTipo: 'MP', unidadMedida: 'kg', cantidad: 25, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false, variacionPrecio: 5.6 },
            { id: '2', productoId: '2', productoCodigo: 'MP-002', productoNombre: 'Resina Alquídica', productoTipo: 'MP', unidadMedida: 'kg', cantidad: 35, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false, variacionPrecio: 9.4 },
            { id: '3', productoId: '3', productoCodigo: 'MP-003', productoNombre: 'Solvente Industrial', productoTipo: 'MP', unidadMedida: 'L', cantidad: 20, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false, variacionPrecio: 4.3 },
            { id: '4', productoId: '4', productoCodigo: 'MP-004', productoNombre: 'Carbonato de Calcio', productoTipo: 'MP', unidadMedida: 'kg', cantidad: 20, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false, variacionPrecio: 7.1 },
        ],
        costoTotal: 0,
        costoPorUnidad: 0,
        fechaCreacion: '15/01/2026',
        fechaModificacion: '15/01/2026',
        usuarioCreacion: 'Admin',
    },
    '2': {
        id: '2',
        codigo: 'REC-002',
        nombre: 'Esmalte Sintético Blanco 20L',
        version: 2,
        estado: 'ACTIVA',
        productoId: 'PT-001',
        productoCodigo: 'PT-001',
        productoNombre: 'Esmalte Sintético Blanco',
        productoTipo: 'PT',
        cantidadProducida: 20,
        unidadMedida: 'L',
        componentes: [
            { id: '5', productoId: 'SE-001', productoCodigo: 'SE-001', productoNombre: 'Base Blanca', productoTipo: 'SE', unidadMedida: 'kg', cantidad: 18, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: true, recetaId: '1' },
            { id: '6', productoId: '3', productoCodigo: 'MP-003', productoNombre: 'Solvente Industrial', productoTipo: 'MP', unidadMedida: 'L', cantidad: 2, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false, variacionPrecio: 4.3 },
            { id: '7', productoId: '5', productoCodigo: 'ENV-001', productoNombre: 'Balde 20L', productoTipo: 'ENVASE', unidadMedida: 'un', cantidad: 1, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false },
            { id: '8', productoId: '6', productoCodigo: 'ETQ-001', productoNombre: 'Etiqueta Esmalte 20L', productoTipo: 'ETIQUETA', unidadMedida: 'un', cantidad: 1, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false },
        ],
        costoTotal: 0,
        costoPorUnidad: 0,
        fechaCreacion: '20/01/2026',
        fechaModificacion: '25/01/2026',
        usuarioCreacion: 'Admin',
    },
    '3': {
        id: '3',
        codigo: 'REC-003',
        nombre: 'Látex Interior Económico 20L',
        version: 1,
        estado: 'ACTIVA',
        productoId: 'PT-002',
        productoCodigo: 'PT-002',
        productoNombre: 'Látex Interior Marfil',
        productoTipo: 'PT',
        cantidadProducida: 20,
        unidadMedida: 'L',
        componentes: [
            { id: '9', productoId: '2', productoCodigo: 'MP-002', productoNombre: 'Resina Alquídica', productoTipo: 'MP', unidadMedida: 'kg', cantidad: 8, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false, variacionPrecio: 9.4 },
            { id: '10', productoId: '4', productoCodigo: 'MP-004', productoNombre: 'Carbonato de Calcio', productoTipo: 'MP', unidadMedida: 'kg', cantidad: 10, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false, variacionPrecio: 7.1 },
            { id: '11', productoId: '5', productoCodigo: 'ENV-001', productoNombre: 'Balde 20L', productoTipo: 'ENVASE', unidadMedida: 'un', cantidad: 1, costoUnitario: 0, costoSubtotal: 0, esRecetaAnidada: false },
        ],
        costoTotal: 0,
        costoPorUnidad: 0,
        fechaCreacion: '22/01/2026',
        fechaModificacion: '22/01/2026',
        usuarioCreacion: 'Admin',
    },
};
