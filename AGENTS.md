# Cyber Hunters — AI-Powered Criminal Network Analysis System

## Project Context
SIH 2026, Problem Statement SIH26189, Theme: Blockchain & Cybersecurity.
Police investigations have fragmented data — FIR text, call records (CDR), and
bank transactions — currently cross-referenced manually. This system unifies
them into one connected graph and surfaces hidden patterns automatically.

## Tech Stack (fixed — do not substitute without asking)
- Frontend: Next.js, React, Tailwind CSS, Shadcn UI
- Backend: Python, FastAPI, REST APIs
- Graph database: Neo4j (Community Edition + Graph Data Science library)
- Auxiliary storage: PostgreSQL / Supabase
- NLP: spaCy (NER), RapidFuzz (fuzzy alias matching)
- Deployment: Docker Compose, fully open-source, no paid API dependencies

## Graph Schema (fixed)
- Node types: Suspect, Phone, Account, Location, Case
- Relationship types: CALLED, TRANSFERRED, OWNS, LOCATED_AT, MENTIONS
- Every Suspect node must store: case_id, source_sentence

## Pipeline Stages (build in this order, one at a time)
1. Ingestion — FIR text/PDF + CDR/bank CSV upload, tagged with case_id
2. Entity extraction — spaCy NER pulls people/phones/locations/amounts;
   every entity keeps its source sentence
3. Alias resolution — RapidFuzz flags candidate matches; NEVER auto-merge
4. Graph construction — write to Neo4j using MERGE (never CREATE), so
   re-uploading a case never creates duplicate nodes
5. Graph analytics — Neo4j GDS only, no custom-trained models: betweenness
   centrality + PageRank (kingpin detection), Louvain (community detection),
   cycle detection (money-laundering rings), cross-case-linking query
6. Investigator interface — Cytoscape.js graph, search/filter, evidence-
   linking panel, optional AI chatbot layer

## Non-Negotiable Constraints
- Every extracted entity MUST retain a link to its source sentence/record —
  this is the "Proof-of-Source" / evidence-linking requirement.
- Alias/entity merges are NEVER automatic — always require explicit human
  confirmation before writing a merge to the graph.
- If a chatbot feature is built, it must translate questions into real graph
  queries and report only real query results — never generate an answer from
  general knowledge. Grounding is a hard requirement, not a nice-to-have.
- Use MERGE, not CREATE, for all graph writes to avoid duplicate nodes.

## Working Style
- Build one pipeline stage at a time. Do not scaffold future stages early.
- After each stage, run the verification yourself using your terminal access and report the result. Verification means actually running the check yourself and confirming real output — never handing testing steps back to me as manual instructions (e.g. 'open X and paste this query'), unless the check genuinely requires a GUI or my visual judgment that you cannot perform yourself.
- If something is ambiguous, ask rather than guessing a default.

