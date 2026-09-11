"""
Stage 3 — Part B: GDS Analytics Queries

These Cypher queries are designed to run against Neo4j with the Graph Data
Science (GDS) plugin.  They are NOT executed by Python at runtime — they are
reference queries to paste into Neo4j Browser or drive via the GDS Python
client in a later analytics stage.

Run them in this order:
  1.  Project the graph     → required before any GDS algorithm
  2-4. Run algorithms on the projection
  5.  Cycle detection       → pure Cypher (no GDS required)
  6.  Cross-case linking    → pure Cypher (no GDS required)

Each query is stored as a string constant so it can also be executed
programmatically (e.g. in a future analytics endpoint).
"""

# ---------------------------------------------------------------------------
# 1. Graph Projection
#    Creates an in-memory GDS graph named "cyberhunters" from the live graph.
#    Includes nodes: Suspect, Phone, Account
#    Includes rels:  CALLED, TRANSFERRED, OWNS
#    orientation UNDIRECTED on all rels for homogeneous community & centrality analysis.
# ---------------------------------------------------------------------------
PROJECTION = """
CALL gds.graph.project(
  'cyberhunters',
  ['Suspect', 'Phone', 'Account'],
  {
    CALLED:      { orientation: 'UNDIRECTED' },
    TRANSFERRED: { orientation: 'UNDIRECTED' },
    OWNS:        { orientation: 'UNDIRECTED' }
  }
)
YIELD graphName, nodeCount, relationshipCount
RETURN graphName, nodeCount, relationshipCount
"""

# ---------------------------------------------------------------------------
# 2. Betweenness Centrality — Kingpin Detection
#    Suspects/phones that are critical bridge nodes (high BC = key broker).
#    Higher score = more paths route through this node.
#    Run AFTER the projection exists.
# ---------------------------------------------------------------------------
BETWEENNESS_CENTRALITY = """
CALL gds.betweenness.stream('cyberhunters')
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS node, score
WHERE node:Suspect OR node:Phone
RETURN
  labels(node)[0]  AS nodeType,
  coalesce(node.name, node.number) AS identifier,
  node.case_id     AS case_id,
  round(score, 4)  AS betweenness_score
ORDER BY betweenness_score DESC
LIMIT 20
"""

# ---------------------------------------------------------------------------
# 3. PageRank — Influence Ranking
#    High PageRank = connected to many important nodes (financial hub / kingpin).
#    Run AFTER the projection exists.
# ---------------------------------------------------------------------------
PAGERANK = """
CALL gds.pageRank.stream('cyberhunters', {
  maxIterations: 20,
  dampingFactor: 0.85
})
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS node, score
WHERE node:Suspect OR node:Account
RETURN
  labels(node)[0]  AS nodeType,
  coalesce(node.name, node.account_number) AS identifier,
  node.case_id     AS case_id,
  round(score, 6)  AS pagerank_score
ORDER BY pagerank_score DESC
LIMIT 20
"""

# ---------------------------------------------------------------------------
# 4. Louvain Community Detection
#    Groups nodes into communities — reveals criminal gangs / rings.
#    communityId is the cluster label; nodes sharing an ID form one gang.
#    Run AFTER the projection exists.
# ---------------------------------------------------------------------------
LOUVAIN_COMMUNITY = """
CALL gds.louvain.stream('cyberhunters')
YIELD nodeId, communityId
WITH gds.util.asNode(nodeId) AS node, communityId
RETURN
  communityId,
  labels(node)[0]  AS nodeType,
  coalesce(node.name, node.number, node.account_number) AS identifier,
  node.case_id AS case_id
ORDER BY communityId ASC, nodeType ASC
"""

# ---------------------------------------------------------------------------
# 5. Cycle Detection — Money Laundering Rings
#    Finds closed loops in TRANSFERRED relationships (circular fund flow).
#    Pure Cypher — no GDS required.
#    A cycle means money left and returned to the same account.
# ---------------------------------------------------------------------------
CYCLE_DETECTION = """
MATCH path = (start:Account)-[:TRANSFERRED*2..6]->(start)
WHERE all(i IN range(1, length(path) - 1) WHERE NOT nodes(path)[i] IN nodes(path)[0..i])
  AND all(n IN nodes(path)[1..-1] WHERE start.account_number < n.account_number)
WITH [n IN nodes(path) | n.account_number] AS accounts,
     [r IN relationships(path) | r.amount] AS amounts,
     [r IN relationships(path) | r.case_id] AS cases,
     length(path) AS cycle_length
RETURN DISTINCT
  accounts,
  amounts,
  cases,
  cycle_length
ORDER BY cycle_length ASC
LIMIT 50
"""

# ---------------------------------------------------------------------------
# 6. Cross-Case Linking
#    Finds entities (Suspect / Phone / Account) that appear in more than one
#    distinct case_id — a key signal for cross-case criminal networks.
#    Pure Cypher — no GDS required.
# ---------------------------------------------------------------------------
CROSS_CASE_LINKING = """
// Suspects linked to multiple cases via MENTIONS
MATCH (c:Case)-[:MENTIONS]->(s:Suspect)
WITH s, collect(DISTINCT c.case_id) AS cases
WHERE size(cases) > 1
RETURN
  'Suspect'       AS entityType,
  s.name          AS identifier,
  cases           AS linked_cases,
  size(cases)     AS case_count
ORDER BY case_count DESC

UNION ALL

// Phones used across multiple cases
MATCH (p:Phone)<-[:OWNS]-(s:Suspect)
WITH p, collect(DISTINCT s.case_id) AS cases
WHERE size(cases) > 1
RETURN
  'Phone'         AS entityType,
  p.number        AS identifier,
  cases           AS linked_cases,
  size(cases)     AS case_count
ORDER BY case_count DESC

UNION ALL

// Accounts used across multiple cases
MATCH (a:Account)<-[:OWNS]-(s:Suspect)
WITH a, collect(DISTINCT s.case_id) AS cases
WHERE size(cases) > 1
RETURN
  'Account'       AS entityType,
  a.account_number AS identifier,
  cases           AS linked_cases,
  size(cases)     AS case_count
ORDER BY case_count DESC
"""

# ---------------------------------------------------------------------------
# Helper: drop the projection (run before re-projecting with fresh data)
# ---------------------------------------------------------------------------
DROP_PROJECTION = """
CALL gds.graph.drop('cyberhunters', false)
YIELD graphName
RETURN graphName
"""

# ---------------------------------------------------------------------------
# Convenience dict for iteration (e.g. in a future analytics endpoint)
# ---------------------------------------------------------------------------
ALL_QUERIES = {
    "projection":          PROJECTION,
    "betweenness":         BETWEENNESS_CENTRALITY,
    "pagerank":            PAGERANK,
    "louvain":             LOUVAIN_COMMUNITY,
    "cycle_detection":     CYCLE_DETECTION,
    "cross_case_linking":  CROSS_CASE_LINKING,
}

