// @ts-nocheck

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting live database schema...');

    // 1. Get List of Tables
    const { data: tables, error: tableError } = await supabase
        .rpc('get_schema_info'); // Try RPC first if available, otherwise fallback to direct query if possible or inference

    // Since we can't easily create an RPC now without SQL access from here, 
    // we will try to infer from a known table query or standard table.
    // Actually, standard Supabase client doesn't let you query information_schema directly via .from() 
    // UNLESS it's exposed. Usually it's not.

    // ALTERNATIVE: We can check specific tables we care about by trying to select 1 row
    // and looking at the structure of the returned data, or validation errors.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const report: any = {};

    // CHECK 1: Does tenant_id exist?
    console.log('Checking for tenant_id column...');
    const { error: colError } = await supabase.from('listas_precios').select('tenant_id').limit(1);
    if (colError) {
        report['listas_precios_tenant_id'] = colError.message; // Copio el mensaje (Ej: column does not exist)
    } else {
        report['listas_precios_tenant_id'] = 'COLUMN EXISTS (WARNING!)';
    }

    // CHECK 2: Try to INSERT a test row
    console.log('Attempting TEST insert...');
    const { data: insertData, error: insertError } = await supabase
        .from('listas_precios')
        .insert({
            nombre: 'TEST_DEBUG_' + Date.now(),
            tipo: 'COSTO',
            activa: true
        })
        .select()
        .single();

    if (insertError) {
        report['insert_test'] = `FAILED: ${insertError.message} (Code: ${insertError.code}, Details: ${insertError.details})`;
    } else {
        report['insert_test'] = 'SUCCESS';
        // Clean up
        if (insertData) {
            await supabase.from('listas_precios').delete().eq('id', insertData.id);
        }
    }

    console.log(JSON.stringify(report, null, 2));
}

inspectSchema();
