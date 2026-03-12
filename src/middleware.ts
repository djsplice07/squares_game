import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin routes require ADMIN or VIEWER role
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'ADMIN' && token?.role !== 'VIEWER') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // My-squares requires PLAYER or higher
    if (pathname.startsWith('/my-squares')) {
      if (!token?.role) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Allow public routes without auth
        if (
          pathname === '/' ||
          pathname === '/login' ||
          pathname === '/register' ||
          pathname === '/signup' ||
          pathname === '/setup' ||
          pathname === '/print' ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/setup') ||
          pathname.startsWith('/api/squares') ||
          pathname.startsWith('/api/settings') ||
          pathname.startsWith('/api/uploads') ||
          pathname.startsWith('/api/users') ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/images')
        ) {
          return true;
        }
        // All other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|uploads).*)',
  ],
};
