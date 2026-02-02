'use client';

import { useState } from 'react';

// Credenciales de Supabase (mismas que en .env.local)
const SUPABASE_URL = 'https://yucandzycgascrustjqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1Y2FuZHp5Y2dhc2NydXN0anFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5Mjc2ODYsImV4cCI6MjA4NTUwMzY4Nn0.U6ANmrgU1g8DXtlmYNW9GB4mVD4ozlHnl7q4pWKfGSE';
const DEMO_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export default function TestFetchPage() {
    const [status, setStatus] = useState<string>('Listo para probar');
    const [result, setResult] = useState<string>('');

    async function testFetchSelect() {
        setStatus('Probando FETCH SELECT...');
        setResult('');

        try {
            console.log('Starting FETCH SELECT test...');

            const startTime = Date.now();

            // Usar fetch vanilla directamente a la API REST de Supabase
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/productos?tenant_id=eq.${DEMO_TENANT_ID}&limit=5`,
                {
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const elapsed = Date.now() - startTime;

            if (!response.ok) {
                const errorText = await response.text();
                setStatus(`❌ Error FETCH SELECT en ${elapsed}ms (HTTP ${response.status})`);
                setResult(errorText);
            } else {
                const data = await response.json();
                setStatus(`✅ FETCH SELECT OK en ${elapsed}ms`);
                setResult(`Encontrados ${data?.length || 0} productos:\n${JSON.stringify(data, null, 2)}`);
            }
        } catch (err) {
            setStatus('❌ Exception en FETCH SELECT');
            setResult(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
        }
    }

    async function testFetchInsert() {
        setStatus('Probando FETCH INSERT...');
        setResult('');

        try {
            console.log('Starting FETCH INSERT test...');

            const testProduct = {
                tenant_id: DEMO_TENANT_ID,
                codigo: `FETCH-${Date.now()}`,
                nombre: 'Producto Test FETCH',
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

            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/productos`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: JSON.stringify(testProduct),
                }
            );

            const elapsed = Date.now() - startTime;

            if (!response.ok) {
                const errorText = await response.text();
                setStatus(`❌ Error FETCH INSERT en ${elapsed}ms (HTTP ${response.status})`);
                setResult(errorText);
            } else {
                const data = await response.json();
                setStatus(`✅ FETCH INSERT OK en ${elapsed}ms`);
                setResult(`Producto creado:\n${JSON.stringify(data, null, 2)}`);
            }
        } catch (err) {
            setStatus('❌ Exception en FETCH INSERT');
            setResult(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
        }
    }

    return (
        <div style={{ padding: '40px', fontFamily: 'monospace', background: '#1a1a2e', color: '#eee', minHeight: '100vh' }}>
            <h1 style={{ color: '#d4af37' }}>🔧 Test FETCH Vanilla (Sin SDK)</h1>
            <p style={{ color: '#888', marginBottom: '20px' }}>Este test usa fetch() directo a la API REST de Supabase, sin el SDK</p>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={testFetchSelect}
                    style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer', background: '#4a6a4a', color: '#fff', border: 'none', borderRadius: '5px' }}
                >
                    Test FETCH SELECT
                </button>
                <button
                    onClick={testFetchInsert}
                    style={{ padding: '10px 20px', cursor: 'pointer', background: '#6a4a6a', color: '#fff', border: 'none', borderRadius: '5px' }}
                >
                    Test FETCH INSERT
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
                <p>Supabase URL: {SUPABASE_URL}</p>
                <p>Tenant ID: {DEMO_TENANT_ID}</p>
            </div>
        </div>
    );
}
