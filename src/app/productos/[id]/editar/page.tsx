'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProductoForm } from '@/components/forms/ProductoForm';
import { getProductoById } from '@/services/productos';
import type { Producto } from '@/types/database';
import { PageContainer } from '@/components/layout';
import { Card } from '@/components/ui';
import { Loader2 } from 'lucide-react';

export default function EditarProductoPage() {
    const params = useParams();
    const id = params.id as string;

    const [producto, setProducto] = useState<Producto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadProducto() {
            setLoading(true);
            try {
                const data = await getProductoById(id);
                if (!data) {
                    setError('Producto no encontrado');
                } else {
                    setProducto(data);
                }
            } catch (err) {
                setError('Error al cargar el producto');
                console.error(err);
            }
            setLoading(false);
        }

        if (id) {
            loadProducto();
        }
    }, [id]);

    if (loading) {
        return (
            <PageContainer title="Cargando..." description="">
                <Card className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">Cargando producto...</p>
                </Card>
            </PageContainer>
        );
    }

    if (error || !producto) {
        return (
            <PageContainer title="Error" description="">
                <Card className="text-center py-12">
                    <p className="text-[var(--color-danger)]">{error || 'Producto no encontrado'}</p>
                </Card>
            </PageContainer>
        );
    }

    return <ProductoForm producto={producto} mode="edit" />;
}
