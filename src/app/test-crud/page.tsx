'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase';

const DEMO_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export default function TestCrudPage() {
    const [status, setStatus] = useState<string>('Listo para probar');
    const [result, setResult] = useState<string>('');

    async function testSelect() {
        setStatus('Probando SELECT...');
        setResult('');

        try {
            console.log('Starting SELECT test...');
            const supabase = createBrowserClient();

            const startTime = Date.now();
            const { data, error } = await supabase
                .from('productos')
                .select('*')
                .eq('tenant_id', DEMO_TENANT_ID)
                .limit(5);

            const elapsed = Date.now() - startTime;

            if (error) {
                setStatus(`❌ Error SELECT en ${elapsed}ms`);
                setResult(JSON.stringify(error, null, 2));
            } else {
                setStatus(`✅ SELECT OK en ${elapsed}ms`);
                setResult(`Encontrados ${data?.length || 0} productos:\n${JSON.stringify(data, null, 2)}`);
            }
        } catch (err) {
            setStatus('❌ Exception en SELECT');
            setResult(err instanceof Error ? err.message : String(err));
        }
    }

    async function testInsert() {
        setStatus('Probando INSERT...');
        setResult('');

        try {
            console.log('Starting INSERT test...');
            const supabase = createBrowserClient();

            const testProduct = {
                tenant_id: DEMO_TENANT_ID,
                codigo: `TEST-${Date.now()}`,
                nombre: 'Producto Test Temporal',
                tipo: 'MP',
                unidad_medida: 'KG',
                stock_actual: 100,
                stock_minimo: 10,
                costo_unitario: 50,
                costo_promedio: 50,
                activo: true,
            };

            console.log('Insert data:', testProduct);

            const startTime = Date.now();
            const { data, error } = await supabase
                .from('productos')
                .insert(testProduct)
                .select()
                .single();

            const elapsed = Date.now() - startTime;

            if (error) {
                setStatus(`❌ Error INSERT en ${elapsed}ms`);
                setResult(JSON.stringify(error, null, 2));
            } else {
                setStatus(`✅ INSERT OK en ${elapsed}ms`);
                setResult(`Producto creado:\n${JSON.stringify(data, null, 2)}`);
            }
        } catch (err) {
            setStatus('❌ Exception en INSERT');
            setResult(err instanceof Error ? err.message : String(err));
        }
    }

    return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#1a1a2e', color: '#eee', minHeight: '100vh' }}>
            <h1 style={{ color: '#d4af37' }}>🔧 Test CRUD Supabase</h1>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={testSelect}
                    style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer', background: '#4a4a6a', color: '#fff', border: 'none', borderRadius: '5px' }}
                >
                    Test SELECT
                </button>
                <button
                    onClick={testInsert}
                    style={{ padding: '10px 20px', cursor: 'pointer', background: '#6a4a4a', color: '#fff', border: 'none', borderRadius: '5px' }}
                >
                    Test INSERT
                </button>
            </div>

            <div style={{ padding: '15px', background: '#2a2a4a', borderRadius: '5px', marginBottom: '20px' }}>
                <strong>Estado:</strong> {status}
            </div>

            <div style={{ padding: '15px', background: '#2a2a4a', borderRadius: '5px' }}>
                <strong>Resultado:</strong>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: '10px', fontSize: '12px' }}>
                    {result || '(vacío)'}
                </pre>
            </div>

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
                <p>Tenant ID: {DEMO_TENANT_ID}</p>
                <p>Abrí la consola del navegador (F12) para ver más detalles</p>
            </div>
        </div>
    );
}
