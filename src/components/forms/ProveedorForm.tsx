'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import { createProveedor, updateProveedor, getNextCodigoProveedor } from '@/services/proveedores';
import type { Proveedor } from '@/types/database';
import Link from 'next/link';

interface ProveedorFormProps {
    proveedor?: Proveedor;
    mode: 'create' | 'edit';
}

export function ProveedorForm({ proveedor, mode }: ProveedorFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        codigo: proveedor?.codigo || '',
        nombre: proveedor?.nombre || '',
        razon_social: proveedor?.razon_social || '',
        cuit: proveedor?.cuit || '',
        email: (proveedor?.details as any)?.email || '',
        telefono: (proveedor?.details as any)?.telefono || '',
        direccion: proveedor?.direccion || '',
        contacto_nombre: proveedor?.contacto_nombre || '',
        contacto_email: proveedor?.contacto_email || '',
        contacto_telefono: proveedor?.contacto_telefono || '',
        condicion_pago: proveedor?.condicion_pago || '',
        plazo_entrega_dias: proveedor?.plazo_entrega_dias?.toString() || '15',
    });
    const [loadingCodigo, setLoadingCodigo] = useState(mode === 'create');

    // Cargar codigo automatico en modo crear
    useEffect(() => {
        if (mode === 'create') {
            getNextCodigoProveedor().then((codigo) => {
                setFormData((prev) => ({ ...prev, codigo }));
                setLoadingCodigo(false);
            });
        }
    }, [mode]);

    function handleChange(field: string, value: string) {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = {
                codigo: formData.codigo,
                nombre: formData.nombre,
                razon_social: formData.razon_social || undefined,
                cuit: formData.cuit || undefined,
                contacto_nombre: formData.contacto_nombre || undefined,
                contacto_email: formData.contacto_email || undefined,
                contacto_telefono: formData.contacto_telefono || undefined,
                condicion_pago: formData.condicion_pago || undefined,
                plazo_entrega_dias: parseInt(formData.plazo_entrega_dias) || 15,
                details: {
                    email: formData.email,
                    telefono: formData.telefono
                },
                activo: true,
            };

            let result;
            if (mode === 'edit' && proveedor) {
                result = await updateProveedor(proveedor.id, data);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                result = await createProveedor(data as any);
            }

            if (!result) {
                setError('Error al guardar el proveedor. Verificá los datos e intentá nuevamente.');
                return;
            }

            router.push('/proveedores');
            router.refresh();
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
            setError(`Error al guardar: ${errorMessage}`);
            console.error('Full error:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <PageContainer
            title={mode === 'create' ? 'Nuevo Proveedor' : 'Editar Proveedor'}
            description={mode === 'create' ? 'Registrar un nuevo proveedor' : `Editando: ${proveedor?.nombre}`}
        >
            <form onSubmit={handleSubmit}>
                <Card className="mb-6">
                    {error && (
                        <div className="mb-4 p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg text-[var(--color-danger)]">
                            {error}
                        </div>
                    )}

                    {/* Sección: Datos Principales */}
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Datos Principales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Código */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Código {mode === 'create' ? '(automático)' : '*'}
                            </label>
                            <input
                                type="text"
                                value={loadingCodigo ? 'Generando...' : formData.codigo}
                                onChange={(e) => handleChange('codigo', e.target.value)}
                                required
                                readOnly={mode === 'create'}
                                placeholder="PROV-001"
                                className={`w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)] ${mode === 'create' ? 'cursor-not-allowed opacity-70' : ''}`}
                            />
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Nombre Comercial *
                            </label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => handleChange('nombre', e.target.value)}
                                required
                                placeholder="Nombre del proveedor"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Razón Social */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Razón Social
                            </label>
                            <input
                                type="text"
                                value={formData.razon_social}
                                onChange={(e) => handleChange('razon_social', e.target.value)}
                                placeholder="Razón social legal"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* CUIT */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                CUIT
                            </label>
                            <input
                                type="text"
                                value={formData.cuit}
                                onChange={(e) => handleChange('cuit', e.target.value)}
                                placeholder="XX-XXXXXXXX-X"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                    </div>

                    {/* Sección: Contacto */}
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Información de Contacto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="contacto@empresa.com"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Teléfono
                            </label>
                            <input
                                type="text"
                                value={formData.telefono}
                                onChange={(e) => handleChange('telefono', e.target.value)}
                                placeholder="+54 11 1234-5678"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Dirección */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Dirección
                            </label>
                            <input
                                type="text"
                                value={formData.direccion}
                                onChange={(e) => handleChange('direccion', e.target.value)}
                                placeholder="Calle 123, Ciudad"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                    </div>

                    {/* Sección: Contacto Comercial */}
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Contacto Comercial</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Nombre Contacto */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Nombre del Contacto
                            </label>
                            <input
                                type="text"
                                value={formData.contacto_nombre}
                                onChange={(e) => handleChange('contacto_nombre', e.target.value)}
                                placeholder="Juan Pérez"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Email Contacto */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Email del Contacto
                            </label>
                            <input
                                type="email"
                                value={formData.contacto_email}
                                onChange={(e) => handleChange('contacto_email', e.target.value)}
                                placeholder="juan@empresa.com"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Teléfono Contacto */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Teléfono del Contacto
                            </label>
                            <input
                                type="text"
                                value={formData.contacto_telefono}
                                onChange={(e) => handleChange('contacto_telefono', e.target.value)}
                                placeholder="+54 11 9999-8888"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                    </div>

                    {/* Sección: Condiciones Comerciales */}
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Condiciones Comerciales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Condición de Pago */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Condición de Pago
                            </label>
                            <input
                                type="text"
                                value={formData.condicion_pago}
                                onChange={(e) => handleChange('condicion_pago', e.target.value)}
                                placeholder="30 días FF"
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>

                        {/* Plazo de Entrega */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                Plazo de Entrega (días)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.plazo_entrega_dias}
                                onChange={(e) => handleChange('plazo_entrega_dias', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                            />
                        </div>
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <Link href="/proveedores">
                        <Button type="button" variant="ghost">
                            <ArrowLeft className="w-4 h-4" /> Cancelar
                        </Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {mode === 'create' ? 'Crear Proveedor' : 'Guardar Cambios'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </PageContainer>
    );
}
