// =====================================================
// SERVICIO DE PRECIOS Y LISTAS
// =====================================================

import { createClient } from '@/lib/supabase/client';
import type { ListaPrecio, PrecioProducto } from '@/types/database';

// =====================================================
// LISTAS DE PRECIOS
// =====================================================

export async function getListasPrecios(tipo?: 'COSTO' | 'VENTA'): Promise<ListaPrecio[]> {
    const supabase = createClient();

    let query = supabase
        .from('listas_precios')
        .select('*')
        .eq('activa', true)
        .order('nombre');

    if (tipo) {
        query = query.eq('tipo', tipo);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching listas precios:', error);
        return [];
    }

    return data || [];
}

export async function createListaPrecio(data: Pick<ListaPrecio, 'nombre' | 'tipo' | 'descripcion'>): Promise<{ data: ListaPrecio | null, error: any }> {
    const supabase = createClient();

    const insertData = {
        ...data,
        activa: true
    };

    const { data: result, error } = await supabase
        .from('listas_precios')
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('Error creating lista precios:', error);
        return { data: null, error };
    }

    return { data: result, error: null };
}

// =====================================================
// PRECIOS DE PRODUCTOS
// =====================================================

/**
 * Obtiene el precio VIGENTE de un producto en una lista específica.
 * Busca el precio más reciente (por fecha_vigencia) para esa combinación.
 */
export async function getPrecioProducto(listaId: string, productoId: string): Promise<PrecioProducto | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('precios_productos')
        .select('*')
        .eq('lista_id', listaId)
        .eq('producto_id', productoId)
        .order('fecha_vigencia', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        // Ignoramos error PGRST116 (0 rows) si es solo que no hay precio
        if (error.code !== 'PGRST116') {
            console.error('Error fetching precio producto:', error);
        }
        return null;
    }

    return data;
}

/**
 * Obtiene el historial de precios de un producto en una lista
 */
export async function getHistorialPrecios(listaId: string, productoId: string): Promise<PrecioProducto[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('precios_productos')
        .select('*')
        .eq('lista_id', listaId)
        .eq('producto_id', productoId)
        .order('fecha_vigencia', { ascending: false });

    if (error) {
        console.error('Error fetching historial precios:', error);
        return [];
    }

    return data || [];
}

/**
 * Obtiene todos los precios cargados en una lista, agrupados por producto.
 * Retorna un mapa donde la key es productId y el valor es el array de histórico.
 */
export async function getPreciosDeLista(listaId: string): Promise<Record<string, PrecioProducto[]>> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('precios_productos')
        .select('*')
        .eq('lista_id', listaId)
        .order('fecha_vigencia', { ascending: false });

    if (error) {
        console.error('Error fetching precios lista:', error);
        return {};
    }

    // Agrupar por producto
    const preciosGrouped: Record<string, PrecioProducto[]> = {};

    for (const p of (data || [])) {
        if (!preciosGrouped[p.producto_id]) {
            preciosGrouped[p.producto_id] = [];
        }
        preciosGrouped[p.producto_id].push(p);
    }

    return preciosGrouped;
}

/**
 * Actualiza (o más bien, INSERTA) un nuevo precio para un producto en una lista.
 * Mantiene el historial creando un nuevo registro.
 */
export async function updatePrecioProducto(
    listaId: string,
    productoId: string,
    precio: number,
    moneda: string = 'ARS',
    usuarioId?: string
): Promise<PrecioProducto | null> {
    const supabase = createClient();

    const insertData = {
        lista_id: listaId,
        producto_id: productoId,
        precio: precio,
        moneda: moneda,
        fecha_vigencia: new Date().toISOString(), // Vigente desde AHORA
        usuario_id: usuarioId
    };

    const { data, error } = await supabase
        .from('precios_productos')
        .insert(insertData)
        .select()
        .single();

    if (error) {
        console.error('Error updating precio:', error);
        return null;
    }

    return data;
}
