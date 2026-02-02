'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { Database, CheckCircle, XCircle, RefreshCw, Package, Users, FlaskConical } from 'lucide-react';
import { getProductos } from '@/services/productos';
import { getProveedores } from '@/services/proveedores';
import { getRecetas } from '@/services/recetas';
import type { Producto, Proveedor, Receta } from '@/types/database';
import { TipoProductoLabels } from '@/types/database';

export default function TestSupabasePage() {
    const [loading, setLoading] = useState(true);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const [prods, provs, recs] = await Promise.all([
                getProductos(),
                getProveedores(),
                getRecetas(),
            ]);

            setProductos(prods);
            setProveedores(provs);
            setRecetas(recs);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const isConnected = !error && (productos.length > 0 || proveedores.length > 0);

    return (
        <PageContainer
            title="Test Supabase"
            description="Verificar conexión a la base de datos"
            actions={
                <Button onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recargar
                </Button>
            }
        >
            {/* Estado de conexión */}
            <Card className={`mb-6 ${isConnected ? 'border-[var(--color-success)]/50' : 'border-[var(--color-danger)]/50'}`}>
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-[var(--color-success)]/20' : 'bg-[var(--color-danger)]/20'}`}>
                        {isConnected ? (
                            <CheckCircle className="w-6 h-6 text-[var(--color-success)]" />
                        ) : (
                            <XCircle className="w-6 h-6 text-[var(--color-danger)]" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                            {loading ? 'Conectando...' : isConnected ? 'Conexión exitosa' : 'Error de conexión'}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)]">
                            {loading ? 'Verificando conexión a Supabase...' :
                                isConnected ? 'La base de datos está funcionando correctamente' :
                                    error || 'No se pudieron obtener datos'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="text-center">
                    <Package className="w-8 h-8 mx-auto text-[var(--accent-gold)] mb-2" />
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{productos.length}</p>
                    <p className="text-sm text-[var(--text-muted)]">Productos</p>
                </Card>
                <Card className="text-center">
                    <Users className="w-8 h-8 mx-auto text-[var(--accent-gold)] mb-2" />
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{proveedores.length}</p>
                    <p className="text-sm text-[var(--text-muted)]">Proveedores</p>
                </Card>
                <Card className="text-center">
                    <FlaskConical className="w-8 h-8 mx-auto text-[var(--accent-gold)] mb-2" />
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{recetas.length}</p>
                    <p className="text-sm text-[var(--text-muted)]">Recetas</p>
                </Card>
            </div>

            {/* Datos de productos */}
            {productos.length > 0 && (
                <Card className="mb-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        <Database className="w-5 h-5 inline mr-2 text-[var(--accent-gold)]" />
                        Productos desde Supabase
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-default)]">
                                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">Código</th>
                                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">Nombre</th>
                                    <th className="text-left py-2 px-3 text-[var(--text-muted)]">Tipo</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Stock</th>
                                    <th className="text-right py-2 px-3 text-[var(--text-muted)]">Costo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productos.map((prod) => (
                                    <tr key={prod.id} className="border-b border-[var(--border-default)]/50">
                                        <td className="py-2 px-3 font-mono text-[var(--accent-gold)]">{prod.codigo}</td>
                                        <td className="py-2 px-3 text-[var(--text-primary)]">{prod.nombre}</td>
                                        <td className="py-2 px-3">
                                            <Badge variant="default" size="sm">{TipoProductoLabels[prod.tipo]}</Badge>
                                        </td>
                                        <td className="py-2 px-3 text-right text-[var(--text-secondary)]">
                                            {prod.stock_actual} {prod.unidad_medida}
                                        </td>
                                        <td className="py-2 px-3 text-right font-medium gold-text">
                                            ${prod.costo_unitario?.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Datos de proveedores */}
            {proveedores.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
                        <Users className="w-5 h-5 inline mr-2 text-[var(--accent-gold)]" />
                        Proveedores desde Supabase
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {proveedores.map((prov) => (
                            <div key={prov.id} className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                                <p className="font-mono text-sm text-[var(--accent-gold)]">{prov.codigo}</p>
                                <p className="font-medium text-[var(--text-primary)]">{prov.nombre}</p>
                                <p className="text-sm text-[var(--text-muted)]">{prov.condicion_pago}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </PageContainer>
    );
}
