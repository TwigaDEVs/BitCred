"""
ZK Proof Generation for BitCred

The contract key is `btc_address_hash: felt252` — a Poseidon/SHA256 hash
of the raw Bitcoin address. This module:
  1. Derives btc_address_hash from a Bitcoin address string
  2. Generates a commitment proof tying (address_hash, score_tier) together
  3. Returns felt252-compatible values ready for Starknet calldata

Roadmap to full STARK proof:
  - Write Cairo program that takes (UTXOs, snapshots) as private input
  - Outputs (score_tier, btc_address_hash) as public outputs
  - Prove with stone-prover or lambdaworks
  - Submit proof[] to contract verifier
"""

import hashlib
import secrets
import json
import time
from dataclasses import dataclass
from scoring.scorer import ScoreResult

# felt252 max = 2^251 - 1  →  we use 31-byte (62 hex char) truncation
FELT252_BYTES = 31


# ─── BTC address → felt252 hash ───────────────────────────────────────────────

def btc_address_to_felt252(btc_address: str) -> int:
    """
    Deterministically hash a Bitcoin address to a felt252 integer.
    This becomes the on-chain key in ScoreRegistry.scores LegacyMap.

    Uses SHA256 truncated to 31 bytes to stay within felt252 range.
    The same address always produces the same hash — privacy comes from
    the fact that the raw address is never stored on-chain.
    """
    raw = hashlib.sha256(btc_address.encode("utf-8")).digest()
    # Take first 31 bytes → always < 2^248 < felt252 max
    truncated = raw[:FELT252_BYTES]
    return int.from_bytes(truncated, "big")


def btc_address_to_hex_felt(btc_address: str) -> str:
    """Returns hex string suitable for Starknet calldata."""
    return hex(btc_address_to_felt252(btc_address))


# ─── Proof data structures ────────────────────────────────────────────────────

@dataclass
class ZKProof:
    btc_address_hash: int    # felt252 int — the on-chain key
    btc_address_hash_hex: str
    commitment: int          # felt252 int — hash(address_hash + tier + nonce)
    commitment_hex: str
    nonce_hex: str           # kept private by user / backend
    tier: int
    score: int
    timestamp: int


@dataclass
class OnchainCalldata:
    """Ready-to-submit fields for ScoreRegistry.register_score / update_score"""
    btc_address_hash: int    # felt252
    score: int               # u16
    proof: list[int]         # Span<felt252> — commitment for demo, full proof later


# ─── Proof generation ─────────────────────────────────────────────────────────

def generate_proof(btc_address: str, score_result: ScoreResult) -> ZKProof:
    """
    Generate a commitment proof for a scored Bitcoin wallet.

    Commitment = SHA256(address_hash_bytes || tier_byte || nonce_bytes)
    - address_hash: ties proof to specific BTC wallet (no raw address on-chain)
    - tier:         the only score data published (1-4)
    - nonce:        random 32 bytes — prevents brute-force tier lookup
    """
    address_hash_int = btc_address_to_felt252(btc_address)
    address_hash_bytes = address_hash_int.to_bytes(FELT252_BYTES, "big")

    nonce_bytes = secrets.token_bytes(32)
    tier_byte = score_result.tier.to_bytes(1, "big")
    timestamp = int(time.time())

    raw = address_hash_bytes + tier_byte + nonce_bytes + timestamp.to_bytes(8, "big")
    commitment_bytes = hashlib.sha256(raw).digest()[:FELT252_BYTES]
    commitment_int = int.from_bytes(commitment_bytes, "big")

    return ZKProof(
        btc_address_hash=address_hash_int,
        btc_address_hash_hex=hex(address_hash_int),
        commitment=commitment_int,
        commitment_hex=hex(commitment_int),
        nonce_hex=nonce_bytes.hex(),
        tier=score_result.tier,
        score=score_result.raw_score,
        timestamp=timestamp,
    )


def proof_to_calldata(proof: ZKProof) -> OnchainCalldata:
    """
    Convert proof to on-chain calldata for ScoreRegistry.register_score.

    proof[] Span contains the commitment as a single felt252.
    When full STARK verification is added, proof[] will contain the full
    proof array output by stone-prover.
    """
    return OnchainCalldata(
        btc_address_hash=proof.btc_address_hash,
        score=proof.score,
        proof=[proof.commitment],  # Demo: commitment only. Production: full STARK proof.
    )


def calldata_to_dict(calldata: OnchainCalldata) -> dict:
    """JSON-serialisable dict for API responses and frontend display."""
    return {
        "btc_address_hash": hex(calldata.btc_address_hash),
        "score": calldata.score,
        "proof": [hex(p) for p in calldata.proof],
    }


# ─── CLI test ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from scoring.scorer import ScoreResult

    mock = ScoreResult(
        raw_score=820,
        tier=1,
        collateral_ratio_bps=11000,
        hodl_sub=0.85,
        frequency_sub=0.90,
        stability_sub=0.80,
        score_hash="",
        proof_input={},
    )

    btc_addr = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
    proof = generate_proof(btc_addr, mock)
    calldata = proof_to_calldata(proof)

    print("=== Proof ===")
    print(f"btc_address_hash : {proof.btc_address_hash_hex}")
    print(f"commitment       : {proof.commitment_hex}")
    print(f"tier             : {proof.tier}")
    print(f"score            : {proof.score}")
    print()
    print("=== Starknet Calldata ===")
    print(json.dumps(calldata_to_dict(calldata), indent=2))