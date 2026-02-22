import Link from 'next/link';
import { ArrowRight, Shield, Zap, TrendingUp, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="gradient-bg">
      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center space-y-8">
          <div className="inline-block">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20">
              <Zap className="w-4 h-4" />
              Powered by Starknet ZK Technology
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Bitcoin Credit Scoring for{' '}
            <span className="gradient-text">DeFi Lending</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock better borrowing terms based on your Bitcoin on-chain behavior. 
            Get 110-130% collateral ratios vs traditional 150-200% — all while keeping your privacy intact.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/score"
              className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4 neon-glow"
            >
              Get Your Score
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#how-it-works"
              className="btn-outline inline-flex items-center gap-2 text-lg px-8 py-4"
            >
              Learn More
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
            <div className="space-y-2">
              <div className="text-4xl font-bold gradient-text">650-850</div>
              <div className="text-sm text-muted-foreground">Score Range</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold gradient-text">110%</div>
              <div className="text-sm text-muted-foreground">Min Collateral</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold gradient-text">100%</div>
              <div className="text-sm text-muted-foreground">Private</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="container py-24">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-5xl font-bold">How BitCred Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to unlock better lending terms
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="glass p-8 rounded-2xl card-hover space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center bitcoin-glow">
              <Shield className="w-6 h-6 text-bitcoin" />
            </div>
            <h3 className="text-xl font-semibold">1. Connect Bitcoin Wallet</h3>
            <p className="text-muted-foreground">
              Link your Bitcoin address. No private keys shared — only read-only access to on-chain history.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass p-8 rounded-2xl card-hover space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center neon-glow">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">2. Generate ZK Proof</h3>
            <p className="text-muted-foreground">
              AI analyzes your hodl duration, transaction frequency, and balance stability privately using zero-knowledge proofs.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass p-8 rounded-2xl card-hover space-y-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center starknet-glow">
              <TrendingUp className="w-6 h-6 text-starknet" />
            </div>
            <h3 className="text-xl font-semibold">3. Get Better Terms</h3>
            <p className="text-muted-foreground">
              Receive your score (650-850) and unlock personalized collateral ratios for DeFi lending on Starknet.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold">
              Rewards for Diamond Hands 💎
            </h2>
            <p className="text-lg text-muted-foreground">
              Long-term Bitcoin holders get up to 45% more borrowing power compared to traditional DeFi protocols.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div>
                  <div className="font-semibold">Capital Efficient</div>
                  <div className="text-sm text-muted-foreground">
                    110% collateral for 800+ scores vs 150-200% standard
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </div>
                <div>
                  <div className="font-semibold">Privacy Preserved</div>
                  <div className="text-sm text-muted-foreground">
                    Only cryptographic hashes on-chain, not actual scores
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center mt-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                </div>
                <div>
                  <div className="font-semibold">No KYC Required</div>
                  <div className="text-sm text-muted-foreground">
                    Fully on-chain, permissionless scoring system
                  </div>
                </div>
              </li>
            </ul>
            <Link href="/score" className="btn-primary inline-flex items-center gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="glass p-8 rounded-2xl">
            <h3 className="text-xl font-semibold mb-6">Collateral Ratios by Tier</h3>
            <div className="space-y-4">
              {[
                { tier: '1', range: '800-850', ratio: '110%', label: 'Diamond Hands 💎' },
                { tier: '2', range: '750-799', ratio: '115%', label: 'Strong Holder' },
                { tier: '3', range: '700-749', ratio: '120%', label: 'Moderate Holder' },
                { tier: '4', range: '650-699', ratio: '130%', label: 'New Holder' },
              ].map((item) => (
                <div key={item.tier} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-mono text-muted-foreground">
                      {item.range}
                    </div>
                    <div className="text-sm">{item.label}</div>
                  </div>
                  <div className="text-lg font-bold text-primary">{item.ratio}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="glass p-12 rounded-3xl text-center space-y-6 max-w-3xl mx-auto gradient-border">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to unlock better lending terms?
          </h2>
          <p className="text-lg text-muted-foreground">
            Connect your Bitcoin wallet and get your credibility score in seconds.
          </p>
          <Link
            href="/score"
            className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4 neon-glow"
          >
            Get Your Score
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}