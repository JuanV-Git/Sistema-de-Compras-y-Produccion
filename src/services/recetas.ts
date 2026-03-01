// =====================================================
// SERVICIO DE API REST - RECETAS
// =====================================================

import { createClient } from '@/lib/supabase/client';
import type { Receta, RecetaComponente, EstadoReceta } from '@/types/database';
import { getTipoCambio } from './configuracion'; // Importar tipo cambio
import { updateProducto } from './productos'; // Importar updateProducto

// =====================================================
// RECETAS
// =====================================================

/**
 * Obtiene todas las recetas
 */
export async function getRecetas(): Promise<Receta[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('recetas')
        .select('*')
        .order('codigo');

    if (error) {
        console.error('Error fetching recetas:', error);
        return [];
    }

    return data || [];
}

/**
 * Obtiene una receta por ID
 */
export async function getRecetaById(id: string): Promise<Receta | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('recetas')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching receta:', error);
        return null;
    }

    return data;
}

/**
 * Genera el siguiente código de receta disponible
 * Formato: REC-001, REC-002, etc.
 */
export async function getNextCodigoReceta(): Promise<string> {
    const supabase = createClient();

    const { data } = await supabase
        .from('recetas')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(100);

    if (!data) return 'REC-001';

    let maxNum = 0;
    for (const r of data) {
        const match = r.codigo?.match(/REC-(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }

    const nextNum = maxNum + 1;
    return `REC-${String(nextNum).padStart(3, '0')}`;
}

export type CreateRecetaData = {
    codigo: string;
    nombre: string;
    version?: number;
    producto_id?: string;
    cantidad_producida: number;
    unidad_medida: string;
    estado: EstadoReceta;
    observaciones?: string;
};

/**
 * Crea una nueva receta
 */
export async function createReceta(receta: CreateRecetaData): Promise<Receta | null> {
    const supabase = createClient();

    const insertData = {
        ...receta,
        version: receta.version || 1,
        costo_total: 0,
        costo_por_unidad: 0,
    };

    const { data, error } = await supabase
        .from('recetas')
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('Error creating receta:', error);
        throw new Error(`Error al crear receta: ${error.message}`);
    }

    return data;
}

/**
 * Actualiza una receta existente
 */
export async function updateReceta(
    id: string,
    receta: Partial<CreateRecetaData>
): Promise<Receta | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('recetas')
        .update({
            ...receta,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating receta:', error);
        return null;
    }

    return data;
}

/**
 * Elimina una receta.
 * Hard Delete: Si está vinculada a OPs o Productos, fallará por FK.
 */
export async function deleteReceta(id: string): Promise<boolean> {
    const supabase = createClient();

    // 1. Borrar componentes
    const { error: compError } = await supabase
        .from('recetas_componentes')
        .delete()
        .eq('receta_id', id);

    if (compError) {
        console.error('Error deleting componentes of receta:', compError);
        throw new Error('No se pueden eliminar los componentes de la receta.');
    }

    // 2. Borrar receta
    const { error } = await supabase
        .from('recetas')
        .delete()
        .eq('id', id);

    if (error) {
        if (error.code === '23503') {
            throw new Error('No se puede eliminar la receta porque está vinculada a Órdenes de Producción.');
        }
        console.error('Error deleting receta:', error);
        throw new Error(error.message);
    }

    return true;
}

/**
 * Vincula una receta a un producto (usado desde ProductoForm)
 */
export async function linkRecetaToProducto(recetaId: string, productoId: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from('recetas')
        .update({
            producto_id: productoId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', recetaId);

    if (error) {
        console.error('Error linking receta to producto:', error);
        return false;
    }

    return true;
}

/**
 * Actualiza los costos de una receta
 */
export async function updateRecetaCostos(recetaId: string): Promise<void> {
    // Optimización: Fetch concurrente de componentes, receta y tipo de cambio
    const [componentes, receta, tc] = await Promise.all([
        getComponentesByReceta(recetaId),
        getRecetaById(recetaId),
        getTipoCambio()
    ]);

    if (!receta) return;

    // Calcular totales en ARS y USD
    let totalArs = 0;
    let totalUsd = 0;

    for (const c of componentes) {
        const monedaComp = c.moneda || 'ARS';
        const costoSubtotal = c.costo_subtotal || 0;

        if (monedaComp === 'USD') {
            totalUsd += costoSubtotal;
            totalArs += costoSubtotal * tc;
        } else {
            totalArs += costoSubtotal;
            totalUsd += costoSubtotal / tc;
        }
    }

    const cantidad = receta.cantidad_producida > 0 ? receta.cantidad_producida : 1;
    const costoUnitArs = totalArs / cantidad;
    const costoUnitUsd = totalUsd / cantidad;

    const supabase = createClient();

    // Update concurrente: Receta y su Producto vinculado (si existe)
    const updateRecetaPromise = supabase
        .from('recetas')
        .update({
            costo_total: totalArs,
            costo_por_unidad: costoUnitArs,
            costo_total_usd: totalUsd,
            costo_por_unidad_usd: costoUnitUsd,
            updated_at: new Date().toISOString(),
        })
        .eq('id', recetaId);

    const updatePromises: any[] = [updateRecetaPromise];

    if (receta.producto_id) {
        updatePromises.push(
            updateProducto(receta.producto_id, {
                costo_unitario: costoUnitArs,
            })
        );
    }

    await Promise.all(updatePromises);
}

// ... (previous code)

/**
 * Actualiza los costos de todos los componentes de una receta usando los costos directos de los productos (Insumos).
 */
export async function actualizarCostosRecetaDesdeInsumos(recetaId: string): Promise<boolean> {
    const componentes = await getComponentesByReceta(recetaId);
    let updatedCount = 0;

    for (const comp of componentes) {
        // Solo actualizar si NO es una sub-receta (o podríamos verificar tipo MP/Env/Etiq)
        // Por simplificación, tomamos el costo_unitario del producto vinculado
        const nuevoCosto = comp.producto?.costo_unitario || 0;
        const nuevaMoneda = comp.producto?.moneda_costo || 'ARS';

        // Verificar si costó O moneda cambiaron
        const costoCambio = Math.abs(comp.costo_unitario - nuevoCosto) > 0.01;
        const monedaCambio = comp.moneda !== nuevaMoneda;

        if (costoCambio || monedaCambio) {
            await updateComponente(comp.id, {
                costo_unitario: nuevoCosto,
                moneda: nuevaMoneda,
                cantidad: comp.cantidad
            }, recetaId);
            updatedCount++;
        }
    }

    if (updatedCount > 0) {
        await updateRecetaCostos(recetaId);
        return true;
    }
    return false;
}

/**
 * Recalcula recursivamente los costos de una receta y sus dependencias.
 */
async function recalcularCostoRecursivo(
    recetaId: string,
    recetasMap: Map<string, Receta>,
    visited: Set<string>
): Promise<void> {
    if (visited.has(recetaId)) {
        return;
    }
    visited.add(recetaId);

    // 1. Obtener componentes actuales
    const componentes = await getComponentesByReceta(recetaId);

    // 2. Iterar componentes para actualizar sus costos
    for (const comp of componentes) {
        // Opción A: Es Materia Prima o Insumo -> Usar costo_unitario del producto
        // Opción B: Es un Semielaborado producido por otra receta -> Calcular recursivamente

        const subReceta = recetasMap.get(comp.producto_id);

        if (subReceta) {
            // Es un sub-producto con receta (SE): Recalcular su costo primero
            await recalcularCostoRecursivo(subReceta.id, recetasMap, visited);

            const cantidad = subReceta.cantidad_producida || 1;
            const costoUnitArs = subReceta.costo_total / cantidad;
            const costoUnitUsd = (subReceta.costo_total_usd || 0) / cantidad;

            // Actualizar costo del componente si cambió
            if (Math.abs(comp.costo_unitario - costoUnitArs) > 0.01) {
                await updateComponente(comp.id, {
                    costo_unitario: costoUnitArs,
                    moneda: costoUnitUsd > 0 ? 'USD' : 'ARS',
                }, recetaId);
            }

        } else {
            // Es un insumo simple (MP/ENVASE/ETIQUETA): Usar su costo directo de ficha
            const costoFicha = comp.producto?.costo_unitario || 0;
            const monedaFicha = comp.producto?.moneda_costo || 'ARS';

            const costoCambio = Math.abs(comp.costo_unitario - costoFicha) > 0.01;
            const monedaCambio = comp.moneda !== monedaFicha;

            if (costoCambio || monedaCambio) {
                await updateComponente(comp.id, {
                    costo_unitario: costoFicha,
                    moneda: monedaFicha,
                    cantidad: comp.cantidad
                }, recetaId);
            }
        }
    }

    // 3. Recalcular totales de esta receta
    await updateRecetaCostos(recetaId);
}
/**
 * Ejecuta la actualización masiva de todas las recetas
 */
export async function recalcularCostosMasivo(): Promise<{ success: boolean, message: string }> {
    try {
        console.log('[Masivo] Iniciando recálculo masivo...');
        const recetas = await getRecetas();

        const recetasMap = new Map<string, Receta>();
        recetas.forEach(r => {
            if (r.producto_id) {
                recetasMap.set(r.producto_id, r);
            }
        });

        const visited = new Set<string>();

        for (const r of recetas) {
            await recalcularCostoRecursivo(r.id, recetasMap, visited);
        }

        return { success: true, message: `Se actualizaron ${visited.size} recetas.` };
    } catch (error) {
        console.error('[Masivo] Error:', error);
        return { success: false, message: 'Error en cálculo masivo' };
    }
}

// =====================================================
// COMPONENTES DE RECETA
// =====================================================

export interface RecetaComponenteConProducto {
    id: string;
    receta_id: string;
    producto_id: string;
    cantidad: number;
    unidad_medida: string;
    orden: number;
    costo_unitario: number;
    moneda?: string;
    costo_subtotal: number;
    created_at: string;
    producto?: {
        id: string;
        codigo: string;
        nombre: string;
        unidad_medida: string;
        costo_unitario: number;
        moneda_costo?: string; // Added field
        lista_costo_id?: string;
    };
}

/**
 * Obtiene todos los componentes de una receta
 */
export async function getComponentesByReceta(recetaId: string): Promise<RecetaComponenteConProducto[]> {
    const supabase = createClient();

    // Nota: Select * traerá 'moneda' si existe en tabla
    const { data, error } = await supabase
        .from('recetas_componentes')
        .select('*, producto:productos(id,codigo,nombre,unidad_medida,costo_unitario,moneda_costo,lista_costo_id)')
        .eq('receta_id', recetaId);

    if (error) {
        console.error('Error fetching componentes:', error);
        return [];
    }

    return (data || []) as unknown as RecetaComponenteConProducto[];
}

export type CreateComponenteData = {
    receta_id: string;
    producto_id: string;
    cantidad: number;
    unidad_medida: string;
    orden?: number;
    costo_unitario: number;
    moneda?: string;
};

/**
 * Agrega un componente a una receta
 */
export async function addComponenteToReceta(data: CreateComponenteData): Promise<RecetaComponente | null> {
    const supabase = createClient();

    const insertData = {
        ...data,
        orden: data.orden || 0,
        costo_subtotal: data.cantidad * data.costo_unitario,
    };

    const { data: result, error } = await supabase
        .from('recetas_componentes')
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('Error adding componente:', error);
        throw new Error(`Error al agregar componente: ${error.message}`);
    }

    // Actualizar costos de la receta
    await updateRecetaCostos(data.receta_id);

    return result;
}

/**
 * Actualiza un componente
 */
export async function updateComponente(
    id: string,
    data: { cantidad?: number; costo_unitario?: number; orden?: number; moneda?: string },
    recetaId: string
): Promise<RecetaComponente | null> {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = { ...data };

    if (data.cantidad !== undefined && data.costo_unitario !== undefined) {
        updateData.costo_subtotal = data.cantidad * data.costo_unitario;
    }

    const { data: result, error } = await supabase
        .from('recetas_componentes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating componente:', error);
        return null;
    }

    // Actualizar costos de la receta
    await updateRecetaCostos(recetaId);

    return result;
}

/**
 * Elimina un componente
 */
export async function removeComponente(id: string, recetaId: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from('recetas_componentes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error removing componente:', error);
        return false;
    }

    // Actualizar costos de la receta
    await updateRecetaCostos(recetaId);

    return true;
}

/**
 * Calcula el costo total de una receta
 */
export function calcularCostoReceta(componentes: RecetaComponente[]): number {
    return componentes.reduce((acc, comp) => acc + (comp.costo_subtotal || 0), 0);
}
