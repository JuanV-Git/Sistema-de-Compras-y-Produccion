'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProveedorForm } from '@/components/forms/ProveedorForm';
import { getProveedorById } from '@/services/proveedores';
import type { Proveedor } from '@/types/database';
import { PageContainer } from '@/components/layout';
import { Card } from '@/components/ui';
import { Loader2 } from 'lucide-react';

export default function EditarProveedorPage() {
    const params = useParams();
    const id = params.id as string;

    const [proveedor, setProveedor] = useState<Proveedor | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadProveedor() {
            setLoading(true);
            try {
                const data = await getProveedorById(id);
                if (!data) {
                    setError('Proveedor no encontrado');
                } else {
                    setProveedor(data);
                }
            } catch (err) {
                setError('Error al cargar el proveedor');
                console.error(err);
            }
            setLoading(false);
        }

        if (id) {
            loadProveedor();
        }
    }, [id]);

    if (loading) {
        return (
            <PageContainer title="Cargando..." description="">
                <Card className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">Cargando proveedor...</p>
                </Card>
            </PageContainer>
        );
    }

    if (error || !proveedor) {
        return (
            <PageContainer title="Error" description="">
                <Card className="text-center py-12">
                    <p className="text-[var(--color-danger)]">{error || 'Proveedor no encontrado'}</p>
                </Card>
            </PageContainer>
        );
    }

    return <ProveedorForm proveedor={proveedor} mode="edit" />;
}
