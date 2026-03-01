'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import {
    ArrowLeft,
    Building2,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    Calendar,
    Truck,
    FileText,
    MessageCircle,
    ExternalLink,
    Loader2,
} from 'lucide-react';
import { CondicionPagoLabels } from '@/types';
import { getProveedorById } from '@/services/proveedores';
import type { Proveedor } from '@/types/database';

export default function ProveedorDetallePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [proveedor, setProveedor] = useState<Proveedor | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProveedor() {
            setLoading(true);
            const data = await getProveedorById(id);
            setProveedor(data);
            setLoading(false);
        }
        if (id) {
            loadProveedor();
        }
    }, [id]);

    if (loading) {
        return (
            <PageContainer title="Cargando proveedor...">
                <Card className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)] mx-auto mb-3" />
                    <p className="text-[var(--text-secondary)]">Obteniendo detalles del proveedor...</p>
                </Card>
            </PageContainer>
        );
    }

    if (!proveedor) {
        return (
            <PageContainer title="Proveedor no encontrado">
                <Card className="text-center py-12">
                    <Building2 className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
                    <p className="text-[var(--text-secondary)] mb-4">El proveedor solicitado no existe</p>
                    <Button onClick={() => router.push('/proveedores')}>
                        <ArrowLeft className="w-4 h-4" /> Volver a Proveedores
                    </Button>
                </Card>
            </PageContainer>
        );
    }

    const totalCompras = 0; // TODO: Implementar con base de datos
    const totalPendiente = 0; // TODO: Implementar con base de datos

    return (
        <PageContainer
            title={proveedor.nombre}
            description={`${proveedor.codigo} · ${proveedor.activo ? 'Activo' : 'Inactivo'}`}
            actions={
                <Button variant="secondary" onClick={() => router.push('/proveedores')}>
                    <ArrowLeft className="w-4 h-4" /> Volver
                </Button>
            }
        >
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Órdenes Cerradas</p>
                    <p className="text-3xl font-bold text-[var(--color-success)]">{totalCompras}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Pendientes Entrega</p>
                    <p className={`text-3xl font-bold ${totalPendiente > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--text-secondary)]'}`}>
                        {totalPendiente}
                    </p>
                </Card>
                <Card className="text-center border-[var(--accent-gold)]/30">
                    <p className="text-sm text-[var(--text-muted)]">Condición de Pago</p>
                    <p className="text-xl font-bold gold-text">
                        {proveedor.condicion_pago ? CondicionPagoLabels[proveedor.condicion_pago as keyof typeof CondicionPagoLabels] || proveedor.condicion_pago : 'No definida'}
                    </p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Plazo de Entrega</p>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">
                        {proveedor.plazo_entrega_dias || 0} <span className="text-lg">días</span>
                    </p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Info de Contacto */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-5 h-5 text-[var(--accent-gold)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Información de Contacto</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <Phone className="w-5 h-5 text-[var(--text-muted)]" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Teléfono</p>
                                <p className="text-[var(--text-primary)]">{proveedor.contacto_telefono || 'No registrado'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <Mail className="w-5 h-5 text-[var(--text-muted)]" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Email General</p>
                                <p className="text-[var(--text-primary)]">{proveedor.contacto_email || 'No registrado'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <MapPin className="w-5 h-5 text-[var(--text-muted)]" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Dirección</p>
                                <p className="text-[var(--text-primary)]">{proveedor.direccion || 'No registrada'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <Building2 className="w-5 h-5 text-[var(--text-muted)]" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Razón Social</p>
                                <p className="text-[var(--text-primary)]">{proveedor.razon_social || 'No registrada'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <Building2 className="w-5 h-5 text-[var(--text-muted)]" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">CUIT</p>
                                <p className="text-[var(--text-primary)]">{proveedor.cuit || 'No registrado'}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Órdenes Cerradas */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-[var(--color-success)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Órdenes de Compra Cerradas</h3>
                        <Badge variant="success" size="sm" className="ml-auto">0</Badge>
                    </div>
                    <div className="text-center py-8 text-[var(--text-muted)]">
                        Sin órdenes cerradas
                    </div>
                </Card>

                {/* Pendientes de Entrega */}
                <Card className="lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <Truck className="w-5 h-5 text-[var(--color-warning)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Pendientes de Entrega</h3>
                        <Badge variant="warning" size="sm" className="ml-auto">0</Badge>
                    </div>
                    <div className="text-center py-8">
                        <Calendar className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-[var(--text-muted)]">Sin entregas pendientes</p>
                    </div>
                </Card>
            </div>
        </PageContainer>
    );
}

