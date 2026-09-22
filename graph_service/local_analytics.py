"""
Stage 5 — Local analytics fallback for environments without Neo4j GDS
(e.g. Neo4j AuraDB Free).

Computes the same three measures the GDS path provides — betweenness
centrality (kingpin/broker detection), PageRank (influence ranking), and
Louvain community detection (gang clustering) — in Python using NetworkX
over nodes/edges fetched via plain Cypher. No custom-trained models:
these are the standard graph algorithms, same math as the GDS procedures.

Projection mirrors the GDS in-memory graph 'cyberhunters':
  nodes: Suspect, Phone, Account
  rels:  CALLED, TRANSFERRED, OWNS (treated as undirected)

Response shaping matches the GDS path exactly
({nodeType, identifier, case_id, score, in_this_case} rows, communities
dict keyed by community id) so the frontend requires no changes.
"""

from typing import Dict, List, Tuple


def compute_local_analytics(
    driver,
    case_id: str,
) -> Tuple[List[dict], List[dict], Dict[str, List[dict]]]:
    """
    Returns (betweenness_results, pagerank_results, communities).
    Raises RuntimeError if the required packages are missing or the
    computation fails — the caller falls back to the gds_warning path.
    """
    try:
        import networkx as nx
    except ImportError as e:
        raise RuntimeError(f"networkx is not installed: {e}")

    from graph_service.graph_writer import session_scope

    with session_scope(driver) as session:
        node_rows = session.run(
            """
            MATCH (n)
            WHERE n:Suspect OR n:Phone OR n:Account
            RETURN elementId(n) AS eid,
                   labels(n) AS labels,
                   coalesce(n.name, n.number, n.account_number) AS identifier
            """
        ).data()

        edge_rows = session.run(
            """
            MATCH (a)-[r:CALLED|TRANSFERRED|OWNS]-(b)
            WHERE (a:Suspect OR a:Phone OR a:Account)
              AND (b:Suspect OR b:Phone OR b:Account)
            RETURN DISTINCT elementId(a) AS src, elementId(b) AS dst
            """
        ).data()

        case_rows = session.run(
            "MATCH (c:Case {case_id: $case_id})-[:MENTIONS]->(s:Suspect) "
            "RETURN s.name AS name",
            case_id=case_id,
        ).data()

    if not node_rows:
        return [], [], {}

    case_suspect_names = {r["name"] for r in case_rows if r.get("name")}

    meta: Dict[str, dict] = {}
    for r in node_rows:
        labels = r.get("labels") or []
        meta[r["eid"]] = {
            "nodeType": labels[0] if labels else "Node",
            "identifier": r.get("identifier"),
        }

    G = nx.Graph()
    G.add_nodes_from(meta.keys())
    for e in edge_rows:
        if e["src"] in meta and e["dst"] in meta and e["src"] != e["dst"]:
            G.add_edge(e["src"], e["dst"])

    if G.number_of_edges() == 0:
        return [], [], {}

    bc_scores = nx.betweenness_centrality(G, normalized=True)
    pr_scores = nx.pagerank(G, alpha=0.85, max_iter=100)

    betweenness_results = [
        {
            "nodeType": meta[eid]["nodeType"],
            "identifier": meta[eid]["identifier"],
            "case_id": None,
            "score": round(float(score), 4),
            "in_this_case": meta[eid]["identifier"] in case_suspect_names,
        }
        for eid, score in sorted(bc_scores.items(), key=lambda kv: kv[1], reverse=True)
        if meta[eid]["nodeType"] in ("Suspect", "Phone")
    ][:20]

    pagerank_results = [
        {
            "nodeType": meta[eid]["nodeType"],
            "identifier": meta[eid]["identifier"],
            "case_id": None,
            "score": round(float(score), 6),
            "in_this_case": meta[eid]["identifier"] in case_suspect_names,
        }
        for eid, score in sorted(pr_scores.items(), key=lambda kv: kv[1], reverse=True)
        if meta[eid]["nodeType"] in ("Suspect", "Account")
    ][:20]

    communities: Dict[str, List[dict]] = {}
    try:
        import community as community_louvain

        partition = community_louvain.best_partition(G, random_state=42)
        for eid, cid in partition.items():
            communities.setdefault(str(cid), []).append(
                {
                    "nodeType": meta[eid]["nodeType"],
                    "identifier": meta[eid]["identifier"],
                    "case_id": None,
                    "in_this_case": meta[eid]["identifier"] in case_suspect_names,
                }
            )
        for members in communities.values():
            members.sort(key=lambda m: (m["nodeType"], str(m["identifier"])))
    except ImportError:
        # centrality/PageRank results still stand; communities stay empty
        pass

    return betweenness_results, pagerank_results, communities
