// =====================================================
// SERVICIO DE API - PRODUCTOS PROVEEDORES
// =====================================================
// Gestiona la relación N:M entre productos y proveedores

import { createClient } from '@/lib/supabase/client';

export interface ProductoProveedor {
    id: string;
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
    const supabase = createClient();

    const { data, error } = await supabase
        .from('productos_proveedores')
        .select('*, proveedor:proveedores(id, codigo, nombre)')
        .eq('producto_id', productoId);

    if (error) {
        console.error('Error fetching proveedores by producto:', error);
        return [];
    }

    return (data || []) as ProductoProveedorConProveedor[];
}

/**
 * Obtiene todos los productos de un proveedor
 */
export async function getProductosByProveedor(proveedorId: string): Promise<ProductoProveedor[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('productos_proveedores')
        .select('*, producto:productos(id, codigo, nombre)')
        .eq('proveedor_id', proveedorId);

    if (error) {
        console.error('Error fetching productos by proveedor:', error);
        return [];
    }

    return data || [];
}

/**
 * Asocia un proveedor a un producto con código alternativo
 */
export async function addProveedorToProducto(data: CreateProductoProveedorData): Promise<ProductoProveedor | null> {
    const supabase = createClient();

    const insertData = {
        ...data,
        es_principal: data.es_principal ?? false,
    };

    console.log('Adding proveedor to producto:', insertData);

    const { data: result, error } = await supabase
        .from('productos_proveedores')
        .insert([insertData])
        .select()
        .single();

    if (error) {
        console.error('Error adding proveedor to producto:', error);
        throw new Error(`Error al asociar proveedor: ${JSON.stringify(error)}`);
    }

    return result;
}

/**
 * Actualiza la relación producto-proveedor (código alternativo, precio, etc.)
 */
export async function updateProductoProveedor(
    id: string,
    data: Partial<Omit<CreateProductoProveedorData, 'producto_id' | 'proveedor_id'>>
): Promise<ProductoProveedor | null> {
    const supabase = createClient();

    const { data: result, error } = await supabase
        .from('productos_proveedores')
        .update(data)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating producto_proveedor:', error);
        return null;
    }

    return result;
}

/**
 * Elimina la asociación entre producto y proveedor
 */
export async function removeProveedorFromProducto(id: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from('productos_proveedores')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error removing proveedor from producto:', error);
        return false;
    }

    return true;
}

/**
 * Marca un proveedor como principal para el producto
 * (desmarca los demás)
 */
export async function setProveedorPrincipal(productoId: string, productoProveedorId: string): Promise<boolean> {
    const supabase = createClient();

    // Primero desmarcar todos como no principal
    const { error: resetError } = await supabase
        .from('productos_proveedores')
        .update({ es_principal: false })
        .eq('producto_id', productoId);

    if (resetError) {
        console.error('Error resetting es_principal:', resetError);
        return false;
    }

    // Luego marcar el seleccionado como principal
    const { error: setError } = await supabase
        .from('productos_proveedores')
        .update({ es_principal: true })
        .eq('id', productoProveedorId);

    if (setError) {
        console.error('Error setting es_principal:', setError);
        return false;
    }

    return true;
}
