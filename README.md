# BitCred

**Bitcoin Credit Scoring for DeFi Lending on Starknet**

BitCred analyzes real Bitcoin on-chain behavior to generate a credit score (650–850) that unlocks personalized collateral ratios in a fully on-chain lending protocol on Starknet Sepolia.

---

## 🧠 The Problem

Every DeFi lending protocol today requires 150–200% over-collateralization — regardless of who you are. A Bitcoin holder who has never moved their coins in 5 years gets the same terms as someone who bought yesterday. There's no way to reward on-chain reputation.

## 💡 The Solution

BitCred reads your Bitcoin wallet's public on-chain history, scores your behavior using an AI model, and writes that score to a Starknet smart contract. Your score determines your collateral ratio in our lending pool — better history means you need to lock less to borrow more.

| Score Range | Collateral Ratio | Borrow Power |
|-------------|-----------------|--------------|
| 800 – 850   | 110%            | ~91% LTV     |
| 750 – 799   | 115%            | ~87% LTV     |
| 700 – 749   | 120%            | ~83% LTV     |
| 650 – 699   | 130%            | ~77% LTV     |

---

## 🔄 User Flow

```
1. Connect Starknet Wallet (Argent / Braavos)
        ↓
2. Enter Bitcoin Address → AI analyzes on-chain history
        ↓
3. Receive Score (650–850) → Submit to ScoreRegistry on Starknet
        ↓
4. Go to Faucet → Claim test WBTC + USDC (once per 24h)
        ↓
5. Go to Lending → Deposit WBTC collateral
        ↓
6. Borrow USDC at your personalized ratio
        ↓
7. Repay when ready
```

---

## 🏗️ Architecture

### Frontend — Next.js 16 (App Router)
- **Wallet**: `@starknet-react/core` v5 with Argent and Braavos connectors
- **Starknet.js** v6 for contract interactions
- **Tailwind CSS** + custom glass morphism UI
- Deployed on **Vercel**

### Backend — FastAPI (Python)
- Fetches real Bitcoin on-chain data via **Blockstream API**
- Scores behavior across 3 weighted metrics using an AI model
- Generates a `btc_address_hash` (felt252) for on-chain registration
- Deployed on **Railway**

### Smart Contracts — Cairo on Starknet Sepolia

| Contract | Address |
|----------|---------|
| ScoreRegistry | `0x6dbf5a0abd0d49a077a106e42821b972528ca55feae011d7a22ad089e70fbbe` |
| LendingPool | `0x4b4dcc1bb1d3ec53f2edb298955a26e4a8f1c37861dde272b84a74d696817e7` |
| MockWBTC | `0x2d5b244adea042de49a08126d95a1860c0a2617f37b330a8fe09de37a86559` |
| MockUSDC | `0x4b8c72d85606ac29871d217377294d4690674459c7cf8ba73164388095e798d` |

---

## 📊 Scoring Algorithm

The FastAPI backend computes a score from three on-chain behavioral signals:

### 1. HODL Duration (40%)
Measures how long Bitcoin has sat unspent in the wallet. Multi-year holders score highest. Recent movers score lower.

### 2. Transaction Frequency (30%)
Optimal range is 2–8 transactions per month over a 12-month window. Consistent, non-speculative activity scores best. Day traders and dormant wallets score lower.

### 3. Balance Stability (30%)
Measures standard deviation of monthly balances. Gradual accumulators score highest. High volatility (frequent large in/out) scores lower.

```
Final Score = (HODL × 0.40) + (Frequency × 0.30) + (Stability × 0.30)
Range: 650 – 850
```

---

## 🔐 Privacy

- Bitcoin addresses are **never stored** — only a `keccak256` hash goes on-chain
- All wallet analysis uses publicly available on-chain data only
- No KYC, no identity linking between Bitcoin and Starknet addresses
- Score hash is tied to the BTC address hash, not the Starknet wallet

---

## 📐 Contract Design

### ScoreRegistry (`contracts/src/score_registry.cairo`)
- `register_score(btc_address_hash, score, proof)` — called by approved scorer (backend)
- `get_score(btc_address_hash) → u16` — returns score, 0 if not registered
- `get_collateral_ratio(btc_address_hash) → u32` — returns ratio in BPS (11000 = 110%)
- 30-day cooldown on score updates

### LendingPool (`contracts/src/lending_pool.cairo`)
- `deposit_collateral(amount, btc_address_hash)` — verifies score ≥ 650 before accepting WBTC
- `borrow(amount)` — checks max borrow using BTC/USD price oracle + collateral ratio
- `repay(amount)` — repays USDC debt with interest
- `add_liquidity(amount)` — admin seeds USDC liquidity
- Interest rate: 5% APR (500 BPS)
- BTC price oracle: $90,000 (hardcoded constant for testnet)

### MockWBTC / MockUSDC (`contracts/src/mock_*.cairo`)
- Standard ERC20 with snake_case functions (`transfer_from`, `balance_of`)
- `claim()` faucet: 0.1 WBTC or 10,000 USDC per 24 hours

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Wallet | @starknet-react/core v5, Argent, Braavos |
| Starknet SDK | starknet.js v6 |
| Backend | FastAPI, Python 3.11 |
| Bitcoin Data | Blockstream API |
| Smart Contracts | Cairo 1, Scarb |
| Deployment | Vercel (frontend), Railway (backend) |
| Network | Starknet Sepolia Testnet |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Argent or Braavos wallet (Starknet Sepolia)
- Scarb (for contract compilation)

### Client

```bash
cd client
npm install
cp .env 
# Set NEXT_PUBLIC_BACKEND_API_URL
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env
# Set REGISTRY_ADDRESS, SCORER_PRIVATE_KEY, SCORER_ACCOUNT_ADDR, STARKNET_RPC_URL
python run.py
```

### Deploy Contracts

```bash
cd contracts
scarb build

cd scripts
npm install
node deploy.js        # declare + deploy all contracts
node seed-liquidity.js # fund the lending pool with USDC
```

---

## 📁 Project Structure

```
BitCred/
├── frontend/
│   ├── app/
│   │   ├── score/page.tsx      # Bitcoin scoring + on-chain submission
│   │   ├── lending/page.tsx    # Deposit, borrow, repay
│   │   └── faucet/page.tsx     # Claim test WBTC + USDC
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── WalletConnect.tsx
│   │   └── providers/StarknetProvider.tsx
│   └── lib/
│       ├── vesu.ts             # VesuService: contract interactions
│       ├── api.ts              # Backend API calls
│       └── constants.ts        # Contract addresses + ABIs
├── backend/
│   └── api/
│       ├── main.py             # FastAPI app + CORS
│       ├── scorer.py           # AI scoring logic
│       └── starknet_client.py  # Score submission to chain
├── contracts/
│   └── src/
│       ├── score_registry.cairo
│       ├── lending_pool.cairo
│       ├── mock_wbtc.cairo
│       ├── mock_usdc.cairo
│       └── erc20.cairo
└── scripts/
    ├── deploy.js               # Contract deployment
    └── seed-liquidity.js       # Pool liquidity seeding
```

---

## 🎯 Hackathon Demo Script

1. **Connect** Argent wallet (Starknet Sepolia)
2. **Faucet** → Claim 0.1 WBTC + 10,000 USDC
3. **Score** → Enter a Bitcoin address → Compute score → Submit to chain
4. **Lend** → Paste BTC address hash → Deposit 0.01 WBTC → Borrow USDC → Repay

---

## 🔭 Future Work

- Live BTC/USD price feed via Pragma oracle
- ZK proof of score computation (STARK proofs)
- Multi-chain Bitcoin analysis (Lightning, Ordinals)
- Score portability across lending protocols
- Score update flow with 30-day cooldown UI

---

## Built With ❤️ on Starknet
