import sys
import os
import re
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Ensure root workspace is in sys.path so modules can be imported
_ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)

from ingestion_service.parsers import parse_fir_content, parse_cdr_csv, parse_bank_csv
from nlp_service.extractor import extract_entities, KNOWN_LOCATIONS_LOWER, trim_role_prefix
from nlp_service.alias_resolver import find_alias_candidates
from graph_service.graph_writer import (
    get_driver,
    session_scope,
    merge_case,
    merge_suspect,
    merge_phone,
    merge_account,
    merge_location,
    merge_called,
    merge_transferred,
    merge_owns,
    merge_located_at,
    merge_mentions,
)
from graph_service.gds_queries import (
    PROJECTION,
    DROP_PROJECTION,
    BETWEENNESS_CENTRALITY,
    PAGERANK,
    LOUVAIN_COMMUNITY,
    CYCLE_DETECTION,
    CROSS_CASE_LINKING,
)

app = FastAPI(
    title="Cyber Hunters — Unified Backend API",
    description="Backend API uniting Ingestion, NLP Extraction, Alias Resolution, Graph Construction, and Analytics.",
    version="2.0.0",
)

# CORS middleware enabled for investigator UI integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic Request Models
# ---------------------------------------------------------------------------

class ConfirmedSuspect(BaseModel):
    name: str
    source_sentence: str
    alias: Optional[str] = None

class ConfirmedPhone(BaseModel):
    number: str
    owner: Optional[str] = None

class ConfirmedAccount(BaseModel):
    account_number: str
    bank_name: Optional[str] = ""
    owner: Optional[str] = None

class ConfirmedLocation(BaseModel):
    name: str
    region: Optional[str] = ""
    suspect: Optional[str] = None

class ConfirmedEntitiesRequest(BaseModel):
    suspects: List[ConfirmedSuspect] = Field(default_factory=list)
    phones: List[ConfirmedPhone] = Field(default_factory=list)
    accounts: List[ConfirmedAccount] = Field(default_factory=list)
    locations: List[ConfirmedLocation] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Health & Status
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ingestion_service"}


# ---------------------------------------------------------------------------
# Legacy Raw Ingestion Endpoints (Batch 1)
# ---------------------------------------------------------------------------

@app.post("/ingest/fir")
async def ingest_fir(
    case_id: str = Form(..., description="Unique case identifier"),
    file: Optional[UploadFile] = File(None, description="FIR document file (PDF or TXT)"),
    text: Optional[str] = Form(None, description="Direct text input for FIR if not uploading file"),
):
    case_id_clean = case_id.strip()
    if not case_id_clean:
        raise HTTPException(status_code=400, detail="case_id must not be empty.")

    file_bytes = None
    filename = None
    if file is not None:
        filename = file.filename
        file_bytes = await file.read()

    parsed = parse_fir_content(file_bytes=file_bytes, filename=filename, raw_text=text)

    return {
        "status": "success",
        "case_id": case_id_clean,
        "source_type": "fir",
        "data": parsed,
    }


@app.post("/ingest/cdr")
async def ingest_cdr(
    case_id: str = Form(..., description="Unique case identifier"),
    file: UploadFile = File(..., description="CDR CSV file with columns: caller, callee, timestamp, duration"),
):
    case_id_clean = case_id.strip()
    if not case_id_clean:
        raise HTTPException(status_code=400, detail="case_id must not be empty.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted for CDR ingestion.")

    file_bytes = await file.read()
    parsed = parse_cdr_csv(file_bytes=file_bytes, filename=file.filename)

    driver = get_driver()
    try:
        with session_scope(driver) as session:
            merge_case(session, case_id=case_id_clean, description=f"Case {case_id_clean}")
            for rec in parsed.get("records", []):
                merge_called(
                    session=session,
                    caller=rec["caller"],
                    callee=rec["callee"],
                    timestamp=rec["timestamp"],
                    duration=rec["duration"],
                    case_id=case_id_clean,
                )
    finally:
        driver.close()

    return {
        "status": "success",
        "case_id": case_id_clean,
        "source_type": "cdr",
        "data": parsed,
    }


@app.post("/ingest/bank")
async def ingest_bank(
    case_id: str = Form(..., description="Unique case identifier"),
    file: UploadFile = File(..., description="Bank transaction CSV file with columns: sender, receiver, amount, date"),
):
    case_id_clean = case_id.strip()
    if not case_id_clean:
        raise HTTPException(status_code=400, detail="case_id must not be empty.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted for Bank ingestion.")

    file_bytes = await file.read()
    parsed = parse_bank_csv(file_bytes=file_bytes, filename=file.filename)

    driver = get_driver()
    try:
        with session_scope(driver) as session:
            merge_case(session, case_id=case_id_clean, description=f"Case {case_id_clean}")
            for rec in parsed.get("records", []):
                merge_transferred(
                    session=session,
                    sender=rec["sender"],
                    receiver=rec["receiver"],
                    amount=rec["amount"],
                    date=rec["date"],
                    case_id=case_id_clean,
                )
    finally:
        driver.close()

    return {
        "status": "success",
        "case_id": case_id_clean,
        "source_type": "bank",
        "data": parsed,
    }


# ---------------------------------------------------------------------------
# Batch 4: Unified Pipeline Endpoints
# ---------------------------------------------------------------------------

@app.post("/cases/{case_id}/upload")
async def upload_case_document(
    case_id: str,
    file: Optional[UploadFile] = File(None, description="FIR file (PDF or TXT)"),
    text: Optional[str] = Form(None, description="Direct text input for FIR"),
):
    """
    Ingestion -> NER -> Fuzzy Match Candidates.
    Returns extracted entities and alias candidates for investigator review.
    Does NOT write to Neo4j.
    """
    case_id_clean = case_id.strip()
    if not case_id_clean:
        raise HTTPException(status_code=400, detail="case_id must not be empty.")

    file_bytes = None
    filename = None
    if file is not None:
        filename = file.filename
        file_bytes = await file.read()

    # Step 1: Parse content
    parsed = parse_fir_content(file_bytes=file_bytes, filename=filename, raw_text=text)
    extracted_text = parsed.get("text", "")

    # Step 2: Entity Extraction via spaCy NER
    raw_entities = extract_entities(extracted_text)

    # Step 3: Fetch known suspect names from Neo4j for alias matching
    known_suspects = []
    try:
        driver = get_driver()
        with session_scope(driver) as session:
            records = session.run("MATCH (s:Suspect) RETURN s.name AS name").data()
            known_suspects = [r["name"] for r in records if r.get("name")]
        driver.close()
    except Exception as e:
        # Fallback if Neo4j is temporarily unreachable or empty
        known_suspects = []

    # Step 4: Group entities and compute alias candidates
    suspects_found = []
    complainants_found = []
    phones_found = []
    locations_found = []
    amounts_found = []
    alias_suggestions = {}

    # Keyword patterns for complainant/victim proximity check
    complainant_keywords = ["complainant", "victim", "informant", "reported that", "reported by", "lodged by"]

    for ent in raw_entities:
        label = ent["label"]
        ent_text = ent["text"]
        start_char = ent["start_char"]
        end_char = ent["end_char"]
        source_sent = ent["source_sentence"]

        item = {
            "text": ent_text,
            "label": label,
            "source_sentence": source_sent,
            "start_char": start_char,
            "end_char": end_char,
        }

        if label == "PERSON":
            clean_name, detected_role = trim_role_prefix(ent_text)

            # If the extracted person is actually a location in our gazetteer, relabel and redirect
            if clean_name.lower() in KNOWN_LOCATIONS_LOWER:
                item["text"] = clean_name
                item["label"] = "GPE"
                locations_found.append(item)
                continue

            # Ignore obvious account numbers/IDs mistakenly tagged as PERSON
            if re.match(r"^(?:ACC|A/C)?\d+$", clean_name, re.IGNORECASE):
                continue

            # Always save the trimmed name (no title keyword in entity text)
            item["text"] = clean_name

            # Context windows (40 chars before and 40 chars after)
            pre_ctx = extracted_text[max(0, start_char - 40):start_char].lower()
            post_ctx = extracted_text[end_char:min(len(extracted_text), end_char + 40)].lower()

            # Role heuristic:
            # 1. Inherit role from extractor or prefix if already detected
            if ent.get("role") == "complainant" or detected_role == "complainant":
                is_complainant = True
            elif ent.get("role") == "suspect" or detected_role == "suspect":
                is_complainant = False
            # 2. Direct suspect markers in pre_ctx take priority
            elif re.search(r"\b(suspect|accused|perpetrator)\b", pre_ctx):
                is_complainant = False
            # 3. Complainant/victim markers in pre_ctx or immediate reporting suffix in post_ctx
            elif re.search(r"\b(complainant|victim|informant)\b", pre_ctx):
                is_complainant = True
            elif re.search(r"^\s*(?:,\s*)?(?:reported|lodged|stated|alleged|complained|informed)\b", post_ctx):
                is_complainant = True
            elif re.search(r"\b(?:reported|lodged|filed|stated|informed)\s+by\b", pre_ctx):
                is_complainant = True
            else:
                is_complainant = False

            if is_complainant:
                item["role"] = "complainant"
                complainants_found.append(item)
            else:
                item["role"] = "suspect"
                suspects_found.append(item)
                if known_suspects:
                    candidates = find_alias_candidates(clean_name, known_suspects)
                    if candidates:
                        alias_suggestions[clean_name] = candidates
        elif label == "PHONE":
            phones_found.append(item)
        elif label == "GPE":
            locations_found.append(item)
        elif label == "AMOUNT":
            amounts_found.append(item)

    return {
        "status": "review_pending",
        "case_id": case_id_clean,
        "raw_text_length": len(extracted_text),
        "entities": {
            "suspects": suspects_found,
            "complainants": complainants_found,
            "phones": phones_found,
            "locations": locations_found,
            "amounts": amounts_found,
        },
        "alias_candidates": alias_suggestions,
        "message": "Entities extracted. Investigator review required before writing to graph.",
    }


@app.post("/cases/{case_id}/confirm-entities")
def confirm_entities(
    case_id: str,
    payload: ConfirmedEntitiesRequest,
):
    """
    Accepts investigator's confirmed entity list and writes them to Neo4j.
    Uses MERGE (never CREATE) to guarantee idempotency and Proof-of-Source.
    """
    case_id_clean = case_id.strip()
    if not case_id_clean:
        raise HTTPException(status_code=400, detail="case_id must not be empty.")

    driver = get_driver()
    written = {
        "suspects": 0,
        "phones": 0,
        "accounts": 0,
        "locations": 0,
        "relationships": 0,
    }

    try:
        with session_scope(driver) as session:
            # 1. Ensure Case node exists
            merge_case(session, case_id=case_id_clean, description=f"Case {case_id_clean}")

            # 2. Merge Suspects
            for s in payload.suspects:
                if not s.name or not s.name.strip():
                    continue
                if not s.source_sentence or not s.source_sentence.strip():
                    raise HTTPException(
                        status_code=400,
                        detail=f"Suspect '{s.name}' is missing source_sentence (Proof-of-Source violation).",
                    )
                merge_suspect(
                    session=session,
                    name=s.name.strip(),
                    alias=s.alias.strip() if s.alias else None,
                )
                merge_mentions(
                    session=session,
                    case_id=case_id_clean,
                    suspect=s.name.strip(),
                    source_sentence=s.source_sentence.strip(),
                )
                written["suspects"] += 1
                written["relationships"] += 1

            # 3. Merge Phones
            for p in payload.phones:
                if not p.number or not p.number.strip():
                    continue
                p_num = p.number.strip()
                merge_phone(session=session, number=p_num)
                written["phones"] += 1
                if p.owner and p.owner.strip():
                    merge_owns(
                        session=session,
                        suspect=p.owner.strip(),
                        node_type="Phone",
                        identifier=p_num,
                        case_id=case_id_clean,
                    )
                    written["relationships"] += 1

            # 4. Merge Accounts
            for a in payload.accounts:
                if not a.account_number or not a.account_number.strip():
                    continue
                acc_num = a.account_number.strip()
                merge_account(
                    session=session,
                    account_number=acc_num,
                    bank_name=a.bank_name.strip() if a.bank_name else "",
                )
                written["accounts"] += 1
                if a.owner and a.owner.strip():
                    merge_owns(
                        session=session,
                        suspect=a.owner.strip(),
                        node_type="Account",
                        identifier=acc_num,
                        case_id=case_id_clean,
                    )
                    written["relationships"] += 1

            # 5. Merge Locations
            for loc in payload.locations:
                if not loc.name or not loc.name.strip():
                    continue
                loc_name = loc.name.strip()
                merge_location(
                    session=session,
                    name=loc_name,
                    region=loc.region.strip() if loc.region else "",
                )
                written["locations"] += 1
                if loc.suspect and loc.suspect.strip():
                    merge_located_at(
                        session=session,
                        suspect=loc.suspect.strip(),
                        location=loc_name,
                        case_id=case_id_clean,
                    )
                    written["relationships"] += 1

    finally:
        driver.close()

    return {
        "status": "success",
        "case_id": case_id_clean,
        "written": written,
        "message": "Confirmed entities successfully written to Neo4j graph using MERGE.",
    }


@app.get("/cases/{case_id}/graph")
def get_case_graph(case_id: str):
    """
    Returns all nodes and edges connected to case_id,
    formatted as JSON suitable for Cytoscape.js / React-Flow frontend rendering.

    For Suspect nodes, source_sentence is read from the MENTIONS relationship
    for *this specific case* — not from the Suspect node itself.  This ensures
    the evidence shown in the UI is always the correct Proof-of-Source for the
    case currently being inspected, even if the same suspect appears in other
    cases with different source sentences.
    """
    case_id_clean = case_id.strip()
    if not case_id_clean:
        raise HTTPException(status_code=400, detail="case_id must not be empty.")

    driver = get_driver()
    nodes_dict = {}
    edges_list = []

    # -----------------------------------------------------------------------
    # Query 1: fetch the Case node, its MENTIONS relationships (with
    # source_sentence), and every Suspect linked by those relationships.
    # -----------------------------------------------------------------------
    mentions_cypher = """
    MATCH (c:Case {case_id: $case_id})-[r_m:MENTIONS]->(s:Suspect)
    RETURN c, r_m, s, r_m.source_sentence AS source_sentence
    """

    # -----------------------------------------------------------------------
    # Query 2: fetch ownership and location relationships for suspects in
    # this case, plus the Phone / Account / Location nodes they connect to.
    # -----------------------------------------------------------------------
    related_cypher = """
    MATCH (c:Case {case_id: $case_id})-[:MENTIONS]->(s:Suspect)
    OPTIONAL MATCH (s)-[r_owns:OWNS]->(target)
    OPTIONAL MATCH (s)-[r_loc:LOCATED_AT]->(loc:Location)
    RETURN s, r_owns, target, r_loc, loc
    """

    # -----------------------------------------------------------------------
    # Query 3: CDR and bank transactions that are tagged to this case.
    # -----------------------------------------------------------------------
    tx_cypher = """
    OPTIONAL MATCH (p1:Phone)-[r_call:CALLED {case_id: $case_id}]->(p2:Phone)
    OPTIONAL MATCH (a1:Account)-[r_tx:TRANSFERRED {case_id: $case_id}]->(a2:Account)
    RETURN p1, r_call, p2, a1, r_tx, a2
    """

    def _clean_props(node_or_rel) -> dict:
        return {
            k: str(v) if hasattr(v, "iso_format") or hasattr(v, "to_native") else v
            for k, v in dict(node_or_rel).items()
        }

    def _add_node(n, extra_props: dict = None):
        if n is None or n.element_id in nodes_dict:
            return
        labels = list(n.labels)
        label = labels[0] if labels else "Node"
        props = _clean_props(n)
        if extra_props:
            props.update(extra_props)
        display_name = (
            props.get("name")
            or props.get("number")
            or props.get("account_number")
            or props.get("case_id")
            or label
        )
        nodes_dict[n.element_id] = {
            "id": n.element_id,
            "label": label,
            "name": display_name,
            "properties": props,
        }

    def _add_rel(r):
        if r is None:
            return
        props = _clean_props(r)
        edges_list.append({
            "id": r.element_id,
            "source": r.start_node.element_id,
            "target": r.end_node.element_id,
            "type": r.type,
            "properties": props,
        })

    try:
        with session_scope(driver) as session:
            # --- Case + MENTIONS + Suspects (with per-case source_sentence) ---
            for record in session.run(mentions_cypher, case_id=case_id_clean):
                c = record["c"]
                s = record["s"]
                r_m = record["r_m"]
                src = record["source_sentence"]

                _add_node(c)
                # Inject source_sentence from the relationship into the Suspect's
                # displayed properties so the UI evidence panel shows the right text.
                _add_node(s, extra_props={"source_sentence": src} if src else {})
                _add_rel(r_m)

            # --- Ownership & location relationships ---
            for record in session.run(related_cypher, case_id=case_id_clean):
                _add_node(record["s"])
                _add_node(record.get("target"))
                _add_node(record.get("loc"))
                r_owns = record.get("r_owns")
                r_loc  = record.get("r_loc")
                if r_owns:
                    _add_rel(r_owns)
                if r_loc:
                    _add_rel(r_loc)

            # --- CDR / bank transactions ---
            for record in session.run(tx_cypher, case_id=case_id_clean):
                _add_node(record.get("p1"))
                _add_node(record.get("p2"))
                _add_node(record.get("a1"))
                _add_node(record.get("a2"))
                r_call = record.get("r_call")
                r_tx   = record.get("r_tx")
                if r_call:
                    _add_rel(r_call)
                if r_tx:
                    _add_rel(r_tx)

    finally:
        driver.close()

    return {
        "case_id": case_id_clean,
        "node_count": len(nodes_dict),
        "edge_count": len(edges_list),
        "nodes": list(nodes_dict.values()),
        "edges": edges_list,
    }


@app.get("/cases/{case_id}/analytics")
def get_case_analytics(case_id: str):
    """
    Runs Betweenness Centrality, PageRank, Louvain Community Detection,
    Cycle Detection, and Cross-Case Linking queries, returning JSON results.
    """
    case_id_clean = case_id.strip()
    if not case_id_clean:
        raise HTTPException(status_code=400, detail="case_id must not be empty.")

    driver = get_driver()

    try:
        with session_scope(driver) as session:
            # 1. Ensure GDS projection exists
            try:
                session.run(DROP_PROJECTION)
            except Exception:
                pass
            session.run(PROJECTION)

            # Fetch suspects mentioned in this case
            case_suspects_records = session.run(
                "MATCH (c:Case {case_id: $case_id})-[:MENTIONS]->(s:Suspect) RETURN s.name AS name",
                case_id=case_id_clean,
            ).data()
            case_suspect_names = {r["name"] for r in case_suspects_records if r.get("name")}

            # 2. Betweenness Centrality
            bc_records = session.run(BETWEENNESS_CENTRALITY).data()
            betweenness_results = [
                {
                    "nodeType": r["nodeType"],
                    "identifier": r["identifier"],
                    "case_id": r.get("case_id"),
                    "score": r["betweenness_score"],
                    "in_this_case": r["identifier"] in case_suspect_names,
                }
                for r in bc_records
            ]

            # 3. PageRank
            pr_records = session.run(PAGERANK).data()
            pagerank_results = [
                {
                    "nodeType": r["nodeType"],
                    "identifier": r["identifier"],
                    "case_id": r.get("case_id"),
                    "score": r["pagerank_score"],
                    "in_this_case": r["identifier"] in case_suspect_names,
                }
                for r in pr_records
            ]

            # 4. Louvain Community Detection
            louvain_records = session.run(LOUVAIN_COMMUNITY).data()
            communities = {}
            for r in louvain_records:
                cid = str(r["communityId"])
                communities.setdefault(cid, []).append({
                    "nodeType": r["nodeType"],
                    "identifier": r["identifier"],
                    "case_id": r.get("case_id"),
                    "in_this_case": r["identifier"] in case_suspect_names,
                })

            # 5. Cycle Detection (Money Laundering Rings)
            # Deliberately scoped to relationships touching $case_id for targeted relevance and to prevent exponential combinatorial explosion across the global transaction graph.
            cycle_query = """
            MATCH path = (start:Account)-[:TRANSFERRED*2..6]->(start)
            WHERE any(x IN relationships(path) WHERE x.case_id = $case_id)
              AND all(i IN range(1, length(path) - 1) WHERE NOT nodes(path)[i] IN nodes(path)[0..i])
              AND all(n IN nodes(path)[1..-1] WHERE start.account_number < n.account_number)
            WITH [n IN nodes(path) | n.account_number] AS accounts,
                 [rel IN relationships(path) | rel.amount] AS amounts,
                 [rel IN relationships(path) | rel.case_id] AS cases,
                 length(path) AS cycle_length
            RETURN DISTINCT
              accounts,
              amounts,
              cases,
              cycle_length
            ORDER BY cycle_length ASC
            LIMIT 20
            """
            cycle_records = session.run(cycle_query, case_id=case_id_clean).data()

            # 6. Cross-Case Linking for entities in this case
            cross_case_query = """
            MATCH (c:Case {case_id: $case_id})-[:MENTIONS]->(s:Suspect)
            MATCH (c_other:Case)-[:MENTIONS]->(s)
            WHERE c_other.case_id <> $case_id
            WITH s, collect(DISTINCT c_other.case_id) AS other_cases
            WHERE size(other_cases) > 0
            RETURN 'Suspect' AS entityType, s.name AS identifier, other_cases, size(other_cases) + 1 AS total_cases
            """
            cross_case_records = session.run(cross_case_query, case_id=case_id_clean).data()

    finally:
        driver.close()

    burner_info = get_burner_phones(case_id_clean)

    return {
        "case_id": case_id_clean,
        "betweenness_centrality": betweenness_results,
        "pagerank": pagerank_results,
        "louvain_communities": communities,
        "money_laundering_cycles": cycle_records,
        "cross_case_links": cross_case_records,
        "burner_phones": burner_info.get("flagged_phones", []),
    }


# ---------------------------------------------------------------------------
# Burner Phone Detection Constants
# ---------------------------------------------------------------------------
# High call volume threshold (>5 calls, i.e. 6+ calls): Disposable burner handsets are characteristically used for rapid burst calls (fraud/coordination) before immediate disposal.
BURNER_CALL_COUNT_THRESHOLD: int = 5

# Monitoring window threshold (2 hours): Captures single-session rapid bursts while preventing false flags on legitimate multi-hour daily business calling.
BURNER_WINDOW_HOURS_THRESHOLD: int = 2


@app.get("/cases/{case_id}/burner-phones")
def get_burner_phones(
    case_id: str,
    burst_call_threshold: int = BURNER_CALL_COUNT_THRESHOLD,
    burst_window_hours: int = BURNER_WINDOW_HOURS_THRESHOLD,
):
    """
    Detects possible burner-phone patterns in this case's CDR data using a
    simple, explainable rule:

        A phone is flagged if it made > burst_call_threshold calls within
        burst_window_hours hours of its FIRST call in the record, AND made
        zero further calls after that burst window ended.

    This rule is intentionally transparent so an investigator can explain
    exactly why any individual phone was flagged.

    Defaults: more than 5 calls in the first 2 hours, then silence.
    """
    case_id_clean = case_id.strip()
    if not case_id_clean:
        raise HTTPException(status_code=400, detail="case_id must not be empty.")

    # Fetch all CALLED edges for this case, grouped by the calling phone.
    # We read timestamps as strings here so they survive serialisation regardless
    # of whether Neo4j stores them as DateTime objects or ISO-string properties.
    cdr_query = """
    MATCH (p:Phone)-[r:CALLED {case_id: $case_id}]->(p2:Phone)
    RETURN p.number AS caller, r.timestamp AS ts, p2.number AS callee
    ORDER BY caller, ts
    """
    driver = get_driver()
    try:
        with session_scope(driver) as session:
            rows = session.run(cdr_query, case_id=case_id_clean).data()
    finally:
        driver.close()

    if not rows:
        return {
            "case_id": case_id_clean,
            "rule": f">{burst_call_threshold} calls within the first {burst_window_hours}h, then zero calls after",
            "flagged_phones": [],
        }

    # Group calls by caller
    from collections import defaultdict
    from datetime import datetime, timezone, timedelta

    calls_by_caller: dict[str, list[datetime]] = defaultdict(list)
    for row in rows:
        caller = row.get("caller")
        ts_raw = row.get("ts")
        if not caller or ts_raw is None:
            continue
        # ts_raw may be a neo4j DateTime object, an ISO string, or general datetime string
        if hasattr(ts_raw, "to_native"):
            # neo4j.time.DateTime → Python datetime
            dt = ts_raw.to_native()
        elif hasattr(ts_raw, "isoformat"):
            # already a Python datetime
            dt = ts_raw
        else:
            try:
                dt = datetime.fromisoformat(str(ts_raw))
            except Exception:
                try:
                    import pandas as pd
                    dt = pd.to_datetime(str(ts_raw)).to_pydatetime()
                except Exception:
                    continue
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        calls_by_caller[caller].append(dt)

    burst_window = timedelta(hours=burst_window_hours)
    flagged = []

    for caller, timestamps in calls_by_caller.items():
        timestamps.sort()
        first_call = timestamps[0]
        last_call = timestamps[-1]
        window_end = first_call + burst_window

        # Count calls inside the burst window
        calls_in_window = [t for t in timestamps if t <= window_end]
        # Count calls after the burst window
        calls_after_window = [t for t in timestamps if t > window_end]

        burst_count = len(calls_in_window)
        is_silent_after = len(calls_after_window) == 0

        # A phone qualifies as a suspected burner if:
        #   (1) it made more than burst_call_threshold calls inside the window, AND
        #   (2) it made zero calls after the window closed
        if burst_count > burst_call_threshold and is_silent_after:
            total_active_minutes = (last_call - first_call).total_seconds() / 60
            span_desc = f"{round(total_active_minutes)} mins" if total_active_minutes >= 1 else "<1 min"
            flagged.append({
                "phone_number": caller,
                "total_calls": len(timestamps),
                "calls_in_burst_window": burst_count,
                "burst_window_hours": burst_window_hours,
                "calls_after_window": 0,
                "first_call": first_call.isoformat(),
                "last_call": last_call.isoformat(),
                "active_duration_minutes": round(total_active_minutes, 1),
                "flag_reason": (
                    f"{burst_count} calls within {span_desc} "
                    f"(window: first {burst_window_hours}h, {first_call.strftime('%H:%M')}–{window_end.strftime('%H:%M')}), "
                    f"then no further activity"
                ),
            })

    return {
        "case_id": case_id_clean,
        "rule": f">{burst_call_threshold} calls within the first {burst_window_hours}h, then zero calls after",
        "flagged_phones": flagged,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

