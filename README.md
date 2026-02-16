# BitCred

**Dynamic Collateral Lending on Starknet | Powered by Bitcoin On-Chain Behavior Analysis**

Privacy-preserving credit scoring for DeFi lending that rewards long-term Bitcoin holders with better borrowing terms.

---

## 📋 Short Description

BitCred is a credibility scoring system built on Starknet that analyzes Bitcoin on-chain behavior to generate dynamic collateral ratios for DeFi lending. By leveraging ZK-proofs, BitCred enables Bitcoin holders to access better lending terms (110-130% collateral ratios vs traditional 150-200%) without exposing their wallet transaction history. The system rewards long-term holders and consistent on-chain behavior with reduced collateral requirements, creating a more capital-efficient lending experience.

---

## 🔧 How It Works

### Step 1: Connect Wallet

User connects their Bitcoin wallet via **Xverse**. No seed phrases or private keys are shared - only read-only access to on-chain transaction history.

### Step 2: ZK Proof Generation

The system analyzes your Bitcoin wallet's on-chain history **privately** using zero-knowledge proofs. Your transaction patterns are computed without exposing specific transaction details, amounts, or counterparties.

### Step 3: AI Scoring Algorithm

A machine learning model evaluates three key behavioral metrics:

- **Hodl Duration (40% weight)** - Measures how long you've held Bitcoin. Long-term holders score higher.
- **Transaction Frequency (30% weight)** - Analyzes consistency of on-chain activity. Prefers steady, non-speculative behavior.
- **Balance Stability (30% weight)** - Evaluates volatility in wallet balance over time. Lower volatility = higher score.

### Step 4: Credibility Score

The system generates a **credibility score** ranging from 650-850 (similar to traditional FICO scores). Only a cryptographic **hash** of your score is published on-chain to maintain privacy - the actual score remains private.

### Step 5: Dynamic Collateral Ratios

Your score determines your collateral requirement:

| Score Range | Collateral Ratio | Example                      |
| ----------- | ---------------- | ---------------------------- |
| 800-850     | 110%             | Lock $110 BTC to borrow $100 |
| 750-799     | 115%             | Lock $115 BTC to borrow $100 |
| 700-749     | 120%             | Lock $120 BTC to borrow $100 |
| 650-699     | 130%             | Lock $130 BTC to borrow $100 |

_Compare to traditional DeFi: 150-200% collateral required regardless of reputation_

### Step 6: Borrow

Access lending through integrated platforms with your personalized collateral ratio. You can borrow stablecoins or other assets while keeping your Bitcoin position intact.

---

## 🏗️ System Architecture

### Core Components

| Component                | Technology         | Function                   |
| ------------------------ | ------------------ | -------------------------- |
| **Wallet Connection**    | Xverse API         | Bitcoin wallet integration |
| **ZK Proof Engine**      | Starknet ZK-SNARKs | Private on-chain analysis  |
| **AI Scoring Module**    | ML Algorithm       | Behavioral evaluation      |
| **Smart Contracts**      | Cairo/Starknet     | Collateral ratio logic     |
| **Credibility Registry** | On-chain Storage   | Score hash storage         |

### Architecture Diagram

```
┌─────────────────┐
│  Bitcoin Wallet │
│    (Xverse)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│   On-Chain Data Fetcher     │
│  (Transaction History API)  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   ZK Proof Generation       │
│   (Private Computation)     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   AI Scoring Engine         │
│  • Hodl Duration (40%)      │
│  • Tx Frequency (30%)       │
│  • Balance Stability (30%)  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Credibility Score (650-850)│
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Starknet Smart Contract   │
│   (Credibility Registry)    │
│   • Store Score Hash        │
│   • Assign Collateral Ratio │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│    Lending Protocol         │
│  (Demo or Partner Platform) │
│   • Accept Collateral       │
│   • Issue Loans             │
│   • Manage Liquidations     │
└─────────────────────────────┘
```

---

## 🎯 Problem Statement

Current DeFi lending protocols treat all users equally, requiring **150-200% over-collateralization** regardless of on-chain reputation or holding history. This creates several inefficiencies:

### Key Problems

| Issue                         | Impact                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| **Capital Inefficiency**      | Long-term Bitcoin holders must lock excessive collateral despite proven reliability |
| **Privacy Concerns**          | Users hesitant to connect wallets due to transaction history exposure               |
| **No Credit Differentiation** | Diamond hands and short-term speculators get identical terms                        |
| **Poor Risk Assessment**      | Protocols cannot price risk accurately without behavioral data                      |

---

## 💡 BitCred Solution

BitCred introduces a **privacy-preserving credibility scoring system** that analyzes Bitcoin wallet behavior to determine optimal collateral requirements.

### Key Benefits

**For Borrowers:**

- Unlock 25-45% more borrowing power with good on-chain behavior
- Maintain complete privacy - no transaction history exposed
- Reward long-term holding strategies
- No KYC or identity verification required

**For Lenders:**

- Better risk assessment without building credit infrastructure
- Reduced default risk through behavioral analysis
- Attract Bitcoin holders to their platform
- Competitive advantage in DeFi lending market

**For the Ecosystem:**

- Bridge Bitcoin's massive community to Starknet DeFi
- Set new standards for privacy-preserving credit scoring
- More capital-efficient lending markets
- Demonstrate practical ZK applications

---

## 🔐 Privacy Architecture

BitCred employs multiple privacy-preserving techniques:

### Zero-Knowledge Proofs

Wallet analysis occurs off-chain with **ZK-SNARK proofs** verifying computation correctness without revealing transaction details. The proof confirms "this wallet meets credibility criteria X" without exposing which specific transactions contributed to the score.

### Hash-Only Storage

Only **cryptographic hashes** of scores are stored on Starknet, not the scores themselves. This prevents score manipulation while maintaining privacy. The actual score is only known to the user.

### No Identity Linking

Bitcoin addresses are never permanently linked to Ethereum/Starknet addresses. Users can re-score with different wallets without creating identity trails across chains.

### Data Minimization

The system only accesses publicly available on-chain data. No off-chain data, KYC information, or personal details are collected or processed.

---

## 📊 Scoring Algorithm Details

The AI scoring engine processes on-chain data through three evaluation modules:

### 1. Hodl Duration Analysis (40% Weight)

**Calculation Method:** Weighted average of UTXO (Unspent Transaction Output) age

- Analyzes when each Bitcoin in your wallet was last moved
- Older coins receive higher scores
- Penalizes recent acquisitions
- Rewards multi-year holding patterns

**Example:**

- Wallet A: 1 BTC held for 4 years → High score
- Wallet B: 1 BTC held for 3 months → Low score

### 2. Transaction Frequency (30% Weight)

**Calculation Method:** Monthly average over 12-month period

- Optimal range: 2-8 transactions per month
- Too few transactions: Possibly inactive or new wallet
- Too many transactions: Trading/speculative behavior
- Consistent activity preferred over sporadic bursts

**Scoring:**

- 2-8 tx/month → Maximum points
- 0-1 tx/month → Reduced score (inactive)
- 20+ tx/month → Reduced score (day trader)

### 3. Balance Stability (30% Weight)

**Calculation Method:** Standard deviation of monthly balances

- Lower volatility = higher score
- Measures how much your balance fluctuates
- Penalizes frequent large deposits/withdrawals
- Rewards steady accumulation patterns

**Example:**

- Stable wallet: 1.0 BTC → 1.1 BTC → 1.2 BTC (gradual growth) → High score
- Volatile wallet: 0.5 BTC → 2.0 BTC → 0.3 BTC → 1.8 BTC → Low score

### Final Score Calculation

```
Final Score = (Hodl Duration × 0.40) +
              (Transaction Frequency × 0.30) +
              (Balance Stability × 0.30)

Score Range: 650 - 850
```

---

## 🔗 Lending Integration Strategy

BitCred is the **scoring system** (like a credit bureau), not the lender itself. The lending functionality comes from either a demo contract or partner integration.

### Option A: Demo Lender

**Approach:** Build a minimal lending smart contract on Starknet testnet

**Advantages:**

- ✅ Full control over user experience
- ✅ No external dependencies
- ✅ Faster iteration cycles
- ✅ Can demo complete flow with test tokens

**Implementation:**

- Simple Cairo smart contract accepting BitCred scores
- Test token pool (stBTC, stUSDC) for borrowing
- Basic liquidation logic if collateral ratio breached
- Web interface showing full journey: connect → score → borrow → repay

### Option B: Partner Protocol Integration

**Approach:** Integrate BitCred into established Starknet lending protocols (zkLend, Vesu, Nostra)

**Advantages:**

- ✅ Immediate access to real liquidity
- ✅ Established credibility and security
- ✅ Focus on scoring, not lending infrastructure

**Requirements:**

- API/oracle integration for score verification
- Partnership agreements
- Platform-specific smart contract adapters
- Joint go-to-market strategy

---

## 📝 Smart Contract Design

### 1. Credibility Registry Contract

**Purpose:** Store and verify credibility scores on Starknet

**Core Functions:**

```cairo
// Submit new credibility score
fn submit_score(score_hash: felt252, zk_proof: Proof) -> bool

// Verify ZK proof of score computation
fn verify_score(user_address: ContractAddress, proof: Proof) -> bool

// Get collateral ratio for user
fn get_collateral_ratio(user_address: ContractAddress) -> u128

// Update existing score (30-day minimum interval)
fn update_score(new_score_hash: felt252, zk_proof: Proof) -> bool
```

**Storage:**

```cairo
// User address → Score hash mapping
scores: LegacyMap<ContractAddress, felt252>

// Score hash → Collateral ratio mapping
collateral_ratios: LegacyMap<felt252, u128>

// User address → Last update timestamp
last_update: LegacyMap<ContractAddress, u64>
```

### 2. Demo Lending Contract

**Purpose:** Simple lending protocol for testing BitCred integration

**Core Functions:**

```cairo
// Deposit collateral (wrapped BTC)
fn deposit_collateral(amount: u256) -> bool

// Borrow based on credibility-adjusted ratio
fn borrow(amount: u256) -> bool

// Repay loan principal + interest
fn repay(amount: u256) -> bool

// Liquidate undercollateralized position
fn liquidate(user_address: ContractAddress) -> bool

// Withdraw collateral after repayment
fn withdraw_collateral(amount: u256) -> bool
```

**Integration Point:**
Queries Credibility Registry contract to fetch user's collateral ratio before processing `borrow()` requests.

---

## 🛠️ Technology Stack

### Frontend

- **Framework:** React.js / Next.js
- **Wallet Integration:** Xverse SDK
- **Starknet Connection:** Starknet.js, get-starknet
- **UI Library:** Tailwind CSS, shadcn/ui

### Backend

- **Smart Contracts:** Cairo (Starknet native)
- **ZK Proofs:** Starknet's built-in STARK proofs
- **Data Indexing:** Apibara (Starknet indexer)
- **Bitcoin Data:** Blockchain.com API, Blockstream API

### AI/ML

- **Language:** Python
- **Framework:** scikit-learn, TensorFlow
- **Data Processing:** Pandas, NumPy
- **Model Storage:** IPFS (for decentralization)

### Infrastructure

- **Deployment:** Starknet Testnet
- **Oracle:** Chainlink (price feeds)
- **Monitoring:** Grafana, Prometheus
- **Analytics:** Dune Analytics

---

## Acknowledgments

- **Starknet Foundation** - For the incredible ZK infrastructure
- **Xverse** - For Bitcoin wallet integration tools
- **Chainlink** - For reliable oracle services
- **zkLend, Vesu, Nostra** - Inspiration for lending protocol design
