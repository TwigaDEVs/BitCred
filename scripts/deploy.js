const {
  RpcProvider,
  Account,
  ETransactionVersion,
  defaultDeployer,
  json,
  hash,
} = require("starknet");
const fs = require("fs");
require("dotenv").config();

const account_address = process.env.ACCOUNT_ADDRESS;
const private_key = process.env.PRIVATE_KEY;

if (!account_address || !private_key) {
  console.error("❌ Missing ACCOUNT_ADDRESS or PRIVATE_KEY in .env");
  process.exit(1);
}

const RPC_ENDPOINTS = [
  process.env.STARKNET_RPC_URL,
  "https://starknet-sepolia.public.blastapi.io/rpc/v0_9",
  "https://starknet-sepolia.drpc.org",
  "https://rpc.starknet-testnet.lava.build",
  "https://free-rpc.nethermind.io/sepolia-juno",
].filter(Boolean);

async function getWorkingProvider() {
  for (const url of RPC_ENDPOINTS) {
    try {
      console.log(`   Trying: ${url}`);
      const p = new RpcProvider({ nodeUrl: url, retries: 2 });
      await p.getSpecVersion(); // lightweight connectivity check
      console.log(`   ✅ Connected!\n`);
      return p;
    } catch {
      console.log(`   ❌ Unreachable\n`);
    }
  }
  throw new Error("All RPC endpoints failed. Check your internet connection.");
}

const CONTRACTS = {
  SCORE_REGISTRY: "ScoreRegistry",
  LENDING_POOL:   "LendingPool",
};

const CLASS_HASHES = {
  SCORE_REGISTRY: "",
  LENDING_POOL:   "",
};

const DEPLOYED_ADDRESSES = {
  SCORE_REGISTRY: "",
  LENDING_POOL:   "",
};

function loadContract(contractName) {
  const sierraPath = `../contracts/target/dev/contracts_${contractName}.contract_class.json`;
  const casmPath   = `../contracts/target/dev/contracts_${contractName}.compiled_contract_class.json`;

  if (!fs.existsSync(sierraPath)) {
    throw new Error(`Sierra file not found: ${sierraPath}\nRun 'scarb build' first.`);
  }
  if (!fs.existsSync(casmPath)) {
    throw new Error(`CASM file not found: ${casmPath}\nEnsure 'casm = true' is in Scarb.toml`);
  }

  const compiledSierra = json.parse(fs.readFileSync(sierraPath).toString("ascii"));
  const compiledCasm   = json.parse(fs.readFileSync(casmPath).toString("ascii"));
  return { compiledSierra, compiledCasm };
}

async function declareContract(provider, account, contractName) {
  console.log(`\n📝 Declaring ${contractName}...`);

  const { compiledSierra, compiledCasm } = loadContract(contractName);

  const classHash = hash.computeContractClassHash(compiledSierra);
  console.log(`   Computed class hash: ${classHash}`);

  try {
    await provider.getClassByHash(classHash);
    console.log(`   ✅ Already declared — skipping.`);
    return classHash;
  } catch {
    console.log(`   🔄 Not yet declared, submitting...`);
  }

  const declareResponse = await account.declare({
    contract: compiledSierra,
    casm: compiledCasm,
  });

  console.log(`   Tx hash: ${declareResponse.transaction_hash}`);
  await provider.waitForTransaction(declareResponse.transaction_hash);

  console.log(`   ✅ Declared! Class hash: ${declareResponse.class_hash}`);
  return declareResponse.class_hash;
}

async function deployContract(provider, account, contractName, classHash, constructorArgs = []) {
  console.log(`\n🚀 Deploying ${contractName}...`);
  console.log(`   Class hash: ${classHash}`);
  console.log(`   Constructor args:`, constructorArgs);

  await new Promise(r => setTimeout(r, 2000));

  const deployResponse = await account.deployContract({
    classHash,
    constructorCalldata: constructorArgs,
  });

  console.log(`   Tx hash: ${deployResponse.transaction_hash}`);

  await provider.waitForTransaction(deployResponse.transaction_hash, {
    retryInterval: 5000,
    successStates: ["ACCEPTED_ON_L2", "ACCEPTED_ON_L1"],
  });

  const contractAddress = Array.isArray(deployResponse.contract_address)
    ? deployResponse.contract_address[0]
    : deployResponse.contract_address;

  if (!contractAddress || contractAddress === "0x0") {
    throw new Error(`Deployment returned invalid address for ${contractName}`);
  }

  console.log(`   ✅ Deployed! Address: ${contractAddress}`);
  return contractAddress;
}

async function declareAll(provider, account) {
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: DECLARING CONTRACTS");
  console.log("=".repeat(60));

  CLASS_HASHES.SCORE_REGISTRY = await declareContract(provider, account, CONTRACTS.SCORE_REGISTRY);

  console.log(`\n⏳ Waiting 5s before next declaration...`);
  await new Promise(r => setTimeout(r, 5000));

  CLASS_HASHES.LENDING_POOL = await declareContract(provider, account, CONTRACTS.LENDING_POOL);

  console.log("\n" + "=".repeat(60));
  console.log("ALL CONTRACTS DECLARED ✅");
  console.log("=".repeat(60));
  console.log("\nClass Hashes:");
  console.log("  SCORE_REGISTRY:", CLASS_HASHES.SCORE_REGISTRY);
  console.log("  LENDING_POOL:  ", CLASS_HASHES.LENDING_POOL);
}

async function deployAll(provider, account) {
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: DEPLOYING CONTRACTS");
  console.log("=".repeat(60));

  if (!CLASS_HASHES.SCORE_REGISTRY || !CLASS_HASHES.LENDING_POOL) {
    throw new Error("CLASS_HASHES are empty — declareAll() must run first.");
  }

  // ── Deploy ScoreRegistry ────────────────────────────────────────────────
  // constructor(admin: ContractAddress)
  DEPLOYED_ADDRESSES.SCORE_REGISTRY = await deployContract(
    provider, account,
    CONTRACTS.SCORE_REGISTRY,
    CLASS_HASHES.SCORE_REGISTRY,
    [account_address],  // admin = deployer wallet
  );

  console.log(`\n⏳ Waiting 10s before next deployment...`);
  await new Promise(r => setTimeout(r, 10000));

  // ── Deploy LendingPool ──────────────────────────────────────────────────
  // constructor(admin, score_registry, collateral_token, borrow_token, interest_rate)
  const WBTC_SEPOLIA  = process.env.WBTC_ADDRESS  || "0x0";
  const USDC_SEPOLIA  = process.env.USDC_ADDRESS  || "0x0";
  const INTEREST_RATE = 500; 

  DEPLOYED_ADDRESSES.LENDING_POOL = await deployContract(
    provider, account,
    CONTRACTS.LENDING_POOL,
    CLASS_HASHES.LENDING_POOL,
    [
      account_address,                        
      DEPLOYED_ADDRESSES.SCORE_REGISTRY,     
      WBTC_SEPOLIA,                           
      USDC_SEPOLIA,                           
      INTEREST_RATE,                          
    ],
  );

  const deploymentInfo = {
    network:     "starknet-sepolia",
    timestamp:   new Date().toISOString(),
    deployer:    account_address,
    classHashes: CLASS_HASHES,
    addresses:   DEPLOYED_ADDRESSES,
  };

  fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("ALL CONTRACTS DEPLOYED 🎉");
  console.log("=".repeat(60));
  console.log("\nDeployed Addresses:");
  console.log("  SCORE_REGISTRY:", DEPLOYED_ADDRESSES.SCORE_REGISTRY);
  console.log("  LENDING_POOL:  ", DEPLOYED_ADDRESSES.LENDING_POOL);
  console.log("\n💾 Saved to deployment-info.json");
  console.log("\n📋 Add these to your backend .env:");
  console.log(`  REGISTRY_ADDRESS=${DEPLOYED_ADDRESSES.SCORE_REGISTRY}`);
  console.log(`  LENDING_ADDRESS=${DEPLOYED_ADDRESSES.LENDING_POOL}`);
}

async function verifyDeployments(provider) {
  console.log("\n🔍 Verifying deployments on-chain...\n");

  let info;
  try {
    info = JSON.parse(fs.readFileSync("./deployment-info.json").toString());
  } catch {
    console.log("⚠️  deployment-info.json not found — skipping verification.");
    return;
  }

  for (const [name, address] of Object.entries(info.addresses)) {
    try {
      const classHash = await provider.getClassHashAt(address);
      console.log(`✅ ${name}`);
      console.log(`   Address:    ${address}`);
      console.log(`   Class hash: ${classHash}`);
    } catch {
      console.log(`❌ ${name}: ${address} — NOT FOUND on chain`);
    }
  }
}

async function main() {
  console.log("\n🏗️  BITCRED DEPLOYMENT SCRIPT");
  console.log("================================");
  console.log("Account:", account_address);
  console.log("Network: Starknet Sepolia\n");

  console.log("🔌 Finding working RPC endpoint...");
  let provider;
  try {
    provider = await getWorkingProvider();
  } catch (err) {
    console.error(`\n❌ ${err.message}`);
    process.exit(1);
  }

  const account = new Account({
    provider,
    address: account_address,
    signer: private_key,
    cairoVersion: "1",
    transactionVersion: ETransactionVersion.V3,
    deployer: defaultDeployer,
  });

  // Check balance
  try {
    const balance = await provider.getBalance(account_address);
    console.log("Balance:", balance.toString(), "\n");
  } catch {
    console.log("⚠️  Could not fetch balance\n");
  }

  // Step 1: Declare
  await declareAll(provider, account);

  // Step 2: Deploy
  await deployAll(provider, account);

  // Step 3: Verify
  await verifyDeployments(provider);
}

main().catch(err => {
  console.error("\n❌ Deployment failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});