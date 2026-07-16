from fastapi import APIRouter, File, UploadFile, HTTPException
from app.core.ai_forensics import analyze_image_authenticity, compute_phash

router = APIRouter()

@router.post("/analyze")
async def analyze_media(file: UploadFile = File(...)):
    """
    Endpoint for AI structural forgery detection using ELA and PyTorch CNN.
    Accepts an image file and returns authenticity probabilities.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported.")
    
    try:
        content = await file.read()
        results = analyze_image_authenticity(content)
        return {
            "filename": file.filename,
            "analysis": results,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/phash")
async def get_phash(file: UploadFile = File(...)):
    """
    Endpoint to compute the Perceptual Hash (pHash) of an image.
    Used for on-chain deduplication and tracking.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported.")
        
    try:
        content = await file.read()
        phash = compute_phash(content)
        return {
            "filename": file.filename,
            "phash": phash,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
