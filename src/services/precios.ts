
import { createClient } from '@/lib/supabase/client';

export interface PrecioProducto {
    id: string;
    lista_id: string;
    producto_id: string;
    precio: number;
    moneda: string;
}

/**
 * Obtiene el precio vigente de un producto en una lista de precios
 */
export async function getPrecioProducto(listaId: string, productoId: string): Promise<PrecioProducto | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('precios')
        .select('*')
        .eq('lista_id', listaId)
        .eq('producto_id', productoId)
        .single();

    if (error) {
        // Si no hay precio específico, retornamos null y el sistema usará el costo base
        return null;
    }

    return data;
}
