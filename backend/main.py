import io
import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader


AI_DIR = Path(__file__).resolve().parent.parent / "ai"
sys.path.insert(0, str(AI_DIR))

from app import analyze_career_match


app = FastAPI(
    title="CareerMatch API",
    version="1.0.0"
)


# Allow the React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://career-match-app-six.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    cv_text: str
    job_description: str
    deadline: Optional[str] = None


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "CareerMatch API"
    }


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    result = analyze_career_match(
        cv_text=request.cv_text,
        job_description=request.job_description,
        deadline=request.deadline,
    )

    return result.model_dump()


@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    """
    Extract readable text from an uploaded PDF.
    Used for CVs and job offers.
    """

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    contents = await file.read()

    try:
        reader = PdfReader(io.BytesIO(contents))

        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text() or ""

            if page_text.strip():
                text_parts.append(page_text.strip())

        text = "\n\n".join(text_parts)

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not extract readable text from this PDF. "
                    "The PDF may be scanned or image-based."
                )
            )

        return {
            "filename": file.filename,
            "text": text
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read PDF: {error}"
        )



