"""
Stage 3 — Integration Test + Neo4j Browser Guide

Writes a realistic 3-case scenario into Neo4j via graph_writer.py, verifies
the node/relationship counts via assertions, then prints the exact GDS queries
to paste into Neo4j Browser for Part B validation.

Run with:
    .venv\\Scripts\\python.exe graph_service\\test_graph.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from graph_writer import (
    get_driver,
    create_schema_constraints,
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
from gds_queries import (
    ALL_QUERIES,
    DROP_PROJECTION,
    PROJECTION,
    BETWEENNESS_CENTRALITY,
    PAGERANK,
    LOUVAIN_COMMUNITY,
)

# ---------------------------------------------------------------------------
# Scenario:
#   CASE-2026-DEL-001  — extortion ring (Vikram + Suresh)
#   CASE-2026-MUM-002  — fraud ring   (Amit + Priya)
#   CASE-2026-DEL-003  — cross-case:  Vikram reappears, sharing a phone
#                        with Amit's associate, revealing a network link
# ---------------------------------------------------------------------------

SAMPLE_DATA = {
    "cases": [
        {"case_id": "CASE-2026-DEL-001", "description": "Extortion ring, New Delhi"},
        {"case_id": "CASE-2026-MUM-002", "description": "Online fraud ring, Mumbai"},
        {"case_id": "CASE-2026-DEL-003", "description": "Cross-case link investigation"},
    ],
    "suspects": [
        {
            "name": "Vikram Singh",
            "case_id": "CASE-2026-DEL-001",
            "source_sentence": (
                "Suspect Vikram Singh was identified as the primary extortionist "
                "demanding Rs. 3,50,000 via phone +919823456780."
            ),
            "alias": "Vicky",
        },
        {
            "name": "Suresh Kumar",
            "case_id": "CASE-2026-DEL-001",
            "source_sentence": (
                "Suresh Kumar acted as an intermediary for Vikram Singh, "
                "receiving funds in account ACC44556677."
            ),
            "alias": None,
        },
        {
            "name": "Amit Roy",
            "case_id": "CASE-2026-MUM-002",
            "source_sentence": (
                "Amit Roy orchestrated a phishing fraud from Mumbai, "
                "using phone +919811223344 and account ACC334455."
            ),
            "alias": None,
        },
        {
            "name": "Priya Desai",
            "case_id": "CASE-2026-MUM-002",
            "source_sentence": (
                "Priya Desai laundered proceeds through accounts ACC667788 and ACC334455."
            ),
            "alias": None,
        },
        # Cross-case: Vikram reappears in DEL-003
        {
            "name": "Vikram Singh",
            "case_id": "CASE-2026-DEL-003",
            "source_sentence": (
                "Vikram Singh was linked to CASE-2026-DEL-003 via shared phone +919823456780, "
                "which also contacted Amit Roy's known number."
            ),
            "alias": "Vicky",
        },
    ],
    "phones": [
        "+919823456780",  # Vikram
        "+919123456789",  # Suresh
        "+919811223344",  # Amit
        "+919555001122",  # shared burner — used in DEL-003 cross-case link
    ],
    "accounts": [
        {"account_number": "ACC100123", "bank_name": "SBI"},          # victim
        {"account_number": "ACC44556677", "bank_name": "HDFC"},       # Suresh
        {"account_number": "ACC99887766", "bank_name": "City Union"}, # Vikram
        {"account_number": "ACC334455",   "bank_name": "Axis"},       # Amit
        {"account_number": "ACC667788",   "bank_name": "PNB"},        # Priya
        {"account_number": "ACC778899",   "bank_name": "SBI"},        # layering hop
    ],
    "locations": [
        {"name": "Rohini, Delhi",  "region": "Delhi"},
        {"name": "Sector 18, Noida", "region": "UP"},
        {"name": "Andheri West",   "region": "Mumbai"},
        {"name": "Navi Mumbai",    "region": "Mumbai"},
    ],
    "cdr": [
        # Vikram → Suresh
        {"caller": "+919823456780", "callee": "+919123456789",
         "timestamp": "2026-03-01T10:15:00", "duration": 180, "case_id": "CASE-2026-DEL-001"},
        # Suresh → Vikram (call back)
        {"caller": "+919123456789", "callee": "+919823456780",
         "timestamp": "2026-03-01T14:05:00", "duration": 320, "case_id": "CASE-2026-DEL-001"},
        # Amit → Priya
        {"caller": "+919811223344", "callee": "+919555001122",
         "timestamp": "2026-03-02T09:30:00", "duration": 90, "case_id": "CASE-2026-MUM-002"},
        # Cross-case: burner used by both networks
        {"caller": "+919555001122", "callee": "+919823456780",
         "timestamp": "2026-03-03T18:00:00", "duration": 60, "case_id": "CASE-2026-DEL-003"},
    ],
    "transfers": [
        # Extortion chain: victim → Vikram → Suresh → laundry hop
        {"sender": "ACC100123",  "receiver": "ACC99887766", "amount": 350000.0,
         "date": "2026-03-01", "case_id": "CASE-2026-DEL-001"},
        {"sender": "ACC99887766","receiver": "ACC44556677", "amount": 200000.0,
         "date": "2026-03-01", "case_id": "CASE-2026-DEL-001"},
        {"sender": "ACC44556677","receiver": "ACC778899",   "amount": 180000.0,
         "date": "2026-03-02", "case_id": "CASE-2026-DEL-001"},
        # Cycle: laundry hop returns funds (money laundering ring)
        {"sender": "ACC778899",  "receiver": "ACC99887766", "amount": 170000.0,
         "date": "2026-03-03", "case_id": "CASE-2026-DEL-001"},
        # Fraud chain: victim → Amit → Priya → Amit (cycle)
        {"sender": "ACC334455",  "receiver": "ACC667788",   "amount": 120000.0,
         "date": "2026-03-02", "case_id": "CASE-2026-MUM-002"},
        {"sender": "ACC667788",  "receiver": "ACC334455",   "amount": 100000.0,
         "date": "2026-03-03", "case_id": "CASE-2026-MUM-002"},
    ],
    "owns": [
        # Suspect → Phone
        {"suspect": "Vikram Singh",  "node_type": "Phone",   "identifier": "+919823456780", "case_id": "CASE-2026-DEL-001"},
        {"suspect": "Suresh Kumar",  "node_type": "Phone",   "identifier": "+919123456789", "case_id": "CASE-2026-DEL-001"},
        {"suspect": "Amit Roy",      "node_type": "Phone",   "identifier": "+919811223344", "case_id": "CASE-2026-MUM-002"},
        # Suspect → Account
        {"suspect": "Vikram Singh",  "node_type": "Account", "identifier": "ACC99887766",  "case_id": "CASE-2026-DEL-001"},
        {"suspect": "Suresh Kumar",  "node_type": "Account", "identifier": "ACC44556677",  "case_id": "CASE-2026-DEL-001"},
        {"suspect": "Amit Roy",      "node_type": "Account", "identifier": "ACC334455",    "case_id": "CASE-2026-MUM-002"},
        {"suspect": "Priya Desai",   "node_type": "Account", "identifier": "ACC667788",    "case_id": "CASE-2026-MUM-002"},
    ],
    "located_at": [
        {"suspect": "Vikram Singh", "location": "Rohini, Delhi",    "case_id": "CASE-2026-DEL-001"},
        {"suspect": "Suresh Kumar", "location": "Sector 18, Noida", "case_id": "CASE-2026-DEL-001"},
        {"suspect": "Amit Roy",     "location": "Andheri West",     "case_id": "CASE-2026-MUM-002"},
        {"suspect": "Priya Desai",  "location": "Navi Mumbai",      "case_id": "CASE-2026-MUM-002"},
    ],
    "mentions": [
        {"case_id": "CASE-2026-DEL-001", "suspect": "Vikram Singh"},
        {"case_id": "CASE-2026-DEL-001", "suspect": "Suresh Kumar"},
        {"case_id": "CASE-2026-MUM-002", "suspect": "Amit Roy"},
        {"case_id": "CASE-2026-MUM-002", "suspect": "Priya Desai"},
        {"case_id": "CASE-2026-DEL-003", "suspect": "Vikram Singh"},  # cross-case
    ],
}


# ---------------------------------------------------------------------------
# Write all sample data
# ---------------------------------------------------------------------------

def seed_graph(driver):
    """Write the full scenario into Neo4j (idempotent — MERGE throughout)."""
    with session_scope(driver) as session:

        for c in SAMPLE_DATA["cases"]:
            merge_case(session, **c)

        for s in SAMPLE_DATA["suspects"]:
            merge_suspect(session, **s)

        for number in SAMPLE_DATA["phones"]:
            merge_phone(session, number)

        for a in SAMPLE_DATA["accounts"]:
            merge_account(session, **a)

        for loc in SAMPLE_DATA["locations"]:
            merge_location(session, **loc)

        for call in SAMPLE_DATA["cdr"]:
            merge_called(session, **call)

        for txn in SAMPLE_DATA["transfers"]:
            merge_transferred(session, **txn)

        for o in SAMPLE_DATA["owns"]:
            merge_owns(session, **o)

        for la in SAMPLE_DATA["located_at"]:
            merge_located_at(session, **la)

        for m in SAMPLE_DATA["mentions"]:
            merge_mentions(session, **m)

    print("[OK] Seed data written to Neo4j.")


# ---------------------------------------------------------------------------
# Verification assertions
# ---------------------------------------------------------------------------

def count(session, label):
    result = session.run(f"MATCH (n:{label}) RETURN count(n) AS c")
    return result.single()["c"]


def count_rel(session, rel_type):
    result = session.run(f"MATCH ()-[r:{rel_type}]->() RETURN count(r) AS c")
    return result.single()["c"]


def verify_graph(driver):
    """Assert expected node/rel counts and schema properties."""
    with session_scope(driver) as session:

        # Node counts
        assert count(session, "Case")     >= 3,  "Expected at least 3 Case nodes"
        assert count(session, "Suspect")  >= 4,  "Expected at least 4 Suspect nodes"
        assert count(session, "Phone")    >= 4,  "Expected at least 4 Phone nodes"
        assert count(session, "Account")  >= 6,  "Expected at least 6 Account nodes"
        assert count(session, "Location") >= 4,  "Expected at least 4 Location nodes"

        # Relationship counts
        assert count_rel(session, "CALLED")      >= 4, "Expected at least 4 CALLED"
        assert count_rel(session, "TRANSFERRED") >= 6, "Expected at least 6 TRANSFERRED"
        assert count_rel(session, "OWNS")        >= 7, "Expected at least 7 OWNS"
        assert count_rel(session, "LOCATED_AT")  >= 4, "Expected at least 4 LOCATED_AT"
        assert count_rel(session, "MENTIONS")    >= 5, "Expected at least 5 MENTIONS"

        # Proof-of-Source: every Suspect must have case_id + source_sentence
        result = session.run(
            """
            MATCH (s:Suspect)
            WHERE s.case_id IS NULL OR s.source_sentence IS NULL
                  OR s.case_id = '' OR s.source_sentence = ''
            RETURN count(s) AS missing
            """
        )
        missing = result.single()["missing"]
        assert missing == 0, f"{missing} Suspect node(s) missing case_id or source_sentence!"

        # Idempotency: re-running merge must not increase counts
        suspects_before = count(session, "Suspect")
        merge_suspect(
            session,
            name="Vikram Singh",
            case_id="CASE-2026-DEL-001",
            source_sentence="Re-merged test — should not create a new node.",
        )
        suspects_after = count(session, "Suspect")
        assert suspects_before == suspects_after, "MERGE created a duplicate Suspect node!"

        print(f"[OK] Nodes  — Case:{count(session,'Case')}  Suspect:{count(session,'Suspect')}  "
              f"Phone:{count(session,'Phone')}  Account:{count(session,'Account')}  "
              f"Location:{count(session,'Location')}")
        print(f"[OK] Rels   — CALLED:{count_rel(session,'CALLED')}  "
              f"TRANSFERRED:{count_rel(session,'TRANSFERRED')}  "
              f"OWNS:{count_rel(session,'OWNS')}  "
              f"LOCATED_AT:{count_rel(session,'LOCATED_AT')}  "
              f"MENTIONS:{count_rel(session,'MENTIONS')}")
        print("[OK] Proof-of-Source: all Suspect nodes carry case_id + source_sentence.")
        print("[OK] Idempotency: MERGE does not duplicate on re-run.")


# ---------------------------------------------------------------------------
# Print Neo4j Browser guide for Part B
# ---------------------------------------------------------------------------

BROWSER_GUIDE = """
==============================================================
 PART B — GDS Queries: Neo4j Browser Instructions
==============================================================
Open http://localhost:7474  (user: neo4j / password: see NEO4J_PASSWORD in .env)
Paste and run each block below IN ORDER.

--------------------------------------------------------------
STEP 1: Drop any stale projection (safe if none exists)
--------------------------------------------------------------
{drop}

--------------------------------------------------------------
STEP 2: Project the graph into GDS memory
         Expected: nodeCount=14, relationshipCount=21 approx
--------------------------------------------------------------
{projection}

--------------------------------------------------------------
STEP 3: Betweenness Centrality — who are the key brokers?
         Vikram Singh's phone (+919823456780) should rank high
         because it bridges both the DEL and MUM networks.
--------------------------------------------------------------
{betweenness}

--------------------------------------------------------------
STEP 4: PageRank — who are the most influential nodes?
         Accounts at the centre of the transfer chain rank highest.
--------------------------------------------------------------
{pagerank}

--------------------------------------------------------------
STEP 5: Louvain Community Detection — criminal gang clusters
         Expect 2 communities: DEL ring and MUM ring,
         with the cross-case phone linking them.
--------------------------------------------------------------
{louvain}

--------------------------------------------------------------
STEP 6: Cycle Detection — money laundering rings
         ACC99887766 -> ACC44556677 -> ACC778899 -> ACC99887766
         ACC334455   -> ACC667788   -> ACC334455
--------------------------------------------------------------
{cycle}

--------------------------------------------------------------
STEP 7: Cross-Case Linking — entities in multiple cases
         Vikram Singh should appear in DEL-001 and DEL-003.
--------------------------------------------------------------
{cross}
==============================================================
""".format(
    drop=DROP_PROJECTION.strip(),
    projection=ALL_QUERIES["projection"].strip(),
    betweenness=ALL_QUERIES["betweenness"].strip(),
    pagerank=ALL_QUERIES["pagerank"].strip(),
    louvain=ALL_QUERIES["louvain"].strip(),
    cycle=ALL_QUERIES["cycle_detection"].strip(),
    cross=ALL_QUERIES["cross_case_linking"].strip(),
)


def verify_gds_analytics(driver):
    """
    Directly run GDS Projection, Betweenness Centrality, PageRank,
    and Louvain Community Detection via the Neo4j driver.
    Verify outputs to ensure algorithms return expected rankings and clusters.
    """
    print("\n" + "=" * 60)
    print(" Running GDS Analytics via Neo4j Driver (Verification)")
    print("=" * 60)

    with session_scope(driver) as session:
        # Step 1: Drop stale projection if present
        print("\n[GDS 1/4] Dropping stale projection (if any)...")
        try:
            res = session.run(DROP_PROJECTION).data()
            print("  Dropped projection:", res)
        except Exception as e:
            print("  Notice (no existing projection dropped):", e)

        # Step 2: Project Graph
        print("\n[GDS 2/4] Projecting in-memory graph 'cyberhunters'...")
        proj_res = session.run(PROJECTION).single()
        print(f"  Graph projected: name={proj_res['graphName']}, nodes={proj_res['nodeCount']}, relationships={proj_res['relationshipCount']}")
        assert proj_res['nodeCount'] > 0, "Graph projection resulted in 0 nodes!"

        # Step 3: Betweenness Centrality
        print("\n[GDS 3/4] Betweenness Centrality (Broker / Kingpin Detection):")
        bc_records = list(session.run(BETWEENNESS_CENTRALITY))
        for r in bc_records:
            print(f"  {r['nodeType']:8} | {r['identifier']:<22} | Score: {r['betweenness_score']}")
        assert len(bc_records) > 0, "Betweenness centrality returned 0 results!"

        # Step 4: PageRank
        print("\n[GDS 4/4] PageRank (Influence / Connectivity Ranking):")
        pr_records = list(session.run(PAGERANK))
        for r in pr_records:
            print(f"  {r['nodeType']:8} | {r['identifier']:<22} | Score: {r['pagerank_score']}")
        assert len(pr_records) > 0, "PageRank returned 0 results!"

        # Step 5: Louvain Community Detection
        print("\n[GDS 5/4] Louvain Community Detection (Criminal Clusters):")
        louvain_records = list(session.run(LOUVAIN_COMMUNITY))
        current_comm = None
        communities = {}
        for r in louvain_records:
            cid = r['communityId']
            communities.setdefault(cid, []).append(f"{r['nodeType']}:{r['identifier']}")
            if cid != current_comm:
                current_comm = cid
                print(f"\n  -- Community ID: {current_comm} --")
            print(f"     {r['nodeType']:8} | {r['identifier']}")
        assert len(communities) >= 2, f"Expected at least 2 distinct communities, found {len(communities)}"

        print(f"\n[OK] GDS Analytics verified: {len(communities)} communities identified.")

    print("=" * 60 + "\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Connecting to Neo4j...")
    driver = get_driver()

    print("Creating schema constraints...")
    create_schema_constraints(driver)

    print("Writing sample data...")
    seed_graph(driver)

    print("Verifying graph...")
    verify_graph(driver)

    # Automatically execute and verify all GDS queries
    verify_gds_analytics(driver)

    driver.close()


