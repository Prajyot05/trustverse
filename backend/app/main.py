from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import credentials, forensics, issuers, verification, trust_score, demo, product
from app.db.session import engine, SessionLocal
from app.db.models import Base, MerkleMeta
from app.db.migrate import ensure_columns
from app.core.merkle import SparseMerkleTree, LEVELS

Base.metadata.create_all(bind=engine)
ensure_columns(engine)

def _init_merkle():
    db = SessionLocal()
    try:
        row = db.query(MerkleMeta).filter(MerkleMeta.id == 1).first()
        if row is None:
            tree = SparseMerkleTree(levels=LEVELS)
            db.add(MerkleMeta(id=1, root=str(tree.root()), depth=LEVELS, occupied_leaves={}))
            db.commit()
    finally:
        db.close()

_init_merkle()

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
app.include_router(demo.router, prefix="/api/v1/demo", tags=["Demo"])
app.include_router(product.router, prefix="/api/v1/product", tags=["Product"])

@app.get("/")
def read_root():
    return {"message": "Welcome to TrustVerse API"}


@app.get("/health")
def health():
    return {"status": "ok"}
