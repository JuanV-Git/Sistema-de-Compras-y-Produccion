'use client';

import { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout';
import { Card, Button } from '@/components/ui';
import { Save, Loader2, DollarSign, RefreshCw } from 'lucide-react';
import { getTipoCambio, setTipoCambio } from '@/services/configuracion';

export default function ConfiguracionPage() {
    const [tipoCambio, setTipoCambioLocal] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTipoCambio();
    }, []);

    async function loadTipoCambio() {
        setLoading(true);
        const valor = await getTipoCambio();
        setTipoCambioLocal(valor.toString());
        setLoading(false);
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const valor = parseFloat(tipoCambio);
            if (isNaN(valor) || valor <= 0) {
                setError('El tipo de cambio debe ser un número positivo');
                setSaving(false);
                return;
            }

            const result = await setTipoCambio(valor);
            if (result) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setError('Error al guardar el tipo de cambio');
            }
        } catch (err) {
            setError('Error al guardar');
        }
        setSaving(false);
    }

    return (
        <PageContainer
            title="Configuración"
            description="Parámetros globales del sistema"
        >
            <div className="max-w-2xl">
                <Card>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-[var(--accent-gold)]/10 rounded-lg">
                            <DollarSign className="w-6 h-6 text-[var(--accent-gold)]" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                Tipo de Cambio
                            </h3>
                            <p className="text-sm text-[var(--text-muted)]">
                                Cotización USD a Pesos Argentinos
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg text-[var(--color-danger)]">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-lg text-[var(--color-success)]">
                            ✓ Tipo de cambio actualizado correctamente
                        </div>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-gold)]" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                    1 USD =
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={tipoCambio}
                                            onChange={(e) => setTipoCambioLocal(e.target.value)}
                                            className="w-full pl-8 pr-16 py-3 text-xl rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">ARS</span>
                                    </div>
                                    <Button type="button" variant="ghost" onClick={loadTipoCambio}>
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
                                <p className="text-sm text-[var(--text-muted)] mb-2">Vista previa de conversiones:</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-[var(--text-muted)]">USD 1 = </span>
                                        <span className="gold-text font-medium">${parseFloat(tipoCambio || '0').toLocaleString('es-AR')} ARS</span>
                                    </div>
                                    <div>
                                        <span className="text-[var(--text-muted)]">USD 100 = </span>
                                        <span className="gold-text font-medium">${(parseFloat(tipoCambio || '0') * 100).toLocaleString('es-AR')} ARS</span>
                                    </div>
                                    <div>
                                        <span className="text-[var(--text-muted)]">USD 1.000 = </span>
                                        <span className="gold-text font-medium">${(parseFloat(tipoCambio || '0') * 1000).toLocaleString('es-AR')} ARS</span>
                                    </div>
                                    <div>
                                        <span className="text-[var(--text-muted)]">USD 10.000 = </span>
                                        <span className="gold-text font-medium">${(parseFloat(tipoCambio || '0') * 10000).toLocaleString('es-AR')} ARS</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Guardar Tipo de Cambio
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </PageContainer>
    );
}
