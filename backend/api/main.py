"""
BitCred API — FastAPI server
Exposes: score computation, on-chain submission, lending position reads.
"""

import sys
import os
from pathlib import Path

# Ensure backend/ is on the path regardless of how uvicorn is invoked
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from scoring.btc_fetcher import fetch_wallet_data
from scoring.scorer import compute_score
from zkproof.proof_gen import (
    generate_proof,
    proof_to_calldata,
    calldata_to_dict,
    btc_address_to_hex_felt,
)
from starknet_client import StarknetClient

app = FastAPI(
    title="BitCred API",
    description="Bitcoin credit scoring for DeFi lending on Starknet",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

starknet = StarknetClient()


# ─── Models ───────────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    btc_address: str          # Raw Bitcoin address (never stored)
    submit_onchain: bool = False  # If True, backend submits to ScoreRegistry


class ScoreResponse(BaseModel):
    btc_address_hash: str     # felt252 hex — the on-chain key
    score: int                # 650-850
    tier: int                 # 1-4
    collateral_ratio_pct: float
    hodl_sub: float
    frequency_sub: float
    stability_sub: float
    calldata: dict            # Ready for frontend to submit, or submitted by backend
    tx_hash: str | None       # Set if submit_onchain=True
    message: str


class PositionResponse(BaseModel):
    collateral_raw: int
    debt_usd: float
    collateral_ratio_bps: int
    collateral_ratio_pct: float
    is_liquidatable: bool
    health_factor: float
    max_borrow_usd: float


class RatioResponse(BaseModel):
    btc_address_hash: str
    collateral_ratio_bps: int
    collateral_ratio_pct: float
    tier: int
    score: int


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "BitCred API running", "version": "0.2.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse)
async def compute_credit_score(req: ScoreRequest):
    """
    Full scoring pipeline:
      1. Fetch BTC on-chain data (Blockstream API)
      2. Run AI scorer (hodl / frequency / stability)
      3. Generate ZK commitment proof
      4. Optionally submit score to ScoreRegistry on-chain

    btc_address is hashed locally — never sent or stored on-chain.
    """
    # 1. Fetch Bitcoin on-chain data
    try:
        wallet_data = await fetch_wallet_data(req.btc_address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Bitcoin API error: {str(e)}")

    # 2. AI scoring
    result = compute_score(wallet_data)

    # 3. ZK proof + calldata
    proof = generate_proof(req.btc_address, result)
    calldata = proof_to_calldata(proof)
    calldata_json = calldata_to_dict(calldata)

    # 4. Optional on-chain submission by backend scorer account
    tx_hash = None
    if req.submit_onchain:
        # DISABLED: On-chain submission requires frontend wallet integration
        # Users should submit scores via their Argent/Braavos wallet for better security
        tx_hash = "frontend_submission_required"
        
        # Optionally log the attempt
        print(f"[INFO] Score computed for {calldata.btc_address_hash}, awaiting frontend submission")

    tier_labels = {1: "Diamond Hands 💎", 2: "Strong Holder", 3: "Moderate Holder", 4: "New Holder"}

    return ScoreResponse(
        btc_address_hash=proof.btc_address_hash_hex,
        score=result.raw_score,
        tier=result.tier,
        collateral_ratio_pct=result.collateral_ratio_bps / 100,
        hodl_sub=result.hodl_sub,
        frequency_sub=result.frequency_sub,
        stability_sub=result.stability_sub,
        calldata=calldata_json,
        tx_hash=tx_hash,
        message=(
            f"{tier_labels.get(result.tier, '')} — "
            f"Score {result.raw_score} unlocks {result.collateral_ratio_bps / 100:.0f}% collateral ratio."
        ),
    )


@app.get("/score/{btc_address}", response_model=RatioResponse)
async def get_onchain_score(btc_address: str):
    """
    Look up an existing on-chain score by raw Bitcoin address.
    Derives btc_address_hash locally and queries ScoreRegistry.
    """
    addr_hash_int = int(btc_address_to_hex_felt(btc_address), 16)
    try:
        score = await starknet.get_score(addr_hash_int)
        ratio = await starknet.get_collateral_ratio(addr_hash_int)
        tier  = await starknet.get_score_tier(addr_hash_int)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return RatioResponse(
        btc_address_hash=hex(addr_hash_int),
        collateral_ratio_bps=ratio,
        collateral_ratio_pct=ratio / 100,
        tier=tier,
        score=score,
    )


@app.get("/position/{starknet_address}", response_model=PositionResponse)
async def get_lending_position(starknet_address: str):
    """Get the current LendingPool position for a Starknet address."""
    try:
        pos = await starknet.get_position(starknet_address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return PositionResponse(**{k: pos[k] for k in PositionResponse.model_fields})


@app.get("/liquidity")
async def get_liquidity():
    """Get available lending pool liquidity."""
    try:
        raw = await starknet.get_available_liquidity()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"available_liquidity_raw": raw, "available_liquidity_usdc": raw / 1_000_000}