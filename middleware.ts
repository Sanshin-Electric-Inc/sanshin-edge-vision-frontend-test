// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 環境判定関数
function isDevelopment(): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  const environment = process.env.ENVIRONMENT;
  return environment === 'dev' || environment === 'staging';
}

// 認証が必要なパスの判定
function isProtectedRoute(pathname: string): boolean {
  const protectedPaths = ['/dashboard'];
  return protectedPaths.some(path => pathname.startsWith(path));
}

// 認証関連パスの判定
function isAuthRoute(pathname: string): boolean {
  const authPaths = ['/auth/signin', '/auth/signup'];
  return authPaths.some(path => pathname.startsWith(path));
}

// 認証フロー中のパスの判定
function isAuthFlowRoute(pathname: string): boolean {
  const authFlowPaths = ['/auth/callback', '/auth/set-password', '/auth/reset-password', '/auth/verify-otp'];
  return authFlowPaths.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 認証フロー中のパスは何もせずスルー
  if (isAuthFlowRoute(pathname)) {
    return NextResponse.next({
      request,
    });
  }
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // セッションを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 開発環境の場合
  if (isDevelopment()) {
    // /auth/signin にアクセスした場合、ダッシュボードにリダイレクト
    if (pathname === '/auth/signin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 保護されたルートへのアクセスは全て許可
    if (isProtectedRoute(pathname)) {
      return supabaseResponse;
    }
  } 
  // 本番環境の場合
  else {
    // 認証が必要なパスで未認証の場合
    if (isProtectedRoute(pathname) && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // 認証ページで既に認証済みの場合
    if (isAuthRoute(pathname) && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

// ミドルウェアを適用するパスの設定
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
    '/dashboard/:path*',
    '/auth/:path*'
  ],
};