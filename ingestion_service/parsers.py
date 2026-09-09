import io
from typing import Optional, Dict, Any, List
import pymupdf
import pandas as pd
from fastapi import HTTPException, UploadFile


def parse_fir_content(
    file_bytes: Optional[bytes] = None,
    filename: Optional[str] = None,
    raw_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extracts text from FIR input (PDF, TXT, or direct raw text).
    """
    if not file_bytes and not raw_text:
        raise HTTPException(
            status_code=400,
            detail="Either a file (PDF/TXT) or raw text must be provided."
        )

    if raw_text and not file_bytes:
        return {
            "filename": None,
            "file_type": "raw_text",
            "page_count": 1,
            "text": raw_text.strip(),
        }

    fname = filename or "uploaded_document"
    fname_lower = fname.lower()

    if fname_lower.endswith(".pdf"):
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            pages_text: List[str] = []
            for page in doc:
                pages_text.append(page.get_text())
            full_text = "\n".join(pages_text).strip()
            page_count = len(doc)
            doc.close()
            return {
                "filename": fname,
                "file_type": "pdf",
                "page_count": page_count,
                "text": full_text,
            }
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse PDF document: {str(e)}"
            )

    # For .txt or other text files
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = file_bytes.decode("latin-1")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to decode text file: {str(e)}"
            )

    return {
        "filename": fname,
        "file_type": "txt",
        "page_count": 1,
        "text": text.strip(),
    }


def parse_cdr_csv(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parses Call Detail Record (CDR) CSV using pandas.
    Expected columns: caller, callee, timestamp, duration
    """
    try:
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid CSV file: {str(e)}"
        )

    # Normalize column names: lowercase and stripped of whitespace
    df.columns = [str(c).strip().lower() for c in df.columns]

    required_columns = {"caller", "callee", "timestamp", "duration"}
    missing = required_columns - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required CDR columns: {sorted(list(missing))}. Expected: {sorted(list(required_columns))}"
        )

    # Sanitize and convert values
    df["caller"] = df["caller"].astype(str).str.strip()
    df["callee"] = df["callee"].astype(str).str.strip()
    df["timestamp"] = df["timestamp"].astype(str).str.strip()
    # Convert duration to numeric, filling NaNs with 0
    df["duration"] = pd.to_numeric(df["duration"], errors="coerce").fillna(0).astype(int)

    records = df[["caller", "callee", "timestamp", "duration"]].to_dict(orient="records")

    return {
        "filename": filename,
        "record_count": len(records),
        "records": records,
    }


def parse_bank_csv(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parses Bank Transaction CSV using pandas.
    Expected columns: sender, receiver, amount, date
    """
    try:
        df = pd.read_csv(io.BytesIO(file_bytes), dtype=str)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid CSV file: {str(e)}"
        )

    # Normalize column names: lowercase and stripped of whitespace
    df.columns = [str(c).strip().lower() for c in df.columns]

    required_columns = {"sender", "receiver", "amount", "date"}
    missing = required_columns - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required Bank columns: {sorted(list(missing))}. Expected: {sorted(list(required_columns))}"
        )

    # Sanitize and convert values
    df["sender"] = df["sender"].astype(str).str.strip()
    df["receiver"] = df["receiver"].astype(str).str.strip()
    df["date"] = df["date"].astype(str).str.strip()
    # Convert amount to float
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0).astype(float)

    records = df[["sender", "receiver", "amount", "date"]].to_dict(orient="records")

    return {
        "filename": filename,
        "record_count": len(records),
        "records": records,
    }
