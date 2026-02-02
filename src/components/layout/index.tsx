'use client';

import { usePathname } from 'next/navigation';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    FlaskConical,
    Factory,
    ShoppingCart,
    Users,
    Boxes,
    ChevronLeft,
    ChevronRight,
    Settings,
    LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

// =====================================================
// TYPES
// =====================================================
interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

// =====================================================
// NAVIGATION CONFIG
// =====================================================
const navigation: NavGroup[] = [
    {
        title: 'Principal',
        items: [
            { label: 'Dashboard', href: '/', icon: LayoutDashboard },
        ],
    },
    {
        title: 'Producción',
        items: [
            { label: 'Productos', href: '/productos', icon: Package },
            { label: 'Recetas', href: '/recetas', icon: FlaskConical },
            { label: 'Órdenes de Producción', href: '/produccion', icon: Factory },
        ],
    },
    {
        title: 'Compras',
        items: [
            { label: 'Órdenes de Compra', href: '/compras', icon: ShoppingCart },
            { label: 'Proveedores', href: '/proveedores', icon: Users },
        ],
    },
    {
        title: 'Inventario',
        items: [
            { label: 'Control de Stock', href: '/stock', icon: Boxes },
        ],
    },
];

// =====================================================
// SINEWAV LOGO COMPONENT
// =====================================================
function SinewavLogo({ collapsed }: { collapsed: boolean }) {
    return (
        <div className="flex items-center gap-3 px-2">
            <div className="relative w-10 h-10 flex-shrink-0">
                <svg viewBox="0 0 40 40" className="w-full h-full">
                    <defs>
                        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--accent-gold)" />
                            <stop offset="50%" stopColor="var(--accent-copper)" />
                            <stop offset="100%" stopColor="var(--accent-sand)" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M5 20 Q10 10, 20 20 T35 20"
                        fill="none"
                        stroke="url(#goldGradient)"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    <path
                        d="M5 25 Q10 15, 20 25 T35 25"
                        fill="none"
                        stroke="url(#goldGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.6"
                    />
                </svg>
            </div>
            {!collapsed && (
                <div className="flex flex-col">
                    <span className="font-bold text-lg gold-text">Eureka</span>
                    <span className="text-xs text-[var(--text-muted)]">Consultoría Industrial</span>
                </div>
            )}
        </div>
    );
}

// =====================================================
// NAV LINK COMPONENT
// =====================================================
function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
    const pathname = usePathname();
    const isActive = pathname === item.href ||
        (item.href !== '/' && pathname.startsWith(item.href));
    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
        ${isActive
                    ? 'bg-[var(--accent-gold)]/10 text-[var(--accent-light)] border-l-2 border-[var(--accent-gold)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }
        ${collapsed ? 'justify-center' : ''}
      `}
            title={collapsed ? item.label : undefined}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[var(--accent-gold)]' : ''}`} />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
        </Link>
    );
}

// =====================================================
// SIDEBAR COMPONENT
// =====================================================
function SidebarComponent() {
    const [collapsed, setCollapsed] = useState(false);
    const { signOut } = useAuth();
    const router = useRouter();

    async function handleLogout() {
        await signOut();
        router.push('/login');
        router.refresh();
    }

    return (
        <aside
            className={`
        fixed left-0 top-0 h-screen
        bg-[var(--bg-secondary)] border-r border-[var(--border-default)]
        flex flex-col
        transition-all duration-300 ease-in-out z-40
        ${collapsed ? 'w-[72px]' : 'w-64'}
      `}
        >
            {/* Header con Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
                <SinewavLogo collapsed={collapsed} />
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 overflow-y-auto">
                {navigation.map((group, groupIndex) => (
                    <div key={group.title} className={groupIndex > 0 ? 'mt-6' : ''}>
                        {!collapsed && (
                            <h3 className="px-3 mb-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                {group.title}
                            </h3>
                        )}
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <NavLink key={item.href} item={item} collapsed={collapsed} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--border-default)]">
                {/* Collapse Button */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg
            text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]
            transition-all duration-200
            ${collapsed ? 'justify-center' : ''}
          `}
                >
                    {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    {!collapsed && <span className="text-sm">Colapsar</span>}
                </button>

                {/* Settings & Logout */}
                <div className={`mt-2 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
                    <Link
                        href="/configuracion"
                        className={`
              flex items-center gap-3 px-3 py-2 rounded-lg
              text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]
              transition-all duration-200
              ${collapsed ? 'justify-center' : ''}
            `}
                        title={collapsed ? 'Configuración' : undefined}
                    >
                        <Settings className="w-5 h-5" />
                        {!collapsed && <span className="text-sm">Configuración</span>}
                    </Link>
                    <button
                        onClick={handleLogout}
                        className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg
              text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-red-900/20
              transition-all duration-200
              ${collapsed ? 'justify-center' : ''}
            `}
                        title={collapsed ? 'Cerrar Sesión' : undefined}
                    >
                        <LogOut className="w-5 h-5" />
                        {!collapsed && <span className="text-sm">Cerrar Sesión</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
}

// =====================================================
// LAYOUT WRAPPER COMPONENT
// =====================================================
const publicPaths = ['/login', '/registro'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublicPage = publicPaths.includes(pathname);

    if (isPublicPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-[var(--bg-primary)]">
            <SidebarComponent />
            <main className="flex-1 ml-64 transition-all duration-300">
                <div className="h-16" />
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}

// =====================================================
// PAGE CONTAINER COMPONENT
// =====================================================
interface PageContainerProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    actions?: React.ReactNode;
}

export function PageContainer({ children, title, description, actions }: PageContainerProps) {
    return (
        <div className="max-w-7xl mx-auto">
            {(title || actions) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        {title && <h1 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h1>}
                        {description && <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>}
                    </div>
                    {actions && <div className="flex items-center gap-3">{actions}</div>}
                </div>
            )}
            {children}
        </div>
    );
}

// Export Sidebar alias
export { SidebarComponent as Sidebar };
