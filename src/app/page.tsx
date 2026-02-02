'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageContainer } from '@/components/layout';
import { Card, Badge, Button } from '@/components/ui';
import {
  Factory,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowRight,
  Clock,
  Warehouse,
  FlaskConical,
  DollarSign,
  Play,
  CheckCircle,
  FileText,
  Truck,
  Loader2,
} from 'lucide-react';
import { formatearCosto } from '@/types/recetas';
import {
  getResumenStock,
  getNivelStockColor,
  calcularNivelStock,
  type ProductoStock
} from '@/types/stock';
import { getOrdenesProduccion, type OrdenProduccionConRelaciones } from '@/services/ordenesProduccion';
import { getProductos } from '@/services/productos';
import { getOrdenesCompra, type OrdenCompraConRelaciones } from '@/services/ordenesCompra';

// =====================================================
// STATS CARD COMPONENT
// =====================================================
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  variant?: 'default' | 'gold' | 'warning' | 'success' | 'danger';
  href?: string;
}

function StatsCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', href }: StatsCardProps) {
  const variants = {
    default: 'border-[var(--border-default)]',
    gold: 'border-[var(--accent-gold)]/50 bg-gradient-to-br from-[var(--accent-gold)]/10 to-transparent',
    warning: 'border-[var(--color-warning)]/50 bg-[var(--color-warning)]/5',
    success: 'border-[var(--color-success)]/50 bg-[var(--color-success)]/5',
    danger: 'border-[var(--color-danger)]/50 bg-[var(--color-danger)]/5',
  };

  const iconVariants = {
    default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    gold: 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]',
    warning: 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]',
    success: 'bg-[var(--color-success)]/20 text-[var(--color-success)]',
    danger: 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]',
  };

  const content = (
    <Card className={`${variants[variant]} ${href ? 'hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-[var(--text-muted)]">{title}</p>
          <p className="text-3xl font-bold mt-1 text-[var(--text-primary)]">{value}</p>
          {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              <TrendingUp className={`w-4 h-4 ${!trend.isPositive ? 'rotate-180' : ''}`} />
              <span>{trend.isPositive ? '+' : ''}{trend.value}% vs mes anterior</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconVariants[variant]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

// =====================================================
// MAIN DASHBOARD
// =====================================================
export default function HomePage() {
  const [loading, setLoading] = useState(true);

  // Data State
  const [productosAlerta, setProductosAlerta] = useState<ProductoStock[]>([]);
  const [resumenGlobalStock, setResumenGlobalStock] = useState({
    total: 0,
    criticos: 0,
    bajos: 0,
    normales: 0,
    valorTotal: 0
  });

  const [ordenesProduccion, setOrdenesProduccion] = useState<OrdenProduccionConRelaciones[]>([]);
  const [opStats, setOpStats] = useState({ enCurso: 0, abiertas: 0 });

  const [ocStats, setOcStats] = useState({
    pendientes: 0,
    sinRemito: 0,
    sinFactura: 0,
    valorPendiente: 0
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 1. Fetch Data Parallel
        const [productosDb, opsDb, ocsDb] = await Promise.all([
          getProductos(),
          getOrdenesProduccion(),
          getOrdenesCompra()
        ]);

        // 2. Process Stock
        const productosProcesados: ProductoStock[] = productosDb.map(p => {
          const { nivel, porcentaje } = calcularNivelStock(p.stock_actual, p.stock_minimo, p.stock_maximo);
          return {
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            tipo: p.tipo,
            unidadMedida: p.unidad_medida,
            stockActual: p.stock_actual,
            stockMinimo: p.stock_minimo,
            stockMaximo: p.stock_maximo,
            nivelStock: nivel,
            porcentajeNivel: porcentaje,
            costoUnitario: p.costo_unitario || 0,
            valorizado: p.stock_actual * (p.costo_unitario || 0),
          };
        });

        const resumenStock = getResumenStock(productosProcesados);
        const alertas = productosProcesados.filter(p => p.nivelStock === 'CRITICO' || p.nivelStock === 'BAJO');

        setResumenGlobalStock(resumenStock);
        setProductosAlerta(alertas);

        // 3. Process Producción
        setOrdenesProduccion(opsDb);
        setOpStats({
          enCurso: opsDb.filter(o => o.estado === 'EN_PRODUCCION').length,
          abiertas: opsDb.filter(o => o.estado === 'PLANIFICADA').length // PLANIFICADA es ABIERTA en UI map
        });

        // 4. Process Compras
        const pendientes = ocsDb.filter(o => o.estado === 'ENVIADA' || o.estado === 'PARCIAL');
        const valorPendiente = pendientes.reduce((acc, o) => acc + (o.total || 0), 0);

        setOcStats({
          pendientes: pendientes.length,
          sinRemito: pendientes.length, // Simplificación: asumo que toda enviada espera remito
          sinFactura: 0, // No tenemos tracking de facturas aun
          valorPendiente
        });

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <PageContainer title="Dashboard" description="Cargando...">
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--accent-gold)]" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Dashboard"
      description="Vista general del sistema de gestión"
    >
      {/* Alertas críticas */}
      {(productosAlerta.length > 0 || ocStats.sinRemito > 0) && (
        <div className="mb-6 space-y-3">
          {productosAlerta.length > 0 && (
            <div className="p-4 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[var(--color-danger)] mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-danger)]">
                    {productosAlerta.length} producto(s) con stock crítico o bajo
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {productosAlerta.slice(0, 4).map(p => (
                      <Link
                        key={p.id}
                        href={`/productos/${p.id}`}
                        className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                      >
                        <span className="font-mono text-[var(--accent-gold)]">{p.codigo}</span>
                        <span className="mx-1">·</span>
                        <span style={{ color: getNivelStockColor(p.nivelStock) }}>{p.stockActual}/{p.stockMinimo}</span>
                      </Link>
                    ))}
                    {productosAlerta.length > 4 && (
                      <Link href="/stock" className="px-2 py-1 text-sm text-[var(--accent-gold)]">
                        +{productosAlerta.length - 4} más
                      </Link>
                    )}
                  </div>
                </div>
                <Link href="/stock">
                  <Button variant="secondary" size="sm">Ver Stock</Button>
                </Link>
              </div>
            </div>
          )}

          {ocStats.sinRemito > 0 && (
            <div className="p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[var(--color-warning)]" />
                <div className="flex-1">
                  <p className="font-medium text-[var(--color-warning)]">
                    {ocStats.sinRemito} OC pendientes de recepción
                  </p>
                </div>
                <Link href="/compras">
                  <Button variant="secondary" size="sm">Ver Compras</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Producción en Curso"
          value={opStats.enCurso}
          subtitle={`${opStats.abiertas} planificadas`}
          icon={Factory}
          variant={opStats.enCurso > 0 ? 'warning' : 'default'}
          href="/produccion"
        />
        <StatsCard
          title="OC Pendientes"
          value={ocStats.pendientes}
          subtitle={formatearCosto(ocStats.valorPendiente)}
          icon={ShoppingCart}
          variant={ocStats.pendientes > 0 ? 'gold' : 'default'}
          href="/compras"
        />
        <StatsCard
          title="Stock en Alerta"
          value={resumenGlobalStock.criticos + resumenGlobalStock.bajos}
          subtitle={`${resumenGlobalStock.criticos} críticos`}
          icon={Package}
          variant={resumenGlobalStock.criticos > 0 ? 'danger' : resumenGlobalStock.bajos > 0 ? 'warning' : 'success'}
          href="/stock"
        />
        <StatsCard
          title="Valor Inventario"
          value={formatearCosto(resumenGlobalStock.valorTotal)}
          subtitle={`${resumenGlobalStock.total} productos`}
          icon={DollarSign}
          variant="gold"
          href="/stock"
        />
      </div>

      {/* Secciones principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* OP en curso / recientes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-[var(--accent-gold)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Producción</h3>
            </div>
            <Link href="/produccion">
              <Button variant="ghost" size="sm">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {ordenesProduccion.filter(o => o.estado !== 'CANCELADA').slice(0, 4).map(op => (
              <Link
                key={op.id}
                href={`/produccion/${op.id}`}
                className="block p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${op.estado === 'EN_PRODUCCION' ? 'bg-[var(--color-warning)]' :
                      op.estado === 'PLANIFICADA' ? 'bg-[var(--accent-gold)]' :
                        'bg-[var(--color-success)]'
                      }`} />
                    <div>
                      <span className="font-mono text-sm text-[var(--accent-gold)]">{op.numero}</span>
                      <p className="text-sm text-[var(--text-primary)]">{op.producto?.nombre || 'Desconocido'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {op.cantidad_programada} {op.unidad_medida}
                    </p>
                    {op.estado === 'COMPLETADA' && (
                      <span className={`text-xs ${op.variacion_porcentaje > 5 ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                        {op.variacion_porcentaje > 0 ? '+' : ''}{op.variacion_porcentaje?.toFixed(1)}%
                      </span>
                    )}
                    {op.estado === 'EN_PRODUCCION' && (
                      <span className="text-xs text-[var(--color-warning)]">En producción</span>
                    )}
                    {op.estado === 'PLANIFICADA' && (
                      <span className="text-xs text-[var(--text-muted)]">Planificada</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
            {ordenesProduccion.length === 0 && (
              <p className="text-center text-[var(--text-muted)] py-4">No hay órdenes recientes</p>
            )}
          </div>
        </Card>

        {/* Stock con problemas */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-[var(--accent-gold)]" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Stock</h3>
            </div>
            <Link href="/stock">
              <Button variant="ghost" size="sm">
                Ver todo <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {productosAlerta.length > 0 ? (
            <div className="space-y-3">
              {productosAlerta.slice(0, 4).map(p => (
                <Link
                  key={p.id}
                  href={`/productos/${p.id}`}
                  className="block p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-mono text-sm text-[var(--accent-gold)]">{p.codigo}</span>
                      <p className="text-sm text-[var(--text-primary)]">{p.nombre}</p>
                    </div>
                    <Badge variant={p.nivelStock === 'CRITICO' ? 'warning' : 'default'} size="sm">
                      {p.nivelStock}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${p.porcentajeNivel}%`,
                          backgroundColor: getNivelStockColor(p.nivelStock),
                        }}
                      />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {p.stockActual}/{p.stockMinimo} {p.unidadMedida}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-[var(--color-success)] mb-3" />
              <p className="text-[var(--text-secondary)]">Todos los productos tienen stock normal</p>
            </div>
          )}
        </Card>
      </div>

      {/* Accesos rápidos */}
      <Card>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Accesos Rápidos</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link href="/produccion" className="p-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors text-center group">
            <Factory className="w-8 h-8 mx-auto text-[var(--text-muted)] group-hover:text-[var(--accent-gold)] transition-colors" />
            <p className="mt-2 text-sm text-[var(--text-primary)]">Producción</p>
          </Link>
          <Link href="/compras" className="p-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors text-center group">
            <ShoppingCart className="w-8 h-8 mx-auto text-[var(--text-muted)] group-hover:text-[var(--accent-gold)] transition-colors" />
            <p className="mt-2 text-sm text-[var(--text-primary)]">Compras</p>
          </Link>
          <Link href="/stock" className="p-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors text-center group">
            <Warehouse className="w-8 h-8 mx-auto text-[var(--text-muted)] group-hover:text-[var(--accent-gold)] transition-colors" />
            <p className="mt-2 text-sm text-[var(--text-primary)]">Stock</p>
          </Link>
          <Link href="/recetas" className="p-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors text-center group">
            <FlaskConical className="w-8 h-8 mx-auto text-[var(--text-muted)] group-hover:text-[var(--accent-gold)] transition-colors" />
            <p className="mt-2 text-sm text-[var(--text-primary)]">Recetas</p>
          </Link>
          <Link href="/productos" className="p-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors text-center group">
            <Package className="w-8 h-8 mx-auto text-[var(--text-muted)] group-hover:text-[var(--accent-gold)] transition-colors" />
            <p className="mt-2 text-sm text-[var(--text-primary)]">Productos</p>
          </Link>
        </div>
      </Card>
    </PageContainer>
  );
}
