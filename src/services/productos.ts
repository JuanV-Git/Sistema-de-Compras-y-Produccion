// =====================================================
// SERVICIO DE API REST - PRODUCTOS
// =====================================================

import { createClient } from '@/lib/supabase/client';
import type { Producto } from '@/types/database';
import { TipoProductoPrefixes, type TipoProducto } from '@/types/database';
import { getPrecioProducto } from './precios';

export type { Producto };

export type CreateProductoData = Omit<Producto, 'id' | 'created_at' | 'updated_at'>;

export interface ProductoConPrecio extends Producto {
    costo_actual?: number;
}

// =====================================================
// CRUD PRODUCTOS
// =====================================================

/**
 * Obtiene todos los productos
 */
export async function getProductos(): Promise<Producto[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('codigo');

    if (error) {
        console.error('Error fetching productos:', error);
        return [];
    }

    return data || [];
}

/**
 * Obtiene un producto por ID
 */
export async function getProductoById(id: string): Promise<Producto | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching producto:', error);
        return null;
    }

    return data;
}

/**
 * Obtiene productos por tipo
 */
export async function getProductosPorTipo(tipo: string): Promise<Producto[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('tipo', tipo)
        .eq('activo', true)
        .order('codigo');

    if (error) {
        console.error('Error fetching productos por tipo:', error);
        return [];
    }

    return data || [];
}

/**
 * Genera el siguiente código de producto
 */
export async function getNextCodigoProducto(tipo: string): Promise<string> {
    const supabase = createClient();
    const prefix = TipoProductoPrefixes[tipo as TipoProducto] || tipo;

    const { data, error } = await supabase
        .from('productos')
        .select('codigo')
        .eq('tipo', tipo)
        .order('codigo', { ascending: false })
        .limit(1);

    let maxNum = 0;
    if (!error && data && data.length > 0) {
        const regex = new RegExp(`^${prefix}-(\\d+)$`);
        const match = data[0].codigo?.match(regex);
        if (match) {
            maxNum = parseInt(match[1], 10);
        }
    }

    const nextNum = maxNum + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
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
    const supabase = createClient();

    const { error } = await supabase
        .from('productos')
        .update({
            stock_actual: nuevoStock,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating stock:', error);
        return false;
    }

    return true;
}

/**
 * Crea un nuevo producto
 */
export async function createProducto(producto: CreateProductoData): Promise<Producto | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('productos')
        .insert(producto)
        .select()
        .single();

    if (error) {
        console.error('Error creating producto:', error);
        throw new Error(`Error al crear producto: ${error.message}`);
    }

    return data;
}

/**
 * Actualiza un producto existente
 */
export async function updateProducto(
    id: string,
    producto: Partial<CreateProductoData>
): Promise<Producto | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('productos')
        .update({
            ...producto,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating producto:', error);
        return null;
    }

    return data;
}

/**
 * Elimina un producto de forma segura (Hard Delete)
 * Retorna true si se eliminó, o lanza error con detalle si falla (FK constraint)
 */
export async function deleteProducto(id: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

    if (error) {
        if (error.code === '23503') {
            throw new Error('No se puede eliminar: El producto tiene movimientos o recetas asociadas.');
        }
        console.error('Error deleting producto:', error);
        throw new Error(error.message);
    }

    return true;
}

/**
 * Obtiene todos los productos con su precio vigente
 */
export async function getProductosConPrecios(): Promise<ProductoConPrecio[]> {
    const productos = await getProductos();

    const productosConPrecio = await Promise.all(productos.map(async (p) => {
        let moneda = 'ARS';
        let costo = p.costo_unitario;

        if (p.lista_costo_id) {
            const precioVigente = await getPrecioProducto(p.lista_costo_id, p.id);
            if (precioVigente) {
                moneda = precioVigente.moneda;
                costo = precioVigente.precio;
            }
        }

        return {
            ...p,
            moneda_costo: moneda as 'ARS' | 'USD',
            costo_actual: costo
        };
    }));

    return productosConPrecio;
}
