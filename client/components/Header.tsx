'use client';

import Link from 'next/link';
import { WalletConnect } from '@/components/WalletConnect';
import { Bitcoin, Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="relative">
            <Bitcoin className="w-8 h-8 text-bitcoin bitcoin-glow" />
            <Zap className="w-4 h-4 text-starknet absolute -bottom-1 -right-1" />
          </div>
          <span className="text-2xl font-bold gradient-text">
            BitCred
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/score"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Get Score
          </Link>
          <Link
            href="/lending"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Lending
          </Link>
          <a
            href="https://github.com/TwigaDevs/BitCred"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </a>
        </nav>

        {/* Wallet Connect */}
        <WalletConnect />
      </div>
    </header>
  );
}