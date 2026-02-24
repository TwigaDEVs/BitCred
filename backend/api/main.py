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

from vesu_intergration import VesuClient

vesu = VesuClient()

app = FastAPI(
    title="BitCred API",
    description="Bitcoin credit scoring for DeFi lending on Starknet",
    version="0.2.0",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Pull allowed origins from env so you can add your Vercel URL without
# touching code. Defaults to localhost for local dev.
#
# On Railway, set:
#   ALLOWED_ORIGINS=https://your-app.vercel.app,https://bitcred.vercel.app
#
_raw_origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

starknet = StarknetClient()


# ─── Models ───────────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    btc_address: str
    submit_onchain: bool = False


class ScoreResponse(BaseModel):
    btc_address_hash: str
    score: int
    tier: int
    collateral_ratio_pct: float
    hodl_sub: float
    frequency_sub: float
    stability_sub: float
    calldata: dict
    tx_hash: str | None
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
    try:
        wallet_data = await fetch_wallet_data(req.btc_address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Bitcoin API error: {str(e)}")

    result = compute_score(wallet_data)

    proof = generate_proof(req.btc_address, result)
    calldata = proof_to_calldata(proof)
    calldata_json = calldata_to_dict(calldata)

    tx_hash = None
    if req.submit_onchain:
        tx_hash = "frontend_submission_required"
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


@app.get("/vesu/position/{address}")
async def get_vesu_position(address: str):
    """Get user's Vesu lending position"""
    try:
        position = await vesu.get_user_position(address)
        return position
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/vesu/liquidity")
async def get_vesu_liquidity():
    """Get available USDC liquidity in Vesu"""
    try:
        liquidity = await vesu.get_available_liquidity()
        return liquidity
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/score/update", response_model=ScoreResponse)
async def update_credit_score(req: ScoreRequest):
    """Update existing Bitcoin credit score (30-day cooldown enforced)"""
    try:
        # Check if score exists and cooldown
        addr_hash_int = int(btc_address_to_hex_felt(req.btc_address), 16)
        
        last_updated = await starknet.get_last_updated(addr_hash_int)
        if last_updated == 0:
            raise HTTPException(status_code=404, detail="No existing score. Use /score endpoint first.")
        
        import time
        time_since = int(time.time()) - last_updated
        if time_since < 2592000:  # 30 days
            raise HTTPException(status_code=400, detail=f"Wait {(2592000-time_since)/86400:.1f} more days")
        
        # Compute new score
        wallet_data = await fetch_wallet_data(req.btc_address)
        result = compute_score(wallet_data)
        proof = generate_proof(req.btc_address, result)
        calldata = proof_to_calldata(proof)
        
        tx_hash = "frontend_submission_required" if req.submit_onchain else None
        
        tier_labels = {1: "Diamond Hands 💎", 2: "Strong Holder", 3: "Moderate Holder", 4: "New Holder"}
        
        return ScoreResponse(
            btc_address_hash=proof.btc_address_hash_hex,
            score=result.raw_score,
            tier=result.tier,
            collateral_ratio_pct=result.collateral_ratio_bps / 100,
            hodl_sub=result.hodl_sub,
            frequency_sub=result.frequency_sub,
            stability_sub=result.stability_sub,
            calldata=calldata_to_dict(calldata),
            tx_hash=tx_hash,
            message=f"Updated! {tier_labels[result.tier]} — Score {result.raw_score}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/score/{btc_address}", response_model=RatioResponse)
async def get_onchain_score(btc_address: str):
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
    try:
        pos = await starknet.get_position(starknet_address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return PositionResponse(**{k: pos[k] for k in PositionResponse.model_fields})


@app.get("/liquidity")
async def get_liquidity():
    try:
        raw = await starknet.get_available_liquidity()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"available_liquidity_raw": raw, "available_liquidity_usdc": raw / 1_000_000}