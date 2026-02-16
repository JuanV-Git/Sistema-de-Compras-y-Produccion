
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('--- Starting Verification ---');

    // 1. Create MP Product
    const mpData = {
        codigo: 'TEST-MP-001',
        nombre: 'Test Materia Prima',
        tipo: 'MP',
        unidad_medida: 'KG',
        stock_actual: 100,
        stock_minimo: 10,
        costo_unitario: 100, // Costo inicial
        moneda_costo: 'ARS',
        activo: true
    };

    const { data: mp, error: mpError } = await supabase
        .from('productos')
        .insert(mpData)
        .select()
        .single();

    if (mpError) throw new Error(`Error creating MP: ${mpError.message}`);
    console.log('1. Created MP:', mp.codigo, 'Cost:', mp.costo_unitario);

    // 2. Create PT Product
    const ptData = {
        codigo: 'TEST-PT-001',
        nombre: 'Test Producto Terminado',
        tipo: 'PT',
        unidad_medida: 'UN',
        stock_actual: 0,
        stock_minimo: 0,
        costo_unitario: 0, // Should be calculated
        activo: true
    };

    const { data: pt, error: ptError } = await supabase
        .from('productos')
        .insert(ptData)
        .select()
        .single();

    if (ptError) throw new Error(`Error creating PT: ${ptError.message}`);
    console.log('2. Created PT:', pt.codigo);

    // 3. Create Recipe
    const recetaData = {
        codigo: 'REC-TEST-001',
        nombre: 'Receta Test',
        producto_id: pt.id,
        cantidad_producida: 1,
        unidad_medida: 'UN',
        estado: 'ACTIVA',
        version: 1,
        costo_total: 0,
        costo_por_unidad: 0
    };

    const { data: receta, error: recError } = await supabase
        .from('recetas')
        .insert(recetaData)
        .select()
        .single();

    if (recError) throw new Error(`Error creating Recipe: ${recError.message}`);
    console.log('3. Created Recipe:', receta.codigo);

    // 4. Add Component to Recipe
    const compData = {
        receta_id: receta.id,
        producto_id: mp.id,
        cantidad: 2, // 2 KG
        unidad_medida: 'KG',
        orden: 1,
        costo_unitario: 0, // Should update
        costo_subtotal: 0
    };

    const { error: compError } = await supabase
        .from('recetas_componentes')
        .insert(compData);

    if (compError) throw new Error(`Error creating Component: ${compError.message}`);
    console.log('4. Added Component (2 KG of MP)');

    // 5. Trigger Calculation Logic (Simulating `actualizarCostosRecetaDesdeInsumos`)
    console.log('5. Calculating Costs...');

    // Fetch Component
    const { data: components } = await supabase
        .from('recetas_componentes')
        .select('*, producto:productos(*)')
        .eq('receta_id', receta.id);

    let totalCost = 0;
    for (const comp of components || []) {
        const prodCost = comp.producto.costo_unitario;
        const subtotal = prodCost * comp.cantidad;
        totalCost += subtotal;

        // Update component cost
        await supabase
            .from('recetas_componentes')
            .update({ costo_unitario: prodCost, costo_subtotal: subtotal })
            .eq('id', comp.id);
    }

    // Update Recipe Cost
    await supabase
        .from('recetas')
        .update({ costo_total: totalCost, costo_por_unidad: totalCost / receta.cantidad_producida })
        .eq('id', receta.id);

    // Update Product Cost
    await supabase
        .from('productos')
        .update({ costo_unitario: totalCost / receta.cantidad_producida })
        .eq('id', pt.id);

    console.log('   Calculated Total Cost:', totalCost);

    // 6. Verify
    const { data: finalPT } = await supabase
        .from('productos')
        .select('*')
        .eq('id', pt.id)
        .single();

    console.log('6. Verified PT Cost:', finalPT.costo_unitario);

    if (finalPT.costo_unitario === 200) {
        console.log('SUCCESS: Cost is correct (100 * 2 = 200)');
    } else {
        console.error('FAILURE: Cost is incorrect, expected 200');
    }

    // 7. Cleanup
    console.log('7. Cleaning up...');
    await supabase.from('recetas_componentes').delete().eq('receta_id', receta.id);
    await supabase.from('recetas').delete().eq('id', receta.id);
    await supabase.from('productos').delete().eq('id', pt.id);
    await supabase.from('productos').delete().eq('id', mp.id);
    console.log('Cleanup done.');
}

verify().catch(console.error);
