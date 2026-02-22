import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { StarknetProvider } from '@/components/providers/StarknetProvider';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BitCred - Bitcoin Credit Scoring for DeFi',
  description: 'Privacy-preserving credit scoring system that rewards Bitcoin holders with better DeFi lending terms on Starknet',
  keywords: ['Bitcoin', 'Starknet', 'DeFi', 'Credit Scoring', 'Lending', 'ZK Proofs'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <StarknetProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </StarknetProvider>
      </body>
    </html>
  );
}