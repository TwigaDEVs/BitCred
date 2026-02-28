const { RpcProvider, Account, Contract, ETransactionVersion, defaultDeployer } = require("starknet");
const fs = require("fs");
require("dotenv").config();

const account_address = process.env.ACCOUNT_ADDRESS;
const private_key     = process.env.PRIVATE_KEY;

if (!account_address || !private_key) {
  console.error("❌ Missing ACCOUNT_ADDRESS or PRIVATE_KEY in .env");
  process.exit(1);
}

// ─── Load deployed addresses ──────────────────────────────────────────────────
let DEPLOYED;
try {
  DEPLOYED = JSON.parse(fs.readFileSync("./deployment-info.json").toString()).addresses;
} catch {
  console.error("❌ deployment-info.json not found. Run deploy.js first.");
  process.exit(1);
}
console.log("Loaded addresses:", JSON.stringify(DEPLOYED, null, 2));

const MOCK_USDC    = DEPLOYED.MOCK_USDC;
const LENDING_POOL = DEPLOYED.LENDING_POOL;

const LIQUIDITY_AMOUNT = BigInt(10_000 * 1e6);

const ERC20_ABI = [
  {
    name: "claim",
    type: "function",
    inputs: [],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "core::starknet::contract_address::ContractAddress" },
      { name: "amount",  type: "core::integer::u256" },
    ],
    outputs: [{ type: "core::bool" }],
    state_mutability: "external",
  },
  {
    name: "balance_of",
    type: "function",
    inputs: [{ name: "account", type: "core::starknet::contract_address::ContractAddress" }],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
];

const LENDING_ABI = [
  {
    name: "add_liquidity",
    type: "function",
    inputs: [{ name: "amount", type: "core::integer::u256" }],
    outputs: [],
    state_mutability: "external",
  },
  {
    name: "get_available_liquidity",
    type: "function",
    inputs: [],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
];

async function main() {
  console.log("\n💧 BITCRED LIQUIDITY SEEDER");
  console.log("============================");
  console.log("MockUSDC:    ", MOCK_USDC);
  console.log("LendingPool: ", LENDING_POOL);
  console.log("Amount:       500,000 USDC\n");

  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_URL || "https://rpc.starknet-testnet.lava.build",
    retries: 2,
  });

  const account = new Account({
    provider,
    address: account_address,
    signer: private_key,
    cairoVersion: "1",
    transactionVersion: ETransactionVersion.V3,
    deployer: defaultDeployer,
  });

  console.log("provider:", !!provider);
  console.log("account_address:", account_address);
  console.log("private_key exists:", !!private_key);
  console.log("MOCK_USDC:", MOCK_USDC);
  console.log("LENDING_POOL:", LENDING_POOL);

  // ── Step 1: Check current balance ────────────────────────────────────────────
  console.log("📊 Checking current USDC balance...");
  const balanceResult = await provider.callContract({
    contractAddress: MOCK_USDC,
    entrypoint: "balance_of",
    calldata: [account_address],
  });
  const balance = BigInt(balanceResult[0]);
  console.log(`   Balance: ${(Number(balance) / 1e6).toLocaleString()} USDC`);

  // ── Step 2: Claim USDC if balance is low ─────────────────────────────────────
  if (balance < LIQUIDITY_AMOUNT) {
    console.log("\n🚰 Claiming USDC from faucet...");
    const claimTx = await account.execute({
      contractAddress: MOCK_USDC,
      entrypoint: "claim",
      calldata: [],
    });
    await provider.waitForTransaction(claimTx.transaction_hash);
    console.log(`   ✅ Claimed! TX: ${claimTx.transaction_hash}`);
  }

  // ── Step 3: Approve LendingPool to spend USDC ────────────────────────────────
  console.log("\n✅ Approving LendingPool...");
  const approveTx = await account.execute({
    contractAddress: MOCK_USDC,
    entrypoint: "approve",
    calldata: [LENDING_POOL, LIQUIDITY_AMOUNT.toString(), "0"],
  });
  await provider.waitForTransaction(approveTx.transaction_hash);
  console.log(`   ✅ Approved! TX: ${approveTx.transaction_hash}`);

  // ── Step 4: Add liquidity ─────────────────────────────────────────────────────
  console.log("\n💰 Adding liquidity...");
  const liquidityTx = await account.execute({
    contractAddress: LENDING_POOL,
    entrypoint: "add_liquidity",
    calldata: [LIQUIDITY_AMOUNT.toString(), "0"],
  });
  await provider.waitForTransaction(liquidityTx.transaction_hash);
  console.log(`   ✅ Done! TX: ${liquidityTx.transaction_hash}`);

  // ── Step 5: Verify ────────────────────────────────────────────────────────────
  const liquidityResult = await provider.callContract({
    contractAddress: LENDING_POOL,
    entrypoint: "get_available_liquidity",
    calldata: [],
  });
  console.log(`\n🎉 Pool liquidity: ${(Number(BigInt(liquidityResult[0])) / 1e6).toLocaleString()} USDC`);
}
main().catch(err => {
  console.error("\n❌ Failed:", err.message);
  process.exit(1);
});