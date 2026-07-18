from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import credentials, forensics, issuers, verification, trust_score
from app.db.session import engine
from app.db.models import Base

# Initialize Database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TrustVerse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(issuers.router, prefix="/api/v1/issuers", tags=["Issuers"])
app.include_router(credentials.router, prefix="/api/v1/credentials", tags=["Credentials"])
app.include_router(forensics.router, prefix="/api/v1/forensics", tags=["AI Forensics"])
app.include_router(verification.router, prefix="/api/v1/verify", tags=["Verification"])
app.include_router(trust_score.router, prefix="/api/v1/trust-score", tags=["Trust Score"])

@app.get("/")
def read_root():
    return {"message": "Welcome to TrustVerse API"}
