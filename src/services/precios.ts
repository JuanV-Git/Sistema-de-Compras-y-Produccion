// =====================================================
// SERVICIO DE PRECIOS Y LISTAS
// =====================================================

import type { ListaPrecio, PrecioProducto } from '@/types/database';

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

// =====================================================
// LISTAS DE PRECIOS
// =====================================================

export async function getListasPrecios(tipo?: 'COSTO' | 'VENTA'): Promise<ListaPrecio[]> {
    let url = `${SUPABASE_URL}/rest/v1/listas_precios?tenant_id=eq.${DEMO_TENANT_ID}&activa=eq.true&order=nombre`;
    if (tipo) {
        url += `&tipo=eq.${tipo}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
    });

    if (!response.ok) {
        console.error('Error fetching listas precios:', await response.text());
        return [];
    }

    return response.json();
}

export async function createListaPrecio(data: Pick<ListaPrecio, 'nombre' | 'tipo' | 'descripcion'>): Promise<ListaPrecio | null> {
    const insertData = {
        ...data,
        tenant_id: DEMO_TENANT_ID,
        activa: true
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/listas_precios`, {
        method: 'POST',
        headers: {
            ...getHeaders(),
            'Prefer': 'return=representation',
        },
        body: JSON.stringify(insertData),
    });

    if (!response.ok) {
        console.error('Error creating lista precios:', await response.text());
        return null;
    }

    const result = await response.json();
    return result[0] || null;
}

// =====================================================
// PRECIOS DE PRODUCTOS
// =====================================================

/**
 * Obtiene el precio VIGENTE de un producto en una lista específica.
 * Busca el precio más reciente (por fecha_vigencia) para esa combinación.
 */
export async function getPrecioProducto(listaId: string, productoId: string): Promise<PrecioProducto | null> {
    // Ordenamos por fecha_vigencia descendente y tomamos el primero
    const url = `${SUPABASE_URL}/rest/v1/precios_productos?tenant_id=eq.${DEMO_TENANT_ID}&lista_id=eq.${listaId}&producto_id=eq.${productoId}&order=fecha_vigencia.desc&limit=1`;

    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
    });

    if (!response.ok) {
        console.error('Error fetching precio producto:', await response.text());
        return null;
    }

    const data = await response.json();
    return data[0] || null;
}

/**
 * Obtiene el historial de precios de un producto en una lista
 */
export async function getHistorialPrecios(listaId: string, productoId: string): Promise<PrecioProducto[]> {
    const url = `${SUPABASE_URL}/rest/v1/precios_productos?tenant_id=eq.${DEMO_TENANT_ID}&lista_id=eq.${listaId}&producto_id=eq.${productoId}&order=fecha_vigencia.desc`;

    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
    });

    if (!response.ok) {
        return [];
    }

    return response.json();
}

/**
 * Actualiza (o más bien, INSERTA) un nuevo precio para un producto en una lista.
 * Mantiene el historial creando un nuevo registro.
 */
export async function updatePrecioProducto(
    listaId: string,
    productoId: string,
    precio: number,
    usuarioId?: string
): Promise<PrecioProducto | null> {

    const insertData = {
        tenant_id: DEMO_TENANT_ID,
        lista_id: listaId,
        producto_id: productoId,
        precio: precio,
        moneda: 'ARS', // Default por ahora
        fecha_vigencia: new Date().toISOString(), // Vigente desde AHORA
        usuario_id: usuarioId
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/precios_productos`, {
        method: 'POST',
        headers: {
            ...getHeaders(),
            'Prefer': 'return=representation',
        },
        body: JSON.stringify(insertData),
    });

    if (!response.ok) {
        console.error('Error updating precio:', await response.text());
        return null;
    }

    /* 
       OPCIONAL: Aquí podríamos actualizar el campo 'costo_unitario' en la tabla productos
       si la lista es la asignada como 'lista_costo_id' del producto, para mantener compatibilidad
       hacia atrás sin romper todo. Lo haremos en un paso posterior si es necesario.
    */

    const result = await response.json();
    return result[0] || null;
}
