'use client';

import { usePathname } from 'next/navigation';
import Layout from './Layout';

const publicPaths = ['/', '/login'];

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isPublicPath = publicPaths.includes(pathname);

  return isPublicPath ? (
    <>{children}</>
  ) : (
    <Layout>
      {children}
    </Layout>
  );
}
