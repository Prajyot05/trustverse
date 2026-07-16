from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import credentials, forensics

app = FastAPI(title="TrustVerse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(credentials.router, prefix="/api/v1/credentials", tags=["credentials"])
app.include_router(forensics.router, prefix="/api/v1/forensics", tags=["AI Forensics"])

@app.get("/")
def read_root():
    return {"message": "Welcome to TrustVerse API"}
