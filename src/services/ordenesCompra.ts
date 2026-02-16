// =====================================================
// SERVICIO DE ÓRDENES DE COMPRA
// =====================================================
// CRUD completo para órdenes de compra y sus items

import type { OrdenCompra, OrdenCompraItem, Proveedor, Producto } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getHeaders() {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
}

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
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra?select=*,proveedor:proveedores(id,codigo,nombre)&order=created_at.desc`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching ordenes de compra:', await response.text());
        return [];
    }

    return response.json();
}

/**
 * Obtiene una orden de compra por ID con items y proveedor
 */
export async function getOrdenCompraById(id: string): Promise<OrdenCompraConRelaciones | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra?id=eq.${id}&select=*,proveedor:proveedores(*)`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching orden de compra:', await response.text());
        return null;
    }

    const data = await response.json();
    if (!data[0]) return null;

    // Obtener items
    const items = await getItemsByOrden(id);
    return { ...data[0], items };
}

/**
 * Genera el siguiente número de OC disponible (OC-YYYYMM-NNN)
 */
export async function getNextNumeroOC(): Promise<string> {
    const now = new Date();
    const prefix = `OC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra?numero=like.${prefix}*&select=numero&order=numero.desc&limit=1`,
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
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra`,
        {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
                ...data,
                // tenant_id removido
                estado: 'BORRADOR',
                subtotal: 0,
                iva: 0,
                total: 0,
            }),
        }
    );

    if (!response.ok) {
        console.error('Error creating orden de compra:', await response.text());
        return null;
    }

    const result = await response.json();
    return result[0] || null;
}

/**
 * Actualiza una orden de compra
 */
export async function updateOrdenCompra(id: string, data: Partial<OrdenCompra>): Promise<OrdenCompra | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra?id=eq.${id}`,
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
        console.error('Error updating orden de compra:', await response.text());
        return null;
    }

    const result = await response.json();
    return result[0] || null;
}

/**
 * Elimina una orden de compra (solo si está en borrador)
 */
export async function deleteOrdenCompra(id: string): Promise<boolean> {
    // Primero eliminar items
    await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra_items?orden_compra_id=eq.${id}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    );

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra?id=eq.${id}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    );

    return response.ok;
}

// =====================================================
// CRUD ITEMS DE ORDEN DE COMPRA
// =====================================================

/**
 * Obtiene items de una orden con datos del producto
 */
export async function getItemsByOrden(ordenId: string): Promise<OrdenCompraItemConProducto[]> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra_items?orden_compra_id=eq.${ordenId}&select=*,producto:productos(id,codigo,nombre,unidad_medida,costo_unitario)&order=created_at`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching items:', await response.text());
        return [];
    }

    return response.json();
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
    const subtotal = data.cantidad_pedida * data.precio_unitario;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra_items`,
        {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
                ...data,
                // tenant_id removido
                cantidad_recibida: 0,
                subtotal,
                estado: 'PENDIENTE',
            }),
        }
    );

    if (!response.ok) {
        console.error('Error adding item:', await response.text());
        return null;
    }

    // Recalcular totales de la orden
    await recalcularTotalesOrden(data.orden_compra_id);

    const result = await response.json();
    return result[0] || null;
}

/**
 * Actualiza un item
 */
export async function updateItem(id: string, data: Partial<OrdenCompraItem>, ordenId: string): Promise<boolean> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra_items?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
        }
    );

    if (response.ok) {
        await recalcularTotalesOrden(ordenId);
    }

    return response.ok;
}

/**
 * Elimina un item de la orden
 */
export async function removeItem(id: string, ordenId: string): Promise<boolean> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/ordenes_compra_items?id=eq.${id}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    );

    if (response.ok) {
        await recalcularTotalesOrden(ordenId);
    }

    return response.ok;
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
    const { registrarRecepcionCompra } = await import('./stock');

    // Obtener orden para el número
    const orden = await getOrdenCompraById(ordenId);
    if (!orden) return false;

    // Obtener items actuales
    const itemsActuales = await getItemsByOrden(ordenId);

    let todosCompletados = true;
    let algunRecibido = false;

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
                await registrarRecepcionCompra(
                    itemActual.producto_id,
                    recibido.cantidad,
                    orden.numero,
                    orden.id,
                    itemActual.precio_unitario
                );
                algunRecibido = true;
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
