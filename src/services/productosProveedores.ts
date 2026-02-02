// =====================================================
// SERVICIO DE API REST - PRODUCTOS PROVEEDORES
// =====================================================
// Gestiona la relación N:M entre productos y proveedores
// Cada producto puede tener múltiples proveedores con códigos alternativos

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

export interface ProductoProveedor {
    id: string;
    tenant_id: string;
    producto_id: string;
    proveedor_id: string;
    codigo_alternativo?: string;
    precio_unitario?: number;
    es_principal: boolean;
    created_at: string;
}

export interface ProductoProveedorConProveedor extends ProductoProveedor {
    proveedor: {
        id: string;
        codigo: string;
        nombre: string;
    };
}

export interface CreateProductoProveedorData {
    producto_id: string;
    proveedor_id: string;
    codigo_alternativo?: string;
    precio_unitario?: number;
    es_principal?: boolean;
}

/**
 * Obtiene todos los proveedores de un producto 
 * incluyendo datos del proveedor (JOIN)
 */
export async function getProveedoresByProducto(productoId: string): Promise<ProductoProveedorConProveedor[]> {
    // Supabase REST API permite hacer joins con select=*,proveedor:proveedores(id,codigo,nombre)
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos_proveedores?producto_id=eq.${productoId}&select=*,proveedor:proveedores(id,codigo,nombre)`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching proveedores by producto:', await response.text());
        return [];
    }

    return response.json();
}

/**
 * Obtiene todos los productos de un proveedor
 */
export async function getProductosByProveedor(proveedorId: string): Promise<ProductoProveedor[]> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos_proveedores?proveedor_id=eq.${proveedorId}&select=*,producto:productos(id,codigo,nombre)`,
        {
            method: 'GET',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error fetching productos by proveedor:', await response.text());
        return [];
    }

    return response.json();
}

/**
 * Asocia un proveedor a un producto con código alternativo
 */
export async function addProveedorToProducto(data: CreateProductoProveedorData): Promise<ProductoProveedor | null> {
    const insertData = {
        ...data,
        tenant_id: DEMO_TENANT_ID,
        es_principal: data.es_principal ?? false,
    };

    console.log('Adding proveedor to producto:', insertData);

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos_proveedores`,
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
        console.error('Error adding proveedor to producto:', errorText);
        throw new Error(`Error al asociar proveedor: ${errorText}`);
    }

    const result = await response.json();
    return result[0] || result;
}

/**
 * Actualiza la relación producto-proveedor (código alternativo, precio, etc.)
 */
export async function updateProductoProveedor(
    id: string,
    data: Partial<Omit<CreateProductoProveedorData, 'producto_id' | 'proveedor_id'>>
): Promise<ProductoProveedor | null> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos_proveedores?id=eq.${id}`,
        {
            method: 'PATCH',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        console.error('Error updating producto_proveedor:', await response.text());
        return null;
    }

    const result = await response.json();
    return result[0] || null;
}

/**
 * Elimina la asociación entre producto y proveedor
 */
export async function removeProveedorFromProducto(id: string): Promise<boolean> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos_proveedores?id=eq.${id}`,
        {
            method: 'DELETE',
            headers: getHeaders(),
        }
    );

    if (!response.ok) {
        console.error('Error removing proveedor from producto:', await response.text());
        return false;
    }

    return true;
}

/**
 * Marca un proveedor como principal para el producto
 * (desmarca los demás)
 */
export async function setProveedorPrincipal(productoId: string, productoProveedorId: string): Promise<boolean> {
    // Primero desmarcar todos como no principal
    const resetResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/productos_proveedores?producto_id=eq.${productoId}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ es_principal: false }),
        }
    );

    if (!resetResponse.ok) {
        console.error('Error resetting es_principal:', await resetResponse.text());
        return false;
    }

    // Luego marcar el seleccionado como principal
    const setResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/productos_proveedores?id=eq.${productoProveedorId}`,
        {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ es_principal: true }),
        }
    );

    if (!setResponse.ok) {
        console.error('Error setting es_principal:', await setResponse.text());
        return false;
    }

    return true;
}
