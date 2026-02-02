// =====================================================
// SERVICIO DE ÓRDENES DE PRODUCCIÓN
// =====================================================
// CRUD completo para órdenes de producción y consumos

import type { OrdenProduccion, OrdenProduccionConsumo, Receta, Producto } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DEMO_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function getHeaders() {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
}

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
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion?tenant_id=eq.${DEMO_TENANT_ID}&select=*,receta:recetas(id,codigo,nombre),producto:productos(id,codigo,nombre)&order=created_at.desc`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching ordenes de produccion:', await response.text());
        return [];
    }

    return response.json();
}

/**
 * Obtiene una orden de producción por ID con consumos
 */
export async function getOrdenProduccionById(id: string): Promise<OrdenProduccionConRelaciones | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion?id=eq.${id}&select=*,receta:recetas(*),producto:productos(*)`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching orden de produccion:', await response.text());
        return null;
    }

    const data = await response.json();
    if (!data[0]) return null;

    // Obtener consumos
    const consumos = await getConsumosByOrden(id);
    return { ...data[0], consumos };
}

/**
 * Genera el siguiente número de OP disponible (OP-YYYYMM-NNN)
 */
export async function getNextNumeroOP(): Promise<string> {
    const now = new Date();
    const prefix = `OP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion?tenant_id=eq.${DEMO_TENANT_ID}&numero=like.${prefix}*&select=numero&order=numero.desc&limit=1`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        return `${prefix}-001`;
    }

    const data = await response.json();
    if (!data[0]) return `${prefix}-001`;

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
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion`,
        {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
                ...data,
                tenant_id: DEMO_TENANT_ID,
                estado: 'PLANIFICADA',
                cantidad_producida: 0,
                costo_real_total: 0,
                variacion_porcentaje: 0,
                fecha_creacion: new Date().toISOString(),
            }),
        }
    );

    if (!response.ok) {
        console.error('Error creating orden de produccion:', await response.text());
        return null;
    }

    const result = await response.json();
    return result[0] || null;
}

/**
 * Actualiza una orden de producción
 */
export async function updateOrdenProduccion(id: string, data: Partial<OrdenProduccion>): Promise<OrdenProduccion | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
                ...data,
                updated_at: new Date().toISOString(),
            }),
        }
    );

    if (!response.ok) {
        console.error('Error updating orden de produccion:', await response.text());
        return null;
    }

    const result = await response.json();
    return result[0] || null;
}

/**
 * Elimina una orden de producción (solo si está planificada)
 */
export async function deleteOrdenProduccion(id: string): Promise<boolean> {
    // Primero eliminar consumos
    await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion_consumos?orden_produccion_id=eq.${id}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    );

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion?id=eq.${id}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    );

    return response.ok;
}

// =====================================================
// CONSUMOS DE ORDEN DE PRODUCCIÓN
// =====================================================

/**
 * Obtiene consumos de una orden con datos del producto
 */
export async function getConsumosByOrden(ordenId: string): Promise<OrdenProduccionConsumoConProducto[]> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion_consumos?orden_produccion_id=eq.${ordenId}&select=*,producto:productos(id,codigo,nombre,unidad_medida)&order=created_at`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching consumos:', await response.text());
        return [];
    }

    return response.json();
}

/**
 * Genera los consumos teóricos basados en la receta
 */
export async function generarConsumosTeoricos(ordenId: string, recetaId: string, cantidadProgramada: number): Promise<boolean> {
    // Obtener componentes de la receta
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas_componentes?receta_id=eq.${recetaId}&select=*,producto:productos(id,unidad_medida,costo_unitario)`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching componentes:', await response.text());
        return false;
    }

    const componentes = await response.json();

    // Obtener la receta para saber cuántas unidades produce
    const recetaResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/recetas?id=eq.${recetaId}&select=cantidad_producida`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    const recetaData = await recetaResponse.json();
    const cantidadProducidaReceta = recetaData[0]?.cantidad_producida || 1;

    // Calcular factor de multiplicación
    const factor = cantidadProgramada / cantidadProducidaReceta;

    // Crear consumos teóricos
    for (const comp of componentes) {
        const cantidadTeorica = comp.cantidad * factor;
        const costoTeorico = cantidadTeorica * (comp.costo_unitario || 0);

        await fetch(
            `${SUPABASE_URL}/rest/v1/ordenes_produccion_consumos`,
            {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    tenant_id: DEMO_TENANT_ID,
                    orden_produccion_id: ordenId,
                    producto_id: comp.producto_id,
                    cantidad_teorica: cantidadTeorica,
                    cantidad_real: 0,
                    costo_unitario: comp.costo_unitario || 0,
                    costo_teorico: costoTeorico,
                    costo_real: 0,
                    variacion_cantidad: 0,
                }),
            }
        );
    }

    return true;
}

/**
 * Actualiza el consumo real de un item
 */
export async function updateConsumoReal(id: string, cantidadReal: number): Promise<boolean> {
    // Primero obtener el consumo actual
    const getResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion_consumos?id=eq.${id}`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    const consumoData = await getResponse.json();
    if (!consumoData[0]) return false;

    const consumo = consumoData[0];
    const costoReal = cantidadReal * consumo.costo_unitario;
    const variacionCantidad = ((cantidadReal - consumo.cantidad_teorica) / consumo.cantidad_teorica) * 100;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_produccion_consumos?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                cantidad_real: cantidadReal,
                costo_real: costoReal,
                variacion_cantidad: variacionCantidad,
            }),
        }
    );

    return response.ok;
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
    const { getStockProducto } = await import('./stock');
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

    const updates: Partial<OrdenProduccion> = { estado: estado as any };

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
            const { registrarConsumoProduccion, registrarProduccionPT } = await import('./stock');

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
