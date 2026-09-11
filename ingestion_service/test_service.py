import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
SAMPLE_DIR = Path(__file__).parent / "sample_data"


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ingestion_service"


def test_ingest_fir_txt():
    fir_txt_path = SAMPLE_DIR / "sample_fir.txt"
    assert fir_txt_path.exists(), "sample_fir.txt must exist"

    with open(fir_txt_path, "rb") as f:
        response = client.post(
            "/ingest/fir",
            data={"case_id": "CASE-2026-DEL-0091"},
            files={"file": ("sample_fir.txt", f, "text/plain")},
        )

    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["case_id"] == "CASE-2026-DEL-0091"
    assert res["source_type"] == "fir"
    assert res["data"]["file_type"] == "txt"
    assert "Rajesh Verma" in res["data"]["text"]
    assert "+919876543210" in res["data"]["text"]


def test_ingest_fir_pdf():
    fir_pdf_path = SAMPLE_DIR / "sample_fir.pdf"
    assert fir_pdf_path.exists(), "sample_fir.pdf must exist"

    with open(fir_pdf_path, "rb") as f:
        response = client.post(
            "/ingest/fir",
            data={"case_id": "CASE-2026-MUM-0412"},
            files={"file": ("sample_fir.pdf", f, "application/pdf")},
        )

    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["case_id"] == "CASE-2026-MUM-0412"
    assert res["source_type"] == "fir"
    assert res["data"]["file_type"] == "pdf"
    assert res["data"]["page_count"] >= 1
    assert "Amit Roy" in res["data"]["text"]
    assert "+919811223344" in res["data"]["text"]


def test_ingest_fir_raw_text():
    raw_text = "Victim reported online extortion from suspect Rocky at Connaught Place."
    response = client.post(
        "/ingest/fir",
        data={"case_id": "CASE-DIRECT-TEXT", "text": raw_text},
    )
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["case_id"] == "CASE-DIRECT-TEXT"
    assert res["data"]["file_type"] == "raw_text"
    assert res["data"]["text"] == raw_text


def test_ingest_cdr_csv():
    cdr_csv_path = SAMPLE_DIR / "sample_cdr.csv"
    assert cdr_csv_path.exists(), "sample_cdr.csv must exist"

    with open(cdr_csv_path, "rb") as f:
        response = client.post(
            "/ingest/cdr",
            data={"case_id": "CASE-2026-DEL-0091"},
            files={"file": ("sample_cdr.csv", f, "text/csv")},
        )

    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["case_id"] == "CASE-2026-DEL-0091"
    assert res["source_type"] == "cdr"
    assert res["data"]["record_count"] == 5
    first_record = res["data"]["records"][0]
    assert first_record["caller"] == "+919876543210"
    assert first_record["callee"] == "+919123456789"
    assert first_record["duration"] == 180


def test_ingest_bank_csv():
    bank_csv_path = SAMPLE_DIR / "sample_bank.csv"
    assert bank_csv_path.exists(), "sample_bank.csv must exist"

    with open(bank_csv_path, "rb") as f:
        response = client.post(
            "/ingest/bank",
            data={"case_id": "CASE-2026-DEL-0091"},
            files={"file": ("sample_bank.csv", f, "text/csv")},
        )

    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert res["case_id"] == "CASE-2026-DEL-0091"
    assert res["source_type"] == "bank"
    assert res["data"]["record_count"] == 5
    first_record = res["data"]["records"][0]
    assert first_record["sender"] == "ACC100123"
    assert first_record["receiver"] == "ACC99887766"
    assert first_record["amount"] == 250000.00
    assert first_record["date"] == "2026-03-01"


def test_cdr_missing_columns():
    invalid_csv = b"caller,callee\n123,456"
    response = client.post(
        "/ingest/cdr",
        data={"case_id": "CASE-BAD"},
        files={"file": ("bad_cdr.csv", invalid_csv, "text/csv")},
    )
    assert response.status_code == 400
    assert "Missing required CDR columns" in response.json()["detail"]


def test_bank_missing_columns():
    invalid_csv = b"sender,amount\nACC1,500"
    response = client.post(
        "/ingest/bank",
        data={"case_id": "CASE-BAD"},
        files={"file": ("bad_bank.csv", invalid_csv, "text/csv")},
    )
    assert response.status_code == 400
    assert "Missing required Bank columns" in response.json()["detail"]


def test_missing_case_id():
    response = client.post("/ingest/cdr", files={"file": ("sample.csv", b"a,b,c", "text/csv")})
    assert response.status_code == 422  # Unprocessable Entity for missing required form field


# ---------------------------------------------------------------------------
# Batch 4: End-to-End Pipeline Integration Tests
# ---------------------------------------------------------------------------

def test_batch4_end_to_end_flow():
    test_case_id = "CASE-2026-TEST-BATCH4"
    sample_fir_text = (
        "On 10-04-2026, complainant Ramesh Patel reported that suspect Vikram Singha "
        "threatened him over phone +919823456780 demanding Rs. 5,00,000 in Rohini, Delhi. "
        "The suspect instructed transfer to account ACC99887766."
    )

    # Step 1: POST /cases/{case_id}/upload
    # Runs ingestion -> NER -> fuzzy alias matching without writing to Neo4j
    upload_res = client.post(
        f"/cases/{test_case_id}/upload",
        data={"text": sample_fir_text},
    )
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    assert upload_data["status"] == "review_pending"
    assert upload_data["case_id"] == test_case_id

    # Verify extracted entities
    entities = upload_data["entities"]
    suspect_names = [s["text"] for s in entities["suspects"]]
    complainant_names = [c["text"] for c in entities.get("complainants", [])]

    assert "Vikram Singha" in suspect_names
    assert "Ramesh Patel" in complainant_names
    assert len(entities["phones"]) >= 1
    assert any("+919823456780" in p["text"] or "9823456780" in p["text"] for p in entities["phones"])
    assert len(entities["locations"]) >= 1

    # Verify Proof-of-Source is present on all extracted entities
    for s in entities["suspects"]:
        assert s["source_sentence"], "Proof-of-Source missing on extracted suspect!"
    for c in entities.get("complainants", []):
        assert c["source_sentence"], "Proof-of-Source missing on extracted complainant!"

    # Verify Alias Resolution: Vikram Singha should match existing suspect Vikram Singh
    assert "Vikram Singha" in upload_data["alias_candidates"]
    alias_matches = upload_data["alias_candidates"]["Vikram Singha"]
    assert any(c["candidate"] == "Vikram Singh" for c in alias_matches)
    assert all(c["action_required"] == "HUMAN_CONFIRMATION_REQUIRED" for c in alias_matches)

    # Step 2: POST /cases/{case_id}/confirm-entities
    # Investigator confirms entities (maps Vikram Singha -> canonical Vikram Singh with alias)
    # Writes to Neo4j using MERGE
    confirm_payload = {
        "suspects": [
            {
                "name": "Vikram Singh",
                "source_sentence": entities["suspects"][0]["source_sentence"],
                "alias": "Vikram Singha",
            }
        ],
        "phones": [
            {
                "number": "+919823456780",
                "owner": "Vikram Singh",
            }
        ],
        "accounts": [
            {
                "account_number": "ACC99887766",
                "bank_name": "City Union",
                "owner": "Vikram Singh",
            }
        ],
        "locations": [
            {
                "name": "Rohini, Delhi",
                "region": "Delhi",
                "suspect": "Vikram Singh",
            }
        ],
    }
    confirm_res = client.post(
        f"/cases/{test_case_id}/confirm-entities",
        json=confirm_payload,
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["status"] == "success"
    assert confirm_data["written"]["suspects"] == 1
    assert confirm_data["written"]["phones"] == 1
    assert confirm_data["written"]["accounts"] == 1

    # Step 3: GET /cases/{case_id}/graph
    # Returns nodes and edges formatted for Cytoscape.js
    graph_res = client.get(f"/cases/{test_case_id}/graph")
    assert graph_res.status_code == 200
    graph_data = graph_res.json()
    assert graph_data["case_id"] == test_case_id
    assert graph_data["node_count"] > 0
    assert graph_data["edge_count"] > 0

    node_labels = {n["label"] for n in graph_data["nodes"]}
    assert "Case" in node_labels
    assert "Suspect" in node_labels
    assert "Phone" in node_labels

    edge_types = {e["type"] for e in graph_data["edges"]}
    assert "MENTIONS" in edge_types
    assert "OWNS" in edge_types

    # Step 4: GET /cases/{case_id}/analytics
    # Runs GDS centrality, PageRank, Louvain, and Cypher cycle/cross-case queries
    analytics_res = client.get(f"/cases/{test_case_id}/analytics")
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert analytics_data["case_id"] == test_case_id
    assert len(analytics_data["betweenness_centrality"]) > 0
    assert len(analytics_data["pagerank"]) > 0
    assert len(analytics_data["louvain_communities"]) > 0
    assert "cross_case_links" in analytics_data
    # Vikram Singh is linked to multiple cases (cross-case match)
    cross_suspects = [c["identifier"] for c in analytics_data["cross_case_links"]]
    assert "Vikram Singh" in cross_suspects


