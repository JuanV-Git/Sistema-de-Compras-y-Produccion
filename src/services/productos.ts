// =====================================================
// SERVICIO DE API REST - PRODUCTOS
// =====================================================
// Usando fetch directo a la API REST de Supabase

import type { Producto } from '@/types/database';
import { TipoProductoPrefixes, type TipoProducto } from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Headers comunes
function getHeaders() {
    return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
    };
}

export type { Producto };

import { getPrecioProducto } from './precios';

export type CreateProductoData = Omit<Producto, 'id' | 'created_at' | 'updated_at'>;

export interface ProductoConPrecio extends Producto {
    moneda_costo?: string;
    costo_actual?: number;
}

/**
 * Obtiene todos los productos
 */
export async function getProductos(): Promise<Producto[]> {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?activo=eq.true&order=codigo`,
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
        `${SUPABASE_URL}/rest/v1/productos?tipo=eq.${tipo}&activo=eq.true&order=codigo`,
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
 * Genera el siguiente código de producto
 */
export async function getNextCodigoProducto(tipo: string): Promise<string> {
    // @ts-ignore
    const prefix = TipoProductoPrefixes[tipo as TipoProducto] || tipo;

    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos?tipo=eq.${tipo}&select=codigo&order=codigo.desc&limit=1`,
        { method: 'GET', headers: getHeaders() }
    );

    let maxNum = 0;
    if (response.ok) {
        const productos = await response.json();
        const regex = new RegExp(`^${prefix}-(\\d+)$`);

        for (const p of productos) {
            const match = p.codigo?.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        }
    } else {
        // Fallback si falla query, empezamos en 1
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
    // Ya no inyectamos tenant_id
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/productos`,
        {
            method: 'POST',
            headers: {
                ...getHeaders(),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(producto),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating producto:', errorText);
        throw new Error(`Error al crear producto: ${errorText}`);
    }

    const data = await response.json();
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
            moneda_costo: moneda,
            costo_actual: costo
        };
    }));

    return productosConPrecio;
}
