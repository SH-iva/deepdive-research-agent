"""DeepDive FastAPI service.

Protected endpoints require a Clerk session JWT. Configure CLERK_JWKS_URL and
CLERK_ISSUER_URL in the backend environment before enabling research requests.
"""
import os
import logging
from typing import Annotated, Any

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from pydantic import BaseModel, Field

from agent import run_research

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("deepdive.api")

app = FastAPI(title="DeepDive API", version="1.1.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,https://deepdive-research-agent.vercel.app",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

bearer_scheme = HTTPBearer(auto_error=False)
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    jwks_url = os.getenv("CLERK_JWKS_URL")
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on the API.",
        )
    if _jwks_client is None:
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def verify_clerk_token(token: str) -> dict[str, Any]:
    """Verify signature and standard claims using Clerk's published JWKS."""
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        options: dict[str, bool] = {
            "require": ["exp", "iat", "sub"],
            "verify_aud": bool(os.getenv("CLERK_JWT_AUDIENCE")),
        }
        decode_kwargs: dict[str, Any] = {
            "algorithms": ["RS256"],
            "options": options,
        }
        issuer = os.getenv("CLERK_ISSUER_URL")
        audience = os.getenv("CLERK_JWT_AUDIENCE")
        if issuer:
            decode_kwargs["issuer"] = issuer
        if audience:
            decode_kwargs["audience"] = audience
        claims = jwt.decode(token, signing_key.key, **decode_kwargs)
        if not isinstance(claims.get("sub"), str) or not claims["sub"].strip():
            raise jwt.InvalidTokenError("Missing subject")
        return claims
    except HTTPException:
        raise
    except Exception as exc:
        # Do not leak token-validation internals to callers.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_clerk_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_clerk_token(credentials.credentials)


class ResearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=12000)
    thread_id: str = Field(min_length=1, max_length=128)


class ResearchResponse(BaseModel):
    report: str
    thread_id: str


@app.post("/api/research", response_model=ResearchResponse)
def generate_research_report(
    request: ResearchRequest,
    claims: Annotated[dict[str, Any], Depends(require_clerk_user)],
):
    # Namespace LangGraph's in-memory thread by the verified Clerk subject.
    # A caller cannot access another user's graph state by guessing a thread ID.
    scoped_thread_id = f"{claims['sub']}::{request.thread_id}"
    try:
        report = run_research(request.query.strip(), thread_id=scoped_thread_id)
        return ResearchResponse(report=report, thread_id=request.thread_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        # Log the full traceback locally; never expose it to the browser/client.
        logger.exception("Research request failed")
        raise HTTPException(
            status_code=502,
            detail="The research service could not complete this request.",
        ) from exc


@app.get("/health")
def health_check():
    return {"status": "active", "agent": "DeepDive", "version": app.version}
