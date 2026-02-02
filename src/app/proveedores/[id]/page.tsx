'use client';

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
} from 'lucide-react';
import {
    Proveedor,
    CondicionPagoLabels,
    OrdenCompraProveedor,
    PendienteEntregaProveedor,
} from '@/types';

// =====================================================
// MOCK DATA - Proveedores Extendidos
// =====================================================
interface ProveedorDetalle extends Proveedor {
    ordenesCerradas: OrdenCompraProveedor[];
    pendientesEntrega: PendienteEntregaProveedor[];
}

const mockProveedores: Record<string, ProveedorDetalle> = {
    '1': {
        id: '1',
        codigo: 'PROV-001',
        razonSocial: 'Químicos del Norte S.A.',
        contacto: 'Roberto Fernández',
        telefono: '+54 351 456-7890',
        email: 'ventas@quimicosnorte.com',
        direccion: 'Av. Colón 1234, Córdoba',
        activo: true,
        condicionPago: 'CONTRA_FACTURA',
        plazoPagoDias: 30,
        plazoEnvioValoresDias: 25,
        emailOrdenes: 'ordenes@quimicosnorte.com',
        whatsappOrdenes: '+54 351 456-7891',
        ordenesCerradas: [
            { id: '1', numeroOrden: 'OC-2026-014', fecha: '25/01/2026', items: 3, total: '$45,000', estado: 'CERRADA', fechaCierre: '30/01/2026' },
            { id: '2', numeroOrden: 'OC-2026-005', fecha: '05/01/2026', items: 2, total: '$32,500', estado: 'CERRADA', fechaCierre: '10/01/2026' },
            { id: '3', numeroOrden: 'OC-2025-098', fecha: '20/12/2025', items: 4, total: '$58,000', estado: 'CERRADA', fechaCierre: '27/12/2025' },
            { id: '4', numeroOrden: 'OC-2025-088', fecha: '01/12/2025', items: 2, total: '$28,500', estado: 'CERRADA', fechaCierre: '08/12/2025' },
        ],
        pendientesEntrega: [
            { id: '1', numeroOC: 'OC-2026-015', producto: 'Dióxido de Titanio', cantidadPendiente: 500, unidad: 'kg', fechaEstimada: '05/02/2026' },
            { id: '2', numeroOC: 'OC-2026-015', producto: 'Carbonato de Calcio', cantidadPendiente: 300, unidad: 'kg', fechaEstimada: '05/02/2026' },
        ],
    },
    '2': {
        id: '2',
        codigo: 'PROV-002',
        razonSocial: 'Resinas Industriales',
        contacto: 'Laura Martínez',
        telefono: '+54 351 234-5678',
        email: 'comercial@resinas.com',
        direccion: 'Ruta 9 Km 12, Córdoba',
        activo: true,
        condicionPago: 'ANTICIPADO',
        plazoPagoDias: 0,
        plazoEnvioValoresDias: 0,
        emailOrdenes: 'pedidos@resinas.com',
        whatsappOrdenes: '+54 351 234-5679',
        ordenesCerradas: [
            { id: '1', numeroOrden: 'OC-2026-013', fecha: '28/01/2026', items: 2, total: '$38,000', estado: 'CERRADA', fechaCierre: '30/01/2026' },
            { id: '2', numeroOrden: 'OC-2026-008', fecha: '12/01/2026', items: 1, total: '$22,000', estado: 'CERRADA', fechaCierre: '18/01/2026' },
        ],
        pendientesEntrega: [],
    },
    '3': {
        id: '3',
        codigo: 'PROV-003',
        razonSocial: 'Solventes Premium Ltda.',
        contacto: 'Diego Sánchez',
        telefono: '+54 351 789-0123',
        email: 'info@solventespremium.com',
        direccion: 'Parque Industrial, Córdoba',
        activo: true,
        condicionPago: 'CONTRA_FACTURA',
        plazoPagoDias: 15,
        plazoEnvioValoresDias: 10,
        emailOrdenes: 'compras@solventespremium.com',
        whatsappOrdenes: '+54 351 789-0124',
        ordenesCerradas: [
            { id: '1', numeroOrden: 'OC-2026-011', fecha: '20/01/2026', items: 1, total: '$18,000', estado: 'CERRADA', fechaCierre: '25/01/2026' },
        ],
        pendientesEntrega: [],
    },
};

// =====================================================
// PAGE COMPONENT
// =====================================================
export default function ProveedorDetallePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const proveedor = mockProveedores[id];

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

    const totalCompras = proveedor.ordenesCerradas.length;
    const totalPendiente = proveedor.pendientesEntrega.length;

    return (
        <PageContainer
            title={proveedor.razonSocial}
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
                    <p className="text-xl font-bold gold-text">{CondicionPagoLabels[proveedor.condicionPago]}</p>
                </Card>
                <Card className="text-center">
                    <p className="text-sm text-[var(--text-muted)]">Plazo de Pago</p>
                    <p className="text-3xl font-bold text-[var(--text-primary)]">
                        {proveedor.plazoPagoDias} <span className="text-lg">días</span>
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
                                <p className="text-[var(--text-primary)]">{proveedor.telefono}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <Mail className="w-5 h-5 text-[var(--text-muted)]" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Email General</p>
                                <p className="text-[var(--text-primary)]">{proveedor.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <MapPin className="w-5 h-5 text-[var(--text-muted)]" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Dirección</p>
                                <p className="text-[var(--text-primary)]">{proveedor.direccion}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <Building2 className="w-5 h-5 text-[var(--text-muted)]" />
                            <div>
                                <p className="text-sm text-[var(--text-muted)]">Contacto</p>
                                <p className="text-[var(--text-primary)]">{proveedor.contacto}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Datos para Órdenes */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-[var(--accent-gold)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Envío de Órdenes (OC / OP)</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <Mail className="w-5 h-5 text-[var(--accent-gold)]" />
                            <div className="flex-1">
                                <p className="text-sm text-[var(--text-muted)]">Email para OC y OP</p>
                                <p className="text-[var(--accent-gold)]">{proveedor.emailOrdenes}</p>
                            </div>
                            <a href={`mailto:${proveedor.emailOrdenes}`} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                                <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
                            </a>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                            <MessageCircle className="w-5 h-5 text-green-500" />
                            <div className="flex-1">
                                <p className="text-sm text-[var(--text-muted)]">WhatsApp para OC y OP</p>
                                <p className="text-green-500">{proveedor.whatsappOrdenes}</p>
                            </div>
                            <a href={`https://wa.me/${proveedor.whatsappOrdenes.replace(/[^0-9]/g, '')}`} target="_blank" className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
                                <ExternalLink className="w-4 h-4 text-[var(--text-muted)]" />
                            </a>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                        <div className="flex items-center gap-2 mb-3">
                            <CreditCard className="w-5 h-5 text-[var(--accent-gold)]" />
                            <h4 className="font-medium text-[var(--text-primary)]">Condiciones de Pago</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                                <p className="text-sm text-[var(--text-muted)]">Condición</p>
                                <p className="font-medium text-[var(--text-primary)]">{CondicionPagoLabels[proveedor.condicionPago]}</p>
                            </div>
                            <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                                <p className="text-sm text-[var(--text-muted)]">Plazo de Pago</p>
                                <p className="font-medium text-[var(--text-primary)]">{proveedor.plazoPagoDias} días</p>
                            </div>
                            <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg col-span-2">
                                <p className="text-sm text-[var(--text-muted)]">Plazo Envío de Valores</p>
                                <p className="font-medium text-[var(--text-primary)]">{proveedor.plazoEnvioValoresDias} días desde fecha factura</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Órdenes Cerradas */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-5 h-5 text-[var(--color-success)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Órdenes de Compra Cerradas</h3>
                        <Badge variant="success" size="sm" className="ml-auto">{proveedor.ordenesCerradas.length}</Badge>
                    </div>
                    {proveedor.ordenesCerradas.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border-default)]">
                                        <th className="text-left py-2 text-[var(--text-muted)]">Nº Orden</th>
                                        <th className="text-left py-2 text-[var(--text-muted)]">Fecha</th>
                                        <th className="text-right py-2 text-[var(--text-muted)]">Total</th>
                                        <th className="text-left py-2 text-[var(--text-muted)]">Cierre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proveedor.ordenesCerradas.map((oc) => (
                                        <tr key={oc.id} className="border-b border-[var(--border-default)]/50 hover:bg-[var(--bg-tertiary)]/50">
                                            <td className="py-2">
                                                <Link href={`/compras/${oc.id}`} className="font-mono text-[var(--accent-gold)] hover:underline">
                                                    {oc.numeroOrden}
                                                </Link>
                                            </td>
                                            <td className="py-2 text-[var(--text-secondary)]">{oc.fecha}</td>
                                            <td className="py-2 text-right font-medium text-[var(--text-primary)]">{oc.total}</td>
                                            <td className="py-2 text-[var(--text-muted)]">{oc.fechaCierre}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            Sin órdenes cerradas
                        </div>
                    )}
                </Card>

                {/* Pendientes de Entrega */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <Truck className="w-5 h-5 text-[var(--color-warning)]" />
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Pendientes de Entrega</h3>
                        {proveedor.pendientesEntrega.length > 0 && (
                            <Badge variant="warning" size="sm" className="ml-auto">{proveedor.pendientesEntrega.length}</Badge>
                        )}
                    </div>
                    {proveedor.pendientesEntrega.length > 0 ? (
                        <div className="space-y-3">
                            {proveedor.pendientesEntrega.map((pend) => (
                                <div key={pend.id} className="p-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <Link href={`/compras/${pend.id}`} className="font-mono text-[var(--color-warning)] hover:underline">
                                                {pend.numeroOC}
                                            </Link>
                                            <p className="text-[var(--text-primary)] font-medium">{pend.producto}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-[var(--text-primary)]">
                                                {pend.cantidadPendiente.toLocaleString()} {pend.unidad}
                                            </p>
                                            <p className="text-sm text-[var(--text-muted)]">Est: {pend.fechaEstimada}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Calendar className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
                            <p className="text-[var(--text-muted)]">Sin entregas pendientes</p>
                        </div>
                    )}
                </Card>
            </div>
        </PageContainer>
    );
}
