'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { RecetaForm } from '@/components/forms/RecetaForm';
import { getRecetaById } from '@/services/recetas';
import type { Receta } from '@/types/database';
import { PageContainer } from '@/components/layout';
import { Card } from '@/components/ui';
import { Loader2 } from 'lucide-react';

export default function EditarRecetaPage() {
    const params = useParams();
    const id = params.id as string;

    const [receta, setReceta] = useState<Receta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadReceta() {
            setLoading(true);
            try {
                const data = await getRecetaById(id);
                if (!data) {
                    setError('Receta no encontrada');
                } else {
                    setReceta(data);
                }
            } catch (err) {
                setError('Error al cargar la receta');
                console.error(err);
            }
            setLoading(false);
        }

        if (id) {
            loadReceta();
        }
    }, [id]);

    if (loading) {
        return (
            <PageContainer title="Cargando..." description="">
                <Card className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">Cargando receta...</p>
                </Card>
            </PageContainer>
        );
    }

    if (error || !receta) {
        return (
            <PageContainer title="Error" description="">
                <Card className="text-center py-12">
                    <p className="text-[var(--color-danger)]">{error || 'Receta no encontrada'}</p>
                </Card>
            </PageContainer>
        );
    }

    return <RecetaForm receta={receta} mode="edit" />;
}
