// =====================================================
// SERVICIO DE CONFIGURACION GLOBAL
// =====================================================

import { createClient } from '@/lib/supabase/client';

// Tipo de cambio por defecto
const DEFAULT_TIPO_CAMBIO = 1200;
const TIPO_CAMBIO_KEY = 'TIPO_CAMBIO_USD';

/**
 * Obtiene el tipo de cambio USD -> ARS desde la base de datos
 */
export async function getTipoCambio(): Promise<number> {
    const supabase = createClient();

    const { data, error } = await supabase
        .from('configuraciones')
        .select('valor')
        .eq('clave', TIPO_CAMBIO_KEY)
        .single();

    if (error || !data) {
        return DEFAULT_TIPO_CAMBIO;
    }

    const valorNum = Number(data.valor);
    return isNaN(valorNum) ? DEFAULT_TIPO_CAMBIO : valorNum;
}

/**
 * Actualiza el tipo de cambio USD -> ARS en la base de datos
 */
export async function setTipoCambio(valor: number): Promise<boolean> {
    const supabase = createClient();

    // Primero intentamos ver si existe
    const { data: existingMap } = await supabase
        .from('configuraciones')
        .select('id')
        .eq('clave', TIPO_CAMBIO_KEY)
        .single();

    if (!existingMap) {
        // Necesitamos crear la primera fila
        const { error } = await supabase
            .from('configuraciones')
            .insert([{
                clave: TIPO_CAMBIO_KEY,
                valor: valor.toString(),
                descripcion: 'Tipo de cambio USD a ARS'
            }]);

        if (error) {
            console.error('Error insertando configuración:', error);
            return false;
        }
    } else {
        // Actualizar fila existente
        const { error } = await supabase
            .from('configuraciones')
            .update({
                valor: valor.toString(),
                updated_at: new Date().toISOString()
            })
            .eq('clave', TIPO_CAMBIO_KEY);

        if (error) {
            console.error('Error actualizando configuración:', error);
            return false;
        }
    }

    return true;
}

/**
 * Convierte de USD a ARS usando el tipo de cambio configurado
 */
export async function convertirUSDaARS(montoUSD: number): Promise<number> {
    const tipoCambio = await getTipoCambio();
    return montoUSD * tipoCambio;
}

/**
 * Convierte de ARS a USD usando el tipo de cambio configurado
 */
export async function convertirARSaUSD(montoARS: number): Promise<number> {
    const tipoCambio = await getTipoCambio();
    return montoARS / tipoCambio;
}
