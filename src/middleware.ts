import { NextResponse, type NextRequest } from 'next/server';

// Middleware simplificado para desarrollo
// TODO: Restaurar autenticación completa para producción
export async function middleware(request: NextRequest) {
    // Por ahora, permitir todas las solicitudes sin verificación de auth
    // Esto evita el AbortError que ocurría con el middleware anterior
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc)
         * - api routes (for Supabase client calls)
         */
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
