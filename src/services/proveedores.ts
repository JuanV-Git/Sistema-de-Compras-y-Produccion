// =====================================================
// SERVICIO DE API - PROVEEDORES
// =====================================================

import { createClient } from '@/lib/supabase/client';

export interface Proveedor {
    id: string;
    codigo: string;
    nombre: string;
    razon_social?: string;
    cuit?: string;
    direccion?: string;
    contacto_nombre?: string;
    contacto_email?: string;
    contacto_telefono?: string;
    condicion_pago?: string;
    plazo_entrega_dias: number;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export type CreateProveedorData = Omit<Proveedor, 'id' | 'created_at' | 'updated_at'>;

/**
 * Obtiene todos los proveedores activos
 */
export async function getProveedores(): Promise<Proveedor[]> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('activo', true)
        .order('nombre');

    if (error) {
        console.error('Error fetching proveedores:', error);
        return [];
    }

    return data || [];
}

/**
 * Genera el siguiente código de proveedor disponible
 * Formato: PROV-001, PROV-002, etc.
 */
export async function getNextCodigoProveedor(): Promise<string> {
    const supabase = createClient();

    // Obtener todos los proveedores (incluso inactivos) para no reusar códigos
    const { data: proveedores, error } = await supabase
        .from('proveedores')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error fetching next codigo:', error);
        return 'PROV-001';
    }

    // Buscar el número más alto
    let maxNum = 0;
    for (const p of proveedores || []) {
        const match = p.codigo?.match(/PROV-(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    }

    // Siguiente número
    const nextNum = maxNum + 1;
    return `PROV-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Obtiene un proveedor por ID
 */
export async function getProveedorById(id: string): Promise<Proveedor | null> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching proveedor:', error);
        return null;
    }

    return data;
}

/**
 * Crea un nuevo proveedor
 */
export async function createProveedor(data: CreateProveedorData): Promise<Proveedor | null> {
    const supabase = createClient();

    const { data: proveedor, error } = await supabase
        .from('proveedores')
        .insert([data])
        .select()
        .single();

    if (error) {
        console.error('Error creating proveedor:', error);
        throw new Error(`Error al crear proveedor: ${JSON.stringify(error)}`);
    }

    return proveedor;
}

/**
 * Actualiza un proveedor existente
 */
export async function updateProveedor(id: string, data: Partial<CreateProveedorData>): Promise<Proveedor | null> {
    const supabase = createClient();

    const { data: proveedor, error } = await supabase
        .from('proveedores')
        .update(data)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating proveedor:', error);
        throw new Error(`Error al actualizar proveedor: ${JSON.stringify(error)}`);
    }

    return proveedor;
}

/**
 * Elimina (soft delete) un proveedor
 */
export async function deleteProveedor(id: string): Promise<boolean> {
    const supabase = createClient();

    // Attempt hard delete  
    const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting proveedor:', error);
        throw new Error(`No se pudo eliminar: El proveedor está siendo utilizado en otros registros.`);
    }

    return true;
}

/**
 * Obtiene proveedores con filtros
 */
export async function getProveedoresConFiltros(activo?: boolean): Promise<Proveedor[]> {
    const supabase = createClient();

    let query = supabase
        .from('proveedores')
        .select('*')
        .order('nombre');

    if (activo !== undefined) {
        query = query.eq('activo', activo);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching proveedores con filtros:', error);
        return [];
    }

    return data || [];
}
