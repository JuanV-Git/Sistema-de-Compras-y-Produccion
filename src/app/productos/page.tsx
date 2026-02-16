'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Button, Select, Badge } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/Modal';
import { Plus, Search, Package, Edit, Trash2, Eye, Loader2 } from 'lucide-react';
import { getProductos, deleteProducto } from '@/services/productos';
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
// PRODUCTOS PAGE
// =====================================================
export default function ProductosPage() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState('');

    // Estado para modal de eliminar
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; producto: Producto | null }>({
        isOpen: false,
        producto: null
    });
    const [deleting, setDeleting] = useState(false);

    // Cargar datos de Supabase
    useEffect(() => {
        async function loadProductos() {
            setLoading(true);
            const data = await getProductos();
            setProductos(data);
            setLoading(false);
        }
        loadProductos();
    }, []);

    // Filtrar productos
    const filteredProductos = useMemo(() => {
        return productos.filter((p) => {
            const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.codigo.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTipo = !tipoFilter || p.tipo === tipoFilter;
            return matchesSearch && matchesTipo;
        });
    }, [productos, searchTerm, tipoFilter]);

    // Stats
    const stats = useMemo(() => ({
        mp: productos.filter(p => p.tipo === 'MP').length,
        etiqEnv: productos.filter(p => p.tipo === 'ETIQUETA' || p.tipo === 'ENVASE').length,
        se: productos.filter(p => p.tipo === 'SE').length,
        pt: productos.filter(p => p.tipo === 'PT').length,
        total: productos.length,
    }), [productos]);

    // Función para eliminar producto
    async function handleDelete() {
        if (!deleteModal.producto) return;

        setDeleting(true);
        try {
            await deleteProducto(deleteModal.producto.id);

            // Recargar lista
            const data = await getProductos();
            setProductos(data);
            setDeleteModal({ isOpen: false, producto: null });
        } catch (error: any) {
            alert(error.message || 'Error al eliminar el producto');
        } finally {
            setDeleting(false);
        }
    }

    return (
        <PageContainer
            title="Productos"
            description="Gestión de materias primas, semielaborados y productos finales"
            actions={
                <Link href="/productos/nuevo">
                    <Button>
                        <Plus className="w-4 h-4" /> Nuevo Producto
                    </Button>
                </Link>
            }
        >
            {/* Filters */}
            <Card className="mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder="Buscar por código o nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                    </div>
                    <Select
                        options={[
                            { value: 'MP', label: 'Materia Prima' },
                            { value: 'ETIQUETA', label: 'Etiqueta' },
                            { value: 'ENVASE', label: 'Envase' },
                            { value: 'SE', label: 'Semi Elaborado' },
                            { value: 'PT', label: 'Prod. Terminado' },
                        ]}
                        value={tipoFilter}
                        onChange={(e) => setTipoFilter(e.target.value)}
                        placeholder="Todos los tipos"
                        className="w-full md:w-48"
                    />
                </div>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <Card className="text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.mp}</p>
                    <p className="text-sm text-[var(--text-muted)]">Mat. Primas</p>
                </Card>
                <Card className="text-center border-[var(--color-warning)]/30">
                    <p className="text-2xl font-bold text-[var(--color-warning)]">{stats.etiqEnv}</p>
                    <p className="text-sm text-[var(--text-muted)]">Etiq. / Envases</p>
                </Card>
                <Card className="text-center border-[var(--accent-gold)]/30">
                    <p className="text-2xl font-bold text-[var(--accent-gold)]">{stats.se}</p>
                    <p className="text-sm text-[var(--text-muted)]">Semi Elaborados</p>
                </Card>
                <Card className="text-center border-[var(--color-success)]/30">
                    <p className="text-2xl font-bold text-[var(--color-success)]">{stats.pt}</p>
                    <p className="text-sm text-[var(--text-muted)]">Prod. Terminados</p>
                </Card>
                <Card className="text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
                    <p className="text-sm text-[var(--text-muted)]">Total</p>
                </Card>
            </div>

            {/* Products Table */}
            <Card>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                        <span className="ml-3 text-[var(--text-secondary)]">Cargando productos...</span>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-default)]">
                                        <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Código</th>
                                        <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Nombre</th>
                                        <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Tipo</th>
                                        <th className="text-left py-3 px-4 text-[var(--text-muted)] font-medium">Unidad</th>
                                        <th className="text-right py-3 px-4 text-[var(--text-muted)] font-medium">Stock</th>
                                        <th className="text-right py-3 px-4 text-[var(--text-muted)] font-medium">Costo</th>
                                        <th className="text-center py-3 px-4 text-[var(--text-muted)] font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProductos.map((producto) => (
                                        <tr
                                            key={producto.id}
                                            className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                                        >
                                            <td className="py-3 px-4 font-mono text-[var(--accent-gold)]">
                                                <Link href={`/productos/${producto.id}`} className="hover:underline">
                                                    {producto.codigo}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4 text-[var(--text-primary)] font-medium">
                                                <Link href={`/productos/${producto.id}`} className="hover:underline">
                                                    {producto.nombre}
                                                </Link>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant={tipoBadgeVariant[producto.tipo]} size="sm">
                                                    {TipoProductoLabels[producto.tipo]}
                                                </Badge>
                                                {producto.tipo_materia_prima && (
                                                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                                                        ({TipoMateriaPrimaLabels[producto.tipo_materia_prima as TipoMateriaPrima]})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-[var(--text-secondary)]">{producto.unidad_medida}</td>
                                            <td className="py-3 px-4 text-right text-[var(--text-primary)]">
                                                {producto.stock_actual?.toLocaleString() || 0}
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium gold-text">
                                                ${producto.costo_unitario?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Link href={`/productos/${producto.id}`} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors" title="Ver detalle">
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link href={`/productos/${producto.id}/editar`} className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors" title="Editar">
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, producto })}
                                                        className="p-1.5 rounded hover:bg-red-900/30 text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredProductos.length === 0 && (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
                                <p className="text-[var(--text-secondary)]">No se encontraron productos</p>
                            </div>
                        )}
                    </>
                )}
            </Card>

            {/* Modal de confirmación para eliminar */}
            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, producto: null })}
                onConfirm={handleDelete}
                title="Eliminar Producto"
                message={`¿Estás seguro de eliminar "${deleteModal.producto?.nombre}"? Esta acción se puede revertir.`}
                confirmText="Eliminar"
                confirmVariant="danger"
                loading={deleting}
            />
        </PageContainer>
    );
}
