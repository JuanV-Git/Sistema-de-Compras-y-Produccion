// =====================================================
// SERVICIO DE ÓRDENES DE PRODUCCIÓN
// =====================================================
// CRUD completo para órdenes de producción y consumos

import { createClient } from '@/lib/supabase/client';
import type { OrdenProduccion, OrdenProduccionConsumo, Receta, Producto } from '@/types/database';
import { getStockProducto, registrarConsumoProduccion, registrarProduccionPT } from './stock';

export type { OrdenProduccion, OrdenProduccionConsumo };

export type EstadoOP = 'PLANIFICADA' | 'EN_PRODUCCION' | 'PAUSADA' | 'COMPLETADA' | 'CANCELADA';

export const EstadoOPLabels: Record<EstadoOP, string> = {
    PLANIFICADA: 'Planificada',
    EN_PRODUCCION: 'En Producción',
    PAUSADA: 'Pausada',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',
};

export interface OrdenProduccionConRelaciones extends OrdenProduccion {
    receta?: Receta;
    producto?: Producto;
    consumos?: OrdenProduccionConsumoConProducto[];
}

export interface OrdenProduccionConsumoConProducto extends OrdenProduccionConsumo {
    producto?: Producto;
}

// =====================================================
// CRUD ÓRDENES DE PRODUCCIÓN
// =====================================================

/**
 * Obtiene todas las órdenes de producción con receta y producto
 */
export async function getOrdenesProduccion(): Promise<OrdenProduccionConRelaciones[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('ordenes_produccion')
        .select('*, receta:recetas(id,codigo,nombre), producto:productos(id,codigo,nombre)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching ordenes de produccion:', error);
        return [];
    }

    return (data || []) as unknown as OrdenProduccionConRelaciones[];
}

/**
 * Obtiene una orden de producción por ID con consumos
 */
export async function getOrdenProduccionById(id: string): Promise<OrdenProduccionConRelaciones | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('ordenes_produccion')
        .select('*, receta:recetas(*), producto:productos(*)')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching orden de produccion:', error);
        return null;
    }

    if (!data) return null;

    // Obtener consumos
    const consumos = await getConsumosByOrden(id);
    return { ...data, consumos } as unknown as OrdenProduccionConRelaciones;
}

/**
 * Genera el siguiente número de OP disponible (OP-YYYYMM-NNN)
 */
export async function getNextNumeroOP(): Promise<string> {
    const supabase = createClient();
    const now = new Date();
    const prefix = `OP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data } = await supabase
        .from('ordenes_produccion')
        .select('numero')
        .ilike('numero', `${prefix}%`)
        .order('numero', { ascending: false })
        .limit(1);

    if (!data || data.length === 0) {
        return `${prefix}-001`;
    }

    const lastNum = data[0].numero;
    const match = lastNum.match(/-(\d{3})$/);
    const nextNum = match ? parseInt(match[1], 10) + 1 : 1;

    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}

export type CreateOrdenProduccionData = {
    numero: string;
    receta_id: string;
    producto_id?: string;
    cantidad_programada: number;
    unidad_medida: string;
    costo_teorico_total: number;
    observaciones?: string;
};

/**
 * Crea una nueva orden de producción
 */
export async function createOrdenProduccion(data: CreateOrdenProduccionData): Promise<OrdenProduccion | null> {
    const supabase = createClient();

    const insertData = {
        ...data,
        estado: 'PLANIFICADA',
        cantidad_producida: 0,
        costo_real_total: 0,
        variacion_porcentaje: 0,
        fecha_creacion: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
        .from('ordenes_produccion')
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('Error creating orden de produccion:', error);
        return null;
    }

    return result;
}

/**
 * Actualiza una orden de producción
 */
export async function updateOrdenProduccion(id: string, data: Partial<OrdenProduccion>): Promise<OrdenProduccion | null> {
    const supabase = createClient();

    const { data: result, error } = await supabase
        .from('ordenes_produccion')
        .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating orden de produccion:', error);
        return null;
    }

    return result;
}

/**
 * Elimina una orden de producción.
 * Realiza Hard Delete de consumo: OrdenProduccionConsumo orden.
 */
export async function deleteOrdenProduccion(id: string): Promise<boolean> {
    const supabase = createClient();

    // 1. Eliminar consumos primero
    const { error: consumosError } = await supabase
        .from('ordenes_produccion_consumos')
        .delete()
        .eq('orden_produccion_id', id);

    if (consumosError) {
        console.error('Error deleting consumos:', consumosError);
        throw new Error(`Error al eliminar consumos: ${consumosError.message}`);
    }

    // 2. Eliminar la orden
    const { error } = await supabase
        .from('ordenes_produccion')
        .delete()
        .eq('id', id);

    if (error) {
        if (error.code === '23503') {
            throw new Error('No se puede eliminar la orden porque tiene registros asociados (movimientos de stock).');
        }
        console.error('Error deleting orden produccion:', error);
        throw new Error(error.message);
    }

    return true;
}

// =====================================================
// CONSUMOS DE ORDEN DE PRODUCCIÓN
// =====================================================

/**
 * Obtiene consumos de una orden con datos del producto
 */
export async function getConsumosByOrden(ordenId: string): Promise<OrdenProduccionConsumoConProducto[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('ordenes_produccion_consumos')
        .select('*, producto:productos(id,codigo,nombre,unidad_medida)')
        .eq('orden_produccion_id', ordenId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching consumos:', error);
        return [];
    }

    return (data || []) as unknown as OrdenProduccionConsumoConProducto[];
}

/**
 * Genera los consumos teóricos basados en la receta
 */
export async function generarConsumosTeoricos(ordenId: string, recetaId: string, cantidadProgramada: number): Promise<boolean> {
    const supabase = createClient();

    // Obtener componentes de la receta
    const { data: componentes, error: compError } = await supabase
        .from('recetas_componentes')
        .select('*, producto:productos(id,unidad_medida,costo_unitario)')
        .eq('receta_id', recetaId);

    if (compError || !componentes) {
        console.error('Error fetching componentes:', compError);
        return false;
    }

    // Obtener la receta para saber cuántas unidades produce
    const { data: recetaData } = await supabase
        .from('recetas')
        .select('cantidad_producida')
        .eq('id', recetaId)
        .single();

    const cantidadProducidaReceta = recetaData?.cantidad_producida || 1;
    const factor = cantidadProgramada / cantidadProducidaReceta;

    let totalCostoTeorico = 0;

    // Crear consumos teóricos
    for (const comp of componentes) {
        const cantidadTeorica = comp.cantidad * factor;
        const costoTeorico = cantidadTeorica * (comp.costo_unitario || 0);

        totalCostoTeorico += costoTeorico;

        await supabase.from('ordenes_produccion_consumos').insert({
            orden_produccion_id: ordenId,
            producto_id: comp.producto_id,
            cantidad_teorica: cantidadTeorica,
            cantidad_real: 0,
            costo_unitario: comp.costo_unitario || 0,
            costo_teorico: costoTeorico,
            costo_real: 0,
            variacion_cantidad: 0,
        });
    }

    // Update the OP's total theoretical cost based on the strict sum of its components
    await supabase.from('ordenes_produccion').update({
        costo_teorico_total: totalCostoTeorico
    }).eq('id', ordenId);

    return true;
}

/**
 * Actualiza el consumo real de un item
 */
export async function updateConsumoReal(id: string, cantidadReal: number): Promise<boolean> {
    const supabase = createClient();

    // Primero obtener el consumo actual
    const { data: consumo } = await supabase
        .from('ordenes_produccion_consumos')
        .select('*')
        .eq('id', id)
        .single();

    if (!consumo) return false;

    const costoReal = cantidadReal * consumo.costo_unitario;
    const variacionCantidad = ((cantidadReal - consumo.cantidad_teorica) / consumo.cantidad_teorica) * 100;

    const { error } = await supabase
        .from('ordenes_produccion_consumos')
        .update({
            cantidad_real: cantidadReal,
            costo_real: costoReal,
            variacion_cantidad: variacionCantidad,
        })
        .eq('id', id);

    return !error;
}

/**
 * Estructura para reporte de faltantes
 */
export interface ReporteFaltantes {
    valido: boolean;
    faltantes: {
        productoId: string;
        codigo: string;
        nombre: string;
        requerido: number;
        disponible: number;
        faltante: number;
        unidad: string;
    }[];
}

/**
 * Verifica si hay stock suficiente para los consumos de una orden
 */
export async function verificarDisponibilidadStock(ordenId: string): Promise<ReporteFaltantes> {
    const consumos = await getConsumosByOrden(ordenId);

    const reporte: ReporteFaltantes = {
        valido: true,
        faltantes: []
    };

    for (const consumo of consumos) {
        if (consumo.cantidad_teorica > 0 && consumo.producto_id) {
            const stockActual = await getStockProducto(consumo.producto_id);
            if (stockActual < consumo.cantidad_teorica) {
                reporte.valido = false;
                reporte.faltantes.push({
                    productoId: consumo.producto_id,
                    codigo: consumo.producto?.codigo || '???',
                    nombre: consumo.producto?.nombre || 'Desconocido',
                    requerido: consumo.cantidad_teorica,
                    disponible: stockActual,
                    faltante: consumo.cantidad_teorica - stockActual,
                    unidad: consumo.producto?.unidad_medida || 'u'
                });
            }
        }
    }

    return reporte;
}

/**
 * Cambia el estado de la orden
 */
export async function cambiarEstadoOrdenProduccion(
    id: string,
    estado: EstadoOP,
    forzarInicio: boolean = false
): Promise<{ success: boolean; error?: string; faltantes?: ReporteFaltantes }> {

    // Validación de stock antes de iniciar
    if (estado === 'EN_PRODUCCION' && !forzarInicio) {
        const reporte = await verificarDisponibilidadStock(id);
        if (!reporte.valido) {
            return {
                success: false,
                error: 'STOCK_INSUFICIENTE',
                faltantes: reporte
            };
        }
    }

    const updates: Partial<OrdenProduccion> = { estado };

    if (estado === 'EN_PRODUCCION') {
        updates.fecha_inicio = new Date().toISOString();
    } else if (estado === 'COMPLETADA') {
        updates.fecha_cierre = new Date().toISOString();

        // Calcular costo real y variación
        const consumos = await getConsumosByOrden(id);
        const costoRealTotal = consumos.reduce((acc, c) => acc + (c.costo_real || 0), 0);
        updates.costo_real_total = costoRealTotal;

        // Obtener orden para calcular variación
        const orden = await getOrdenProduccionById(id);
        if (orden && orden.costo_teorico_total > 0) {
            updates.variacion_porcentaje = ((costoRealTotal - orden.costo_teorico_total) / orden.costo_teorico_total) * 100;
        }

        // ============================================
        // MOVIMIENTOS DE STOCK AL COMPLETAR OP
        // ============================================
        if (orden) {
            // 1. SALIDA por cada MP consumida
            for (const consumo of consumos) {
                if (consumo.cantidad_real && consumo.cantidad_real > 0) {
                    try {
                        await registrarConsumoProduccion(
                            consumo.producto_id,
                            consumo.cantidad_real,
                            orden.numero,
                            orden.id,
                            consumo.costo_unitario
                        );
                        console.log(`Stock: SALIDA ${consumo.cantidad_real} de ${consumo.producto?.codigo || consumo.producto_id}`);
                    } catch (error) {
                        console.error(`Error registrando consumo de ${consumo.producto_id}:`, error);
                    }
                }
            }

            // 2. ENTRADA del PT producido
            if (orden.producto_id && orden.cantidad_producida && orden.cantidad_producida > 0) {
                try {
                    const costoUnitarioPT = costoRealTotal / orden.cantidad_producida;
                    await registrarProduccionPT(
                        orden.producto_id,
                        orden.cantidad_producida,
                        orden.numero,
                        orden.id,
                        costoUnitarioPT
                    );
                    console.log(`Stock: ENTRADA ${orden.cantidad_producida} de PT ${orden.producto_id}`);
                } catch (error) {
                    console.error(`Error registrando producción de PT:`, error);
                }
            }
        }
    }

    const result = await updateOrdenProduccion(id, updates);
    return { success: result !== null };
}

/**
 * Registra la cantidad producida
 */
export async function registrarProduccion(id: string, cantidadProducida: number): Promise<boolean> {
    const result = await updateOrdenProduccion(id, { cantidad_producida: cantidadProducida });
    return result !== null;
}
