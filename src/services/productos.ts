// =====================================================
// SERVICIO DE API REST - PRODUCTOS
// =====================================================
// Usando fetch directo a la API REST de Supabase
// en lugar del SDK que tiene problemas de AbortError

import type { Producto } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DEMO_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// Headers comunes para todas las solicitudes
function getHeaders() {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
}

// Re-exportar el tipo para uso externo
export type { Producto };

export type CreateProductoData = Omit<Producto, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>;

/**
 * Obtiene todos los productos del tenant actual
 */
export async function getProductos(): Promise<Producto[]> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?tenant_id=eq.${DEMO_TENANT_ID}&activo=eq.true&order=codigo`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching productos:', await response.text());
        return [];
    }

    return response.json();
}

/**
 * Obtiene un producto por ID
 */
export async function getProductoById(id: string): Promise<Producto | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching producto:', await response.text());
        return null;
    }

    const data = await response.json();
    return data[0] || null;
}

/**
 * Obtiene productos por tipo
 */
export async function getProductosPorTipo(tipo: string): Promise<Producto[]> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?tenant_id=eq.${DEMO_TENANT_ID}&tipo=eq.${tipo}&activo=eq.true&order=codigo`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching productos por tipo:', await response.text());
        return [];
    }

    return response.json();
}

/**
 * Genera el siguiente código de producto disponible para un tipo específico
 * Formato: MP-001, SE-001, PT-001, ENVASE-001, ETIQUETA-001
 */
export async function getNextCodigoProducto(tipo: string): Promise<string> {
    // Obtener todos los productos del tipo (incluso inactivos) para no reusar códigos
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?tenant_id=eq.${DEMO_TENANT_ID}&tipo=eq.${tipo}&select=codigo&order=codigo.desc&limit=100`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        return `${tipo}-001`;
    }

    const productos = await response.json();

    // Buscar el número más alto para este tipo
    let maxNum = 0;
    const regex = new RegExp(`^${tipo}-(\\d+)$`);

    for (const p of productos) {
        const match = p.codigo?.match(regex);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }

    // Siguiente número
    const nextNum = maxNum + 1;
    return `${tipo}-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Obtiene productos con stock bajo
 */
export async function getProductosStockBajo(): Promise<Producto[]> {
    const productos = await getProductos();
    return productos.filter(p => p.stock_actual < p.stock_minimo);
}

/**
 * Actualiza el stock de un producto
 */
export async function updateProductoStock(id: string, nuevoStock: number): Promise<boolean> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                stock_actual: nuevoStock,
                updated_at: new Date().toISOString(),
            }),
        }
    );

    if (!response.ok) {
        console.error('Error updating stock:', await response.text());
        return false;
    }

    return true;
}

/**
 * Crea un nuevo producto
 */
export async function createProducto(producto: CreateProductoData): Promise<Producto | null> {
    const insertData = {
        ...producto,
        tenant_id: DEMO_TENANT_ID,
    };

    console.log('Creating producto with data:', insertData);

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos`,
        {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(insertData),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating producto:', errorText);
        throw new Error(`Error al crear producto: ${errorText}`);
    }

    const data = await response.json();
    console.log('Producto created successfully:', data);
    return data[0] || data;
}

/**
 * Actualiza un producto existente
 */
export async function updateProducto(
    id: string,
    producto: Partial<CreateProductoData>
): Promise<Producto | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({
                ...producto,
                updated_at: new Date().toISOString(),
            }),
        }
    );

    if (!response.ok) {
        console.error('Error updating producto:', await response.text());
        return null;
    }

    const data = await response.json();
    return data[0] || null;
}

/**
 * Elimina un producto (soft delete)
 */
export async function deleteProducto(id: string): Promise<boolean> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({
                activo: false,
                updated_at: new Date().toISOString(),
            }),
        }
    );

    if (!response.ok) {
        console.error('Error deleting producto:', await response.text());
        return false;
    }

    return true;
}
