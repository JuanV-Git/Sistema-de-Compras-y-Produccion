// =====================================================
// SERVICIO DE ÓRDENES DE COMPRA
// =====================================================
// CRUD completo para órdenes de compra y sus items

import { createClient } from '@/lib/supabase/client';
import type { OrdenCompra, OrdenCompraItem, Proveedor, Producto } from '@/types/database';
import { registrarRecepcionCompra, getStockProducto } from './stock';

export type { OrdenCompra, OrdenCompraItem };

export type EstadoOC = 'BORRADOR' | 'ENVIADA' | 'PARCIAL' | 'RECIBIDA' | 'CANCELADA';

export const EstadoOCLabels: Record<EstadoOC, string> = {
    BORRADOR: 'Borrador',
    ENVIADA: 'Enviada',
    PARCIAL: 'Recepción Parcial',
    RECIBIDA: 'Recibida Completa',
    CANCELADA: 'Cancelada',
};

export interface OrdenCompraConRelaciones extends OrdenCompra {
    proveedor?: Proveedor;
    items?: OrdenCompraItemConProducto[];
}

export interface OrdenCompraItemConProducto extends OrdenCompraItem {
    producto?: Producto;
}

// =====================================================
// CRUD ÓRDENES DE COMPRA
// =====================================================

/**
 * Obtiene todas las órdenes de compra con datos del proveedor
 */
export async function getOrdenesCompra(): Promise<OrdenCompraConRelaciones[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('ordenes_compra')
        .select('*, proveedor:proveedores(id,codigo,nombre)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching ordenes de compra:', error);
        return [];
    }

    // Casteo para ajustar el tipo de retorno si es necesario
    return (data || []) as unknown as OrdenCompraConRelaciones[];
}

/**
 * Obtiene una orden de compra por ID con items y proveedor
 */
export async function getOrdenCompraById(id: string): Promise<OrdenCompraConRelaciones | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('ordenes_compra')
        .select('*, proveedor:proveedores(*)')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching orden de compra:', error);
        return null;
    }

    if (!data) return null;

    // Obtener items
    const items = await getItemsByOrden(id);
    return { ...data, items } as unknown as OrdenCompraConRelaciones;
}

/**
 * Genera el siguiente número de OC disponible (OC-YYYYMM-NNN)
 */
export async function getNextNumeroOC(): Promise<string> {
    const supabase = createClient();
    const now = new Date();
    const prefix = `OC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data } = await supabase
        .from('ordenes_compra')
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

export type CreateOrdenCompraData = {
    numero: string;
    proveedor_id: string;
    fecha_emision: string;
    fecha_entrega_estimada?: string;
    moneda: 'ARS' | 'USD';
    tipo_cambio: number;
    observaciones?: string;
};

/**
 * Crea una nueva orden de compra
 */
export async function createOrdenCompra(data: CreateOrdenCompraData): Promise<OrdenCompra | null> {
    const supabase = createClient();

    const insertData = {
        ...data,
        estado: 'BORRADOR',
        subtotal: 0,
        iva: 0,
        total: 0,
    };

    const { data: result, error } = await supabase
        .from('ordenes_compra')
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('Error creating orden de compra:', error);
        return null;
    }

    return result;
}

/**
 * Actualiza una orden de compra
 */
export async function updateOrdenCompra(id: string, data: Partial<OrdenCompra>): Promise<OrdenCompra | null> {
    const supabase = createClient();

    const { data: result, error } = await supabase
        .from('ordenes_compra')
        .update({
            ...data,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating orden de compra:', error);
        return null;
    }

    return result;
}

/**
 * Elimina una orden de compra de forma segura.
 * Intenta eliminar primero los items y luego la orden.
 * Si hay restricciones (ej: recepciones parciales que generaron stock), la BD podría bloquearlo (aunque stock es otra tabla).
 */
export async function deleteOrdenCompra(id: string): Promise<boolean> {
    const supabase = createClient();

    // 1. Intentar borrar items primero (Hard Delete)
    const { error: itemsError } = await supabase
        .from('ordenes_compra_items')
        .delete()
        .eq('orden_compra_id', id);

    if (itemsError) {
        console.error('Error deleting orden items:', itemsError);
        // Si fallan items, probablemente no podamos borrar la orden.
        // Pero intentamos seguir o lanzamos error?
        throw new Error(`No se pueden eliminar los items: ${itemsError.message}`);
    }

    // 2. Borrar la orden
    const { error } = await supabase
        .from('ordenes_compra')
        .delete()
        .eq('id', id);

    if (error) {
        if (error.code === '23503') {
            throw new Error('No se puede eliminar la orden porque tiene registros asociados.');
        }
        console.error('Error deleting orden:', error);
        throw new Error(error.message);
    }

    return true;
}

// =====================================================
// CRUD ITEMS DE ORDEN DE COMPRA
// =====================================================

/**
 * Obtiene items de una orden con datos del producto
 */
export async function getItemsByOrden(ordenId: string): Promise<OrdenCompraItemConProducto[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('ordenes_compra_items')
        .select('*, producto:productos(id,codigo,nombre,unidad_medida,costo_unitario)')
        .eq('orden_compra_id', ordenId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching items:', error);
        return [];
    }

    return (data || []) as unknown as OrdenCompraItemConProducto[];
}

export type CreateItemData = {
    orden_compra_id: string;
    producto_id: string;
    cantidad_pedida: number;
    precio_unitario: number;
};

/**
 * Agrega un item a la orden de compra
 */
export async function addItemToOrden(data: CreateItemData): Promise<OrdenCompraItem | null> {
    const supabase = createClient();
    const subtotal = data.cantidad_pedida * data.precio_unitario;

    const { data: result, error } = await supabase
        .from('ordenes_compra_items')
        .insert({
            ...data,
            cantidad_recibida: 0,
            subtotal,
            estado: 'PENDIENTE',
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding item:', error);
        return null;
    }

    // Recalcular totales de la orden
    await recalcularTotalesOrden(data.orden_compra_id);

    return result;
}

/**
 * Actualiza un item
 */
export async function updateItem(id: string, data: Partial<OrdenCompraItem>, ordenId: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from('ordenes_compra_items')
        .update(data)
        .eq('id', id);

    if (error) {
        console.error('Error updating item:', error);
        return false;
    }

    await recalcularTotalesOrden(ordenId);
    return true;
}

/**
 * Elimina un item de la orden
 */
export async function removeItem(id: string, ordenId: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from('ordenes_compra_items')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error removing item:', error);
        return false;
    }

    await recalcularTotalesOrden(ordenId);
    return true;
}

/**
 * Recalcula los totales de una orden
 */
async function recalcularTotalesOrden(ordenId: string): Promise<void> {
    const items = await getItemsByOrden(ordenId);
    const subtotal = items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    const iva = subtotal * 0.21; // 21% IVA
    const total = subtotal + iva;

    await updateOrdenCompra(ordenId, { subtotal, iva, total });
}

/**
 * Cambia el estado de la orden
 */
export async function cambiarEstadoOrden(id: string, estado: EstadoOC): Promise<boolean> {
    const result = await updateOrdenCompra(id, { estado });
    return result !== null;
}

/**
 * Registra la recepción de items de una orden de compra
 */
export async function registrarItemsRecibidos(
    ordenId: string,
    itemsRecibidos: { id: string; cantidad: number; cerrar_pendiente: boolean }[]
): Promise<boolean> {
    // Importación dinámica para evitar ciclos si fuera necesario, aunque ya importamos arriba
    // const { registrarRecepcionCompra } = await import('./stock');

    // Obtener orden para el número
    const orden = await getOrdenCompraById(ordenId);
    if (!orden) return false;

    // Obtener items actuales
    const itemsActuales = await getItemsByOrden(ordenId);

    for (const recibido of itemsRecibidos) {
        if (recibido.cantidad <= 0 && !recibido.cerrar_pendiente) continue;

        const itemActual = itemsActuales.find(i => i.id === recibido.id);
        if (!itemActual) continue;

        // 1. Actualizar cantidad recibida en item
        const nuevaCantidadRecibida = (itemActual.cantidad_recibida || 0) + recibido.cantidad;
        const estaCompletado = recibido.cerrar_pendiente || nuevaCantidadRecibida >= itemActual.cantidad_pedida;

        await updateItem(itemActual.id, {
            cantidad_recibida: nuevaCantidadRecibida,
            estado: estaCompletado ? 'COMPLETADO' : 'PENDIENTE'
        }, ordenId);

        // 2. Registrar movimiento de stock (si hubo cantidad recibida)
        if (recibido.cantidad > 0 && itemActual.producto_id) {
            try {
                // Obtener stock anterior ANTES de registrar la recepción
                const stockAnterior = await getStockProducto(itemActual.producto_id);

                await registrarRecepcionCompra(
                    itemActual.producto_id,
                    recibido.cantidad,
                    orden.numero,
                    orden.id,
                    itemActual.precio_unitario
                );

                // 2b. Actualizar costo promedio ponderado del producto
                // Fórmula: (stock_anterior × costo_actual + cantidad × precio_compra) / stock_nuevo
                const supabase = createClient();
                const { data: productoActual } = await supabase
                    .from('productos')
                    .select('costo_unitario')
                    .eq('id', itemActual.producto_id)
                    .single();

                if (productoActual) {
                    const costoActual = productoActual.costo_unitario || 0;
                    const stockNuevo = stockAnterior + recibido.cantidad;
                    const nuevoCostoPromedio = stockNuevo > 0
                        ? ((stockAnterior * costoActual) + (recibido.cantidad * itemActual.precio_unitario)) / stockNuevo
                        : itemActual.precio_unitario;

                    await supabase
                        .from('productos')
                        .update({
                            costo_unitario: Math.round(nuevoCostoPromedio * 10000) / 10000, // 4 decimales
                            costo_promedio: Math.round(nuevoCostoPromedio * 10000) / 10000,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', itemActual.producto_id);
                }
            } catch (error) {
                console.error(`Error registrando stock para item ${itemActual.id}:`, error);
            }
        }
    }

    // 3. Verificar estado global de la orden
    const itemsActualizados = await getItemsByOrden(ordenId);
    const todosItemsCompletados = itemsActualizados.every(i => i.estado === 'COMPLETADO' || i.estado === 'CANCELADO');

    const nuevoEstado: EstadoOC = todosItemsCompletados ? 'RECIBIDA' : 'PARCIAL';

    // Solo cambiar estado si no estaba ya recibida/cancelada
    if (orden.estado !== 'CANCELADA' && orden.estado !== 'RECIBIDA') {
        await cambiarEstadoOrden(ordenId, nuevoEstado);
    }

    return true;
}
