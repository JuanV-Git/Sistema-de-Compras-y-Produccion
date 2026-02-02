'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import {
    ArrowLeft,
    Package,
    Building2,
    Barcode,
    Edit,
    Loader2,
} from 'lucide-react';
import { getProductoById } from '@/services/productos';
import { getProveedoresByProducto, type ProductoProveedorConProveedor } from '@/services/productosProveedores';
import type { Producto, TipoProducto, TipoMateriaPrima } from '@/types/database';
import { TipoProductoLabels, TipoMateriaPrimaLabels } from '@/types/database';

const tipoBadgeVariant: Record<TipoProducto, 'default' | 'gold' | 'success' | 'warning'> = {
    MP: 'default',
    ETIQUETA: 'warning',
    ENVASE: 'warning',
    SE: 'gold',
    PT: 'success',
};

// =====================================================
// PAGE COMPONENT
// =====================================================
export default function ProductoDetallePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [producto, setProducto] = useState<Producto | null>(null);
    const [proveedores, setProveedores] = useState<ProductoProveedorConProveedor[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [productoData, proveedoresData] = await Promise.all([
                    getProductoById(id),
                    getProveedoresByProducto(id),
                ]);
                setProducto(productoData);
                setProveedores(proveedoresData);
            } catch (error) {
                console.error('Error loading producto:', error);
            }
            setLoading(false);
        }

        if (id) {
            loadData();
        }
    }, [id]);

    if (loading) {
        return (
            <PageContainer title="Cargando...">
                <Card className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">Cargando producto...</p>
                </Card>
            </PageContainer>
        );
    }

    if (!producto) {
        return (
            <PageContainer title="Producto no encontrado">
                <Card className="text-center py-12">
                    <Package className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
                    <p className="text-[var(--text-secondary)] mb-4">El producto solicitado no existe</p>
                    <Button onClick={() => router.push('/productos')}>
                        <ArrowLeft className="w-4 h-4" /> Volver a Productos
                    </Button>
                </Card>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title={producto.nombre}
            description={`${producto.codigo} · ${TipoProductoLabels[producto.tipo]}${producto.tipo_materia_prima ? ` · ${TipoMateriaPrimaLabels[producto.tipo_materia_prima as TipoMateriaPrima]}` : ''}`}
            actions={
                <div className="flex gap-2">
                    <Link href={`/productos/${producto.id}/editar`}>
                        <Button>
                            <Edit className="w-4 h-4" /> Editar
                        </Button>
                    </Link>
                    <Button variant="secondary" onClick={() => router.push('/productos')}>
                        <ArrowLeft className="w-4 h-4" /> Volver
                    </Button>
                </div>
            }
        >
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Stock Actual</p>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">
                        {producto.stock_actual?.toLocaleString() || 0} <span className="text-lg">{producto.unidad_medida}</span>
                    </p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Stock Mínimo</p>
                    <p className="text-3xl font-bold text-[var(--text-secondary)]">
                        {producto.stock_minimo?.toLocaleString() || 0} <span className="text-lg">{producto.unidad_medida}</span>
                    </p>
                </Card>
                <Card className="text-center border-[var(--accent-gold)]/30">
                    <p className="text-sm text-[var(--text-muted)]">Costo Unitario</p>
                    <p className="text-3xl font-bold gold-text">
                        ${producto.costo_unitario?.toFixed(2) || '0.00'}
                    </p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Proveedores</p>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{proveedores.length}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información General */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-[var(--accent-gold)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Información General</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-[var(--border-default)]">
                            <span className="text-[var(--text-muted)]">Código</span>
                            <span className="font-mono text-[var(--accent-gold)]">{producto.codigo}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-[var(--border-default)]">
                            <span className="text-[var(--text-muted)]">Tipo</span>
                            <Badge variant={tipoBadgeVariant[producto.tipo]}>
                                {TipoProductoLabels[producto.tipo]}
                            </Badge>
                        </div>
                        {producto.tipo_materia_prima && (
                            <div className="flex justify-between py-2 border-b border-[var(--border-default)]">
                                <span className="text-[var(--text-muted)]">Categoría MP</span>
                                <span className="text-[var(--text-primary)]">
                                    {TipoMateriaPrimaLabels[producto.tipo_materia_prima as TipoMateriaPrima]}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between py-2 border-b border-[var(--border-default)]">
                            <span className="text-[var(--text-muted)]">Unidad de Medida</span>
                            <span className="text-[var(--text-primary)]">{producto.unidad_medida}</span>
                        </div>
                        {producto.descripcion && (
                            <div className="pt-2">
                                <span className="text-[var(--text-muted)] block mb-1">Descripción</span>
                                <p className="text-[var(--text-secondary)]">{producto.descripcion}</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Códigos Alternativos por Proveedor */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <Barcode className="w-5 h-5 text-[var(--accent-gold)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Códigos por Proveedor</h3>
                        <Badge variant="default" size="sm" className="ml-auto">{proveedores.length}</Badge>
                    </div>

                    {proveedores.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-default)]">
                                    <th className="text-left py-2 text-[var(--text-muted)]">Proveedor</th>
                                    <th className="text-left py-2 text-[var(--text-muted)]">Código Alt.</th>
                                    <th className="text-right py-2 text-[var(--text-muted)]">Precio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proveedores.map((pp) => (
                                    <tr key={pp.id} className="border-b border-[var(--border-default)]/50">
                                        <td className="py-2">
                                            <span className="text-[var(--text-primary)]">{pp.proveedor?.nombre}</span>
                                            {pp.es_principal && (
                                                <Badge variant="warning" size="sm" className="ml-2">Principal</Badge>
                                            )}
                                        </td>
                                        <td className="py-2 font-mono text-[var(--accent-gold)]">
                                            {pp.codigo_alternativo || '-'}
                                        </td>
                                        <td className="py-2 text-right text-[var(--text-primary)]">
                                            {pp.precio_unitario ? `$${pp.precio_unitario.toFixed(2)}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-8">
                            <Building2 className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
                            <p className="text-[var(--text-muted)]">Sin proveedores asociados</p>
                            <Link href={`/productos/${producto.id}/editar`}>
                                <Button size="sm" className="mt-3">
                                    Agregar Proveedores
                                </Button>
                            </Link>
                        </div>
                    )}
                </Card>
            </div>
        </PageContainer>
    );
}
