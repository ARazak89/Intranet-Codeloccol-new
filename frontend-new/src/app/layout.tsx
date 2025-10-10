import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import ClientLayout from '@/components/ClientLayout';
import './globals.css';
import ReactQueryProvider from './ReactQueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <ReactQueryProvider>
            <AuthProvider>
              <Toaster position="top-right" richColors closeButton />
              <ClientLayout>
                {children}
              </ClientLayout>
            </AuthProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}