import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      const token = localStorage.getItem('adminToken');
      const isProtectedRoute = url.startsWith('/dashboard');
      const isLoginPage = url === '/login';

      if (isProtectedRoute && !token) {
        router.push('/login');
      } else if (isLoginPage && token) {
        router.push('/dashboard');
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  return (
    <main className={inter.className}>
      <Component {...pageProps} />
    </main>
  );
}
