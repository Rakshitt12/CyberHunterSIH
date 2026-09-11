"""
Stage 3 — Part A: Graph Construction

Provides MERGE-based write functions for every node and relationship type
in the Cyber Hunters schema.  Neo4j MERGE guarantees idempotency — re-running
the same case never creates duplicate nodes or edges.

Node types  : Suspect, Phone, Account, Location, Case
Relationship: CALLED, TRANSFERRED, OWNS, LOCATED_AT, MENTIONS

Proof-of-Source (case_id + source_sentence) is stored on the MENTIONS
relationship — not on the Suspect node.  Because a Suspect node is keyed
globally by name via MERGE, storing per-case evidence on the node would
cause any new case mentioning the same suspect to silently overwrite the
previous case's evidence.  The MENTIONS relationship is distinct per
(Case, Suspect) pair, so each case permanently retains its own source_sentence.
"""

import os
from contextlib import contextmanager
from typing import Optional
from neo4j import GraphDatabase, Driver, Session

# ---------------------------------------------------------------------------
# Connection management
# Credentials are read from environment variables so that nothing sensitive
# is ever hardcoded in source.  For local development, copy .env.example to
# .env and fill in the values — or let the defaults below apply.
# ---------------------------------------------------------------------------

_DEFAULT_URI  = os.environ.get("NEO4J_URI",      "bolt://localhost:7687")
_DEFAULT_USER = os.environ.get("NEO4J_USER",     "neo4j")
_DEFAULT_PASS = os.environ.get("NEO4J_PASSWORD", "cyberhunters123")


def get_driver(
    uri:      str = _DEFAULT_URI,
    user:     str = _DEFAULT_USER,
    password: str = _DEFAULT_PASS,
) -> Driver:
    """Return a verified Neo4j driver instance."""
    driver = GraphDatabase.driver(uri, auth=(user, password))
    driver.verify_connectivity()
    return driver


@contextmanager
def session_scope(driver: Driver):
    """Context manager that yields a session and closes it automatically."""
    with driver.session() as session:
        yield session


# ---------------------------------------------------------------------------
# Constraint / index bootstrap
# (Run once on first startup to ensure uniqueness constraints exist)
# ---------------------------------------------------------------------------

_CONSTRAINTS = [
    # Uniqueness constraints — Community Edition compatible
    "CREATE CONSTRAINT suspect_name_unique IF NOT EXISTS FOR (n:Suspect)  REQUIRE n.name IS UNIQUE",
    "CREATE CONSTRAINT phone_number_unique  IF NOT EXISTS FOR (n:Phone)    REQUIRE n.number IS UNIQUE",
    "CREATE CONSTRAINT account_num_unique   IF NOT EXISTS FOR (n:Account)  REQUIRE n.account_number IS UNIQUE",
    "CREATE CONSTRAINT location_name_unique IF NOT EXISTS FOR (n:Location) REQUIRE n.name IS UNIQUE",
    "CREATE CONSTRAINT case_id_unique       IF NOT EXISTS FOR (n:Case)     REQUIRE n.case_id IS UNIQUE",
]


def create_schema_constraints(driver: Driver) -> None:
    """Create uniqueness constraints for every node type (idempotent)."""
    with session_scope(driver) as session:
        for stmt in _CONSTRAINTS:
            session.run(stmt)


# ---------------------------------------------------------------------------
# Node MERGE helpers
# ---------------------------------------------------------------------------

def merge_case(session: Session, case_id: str, description: str = "") -> None:
    """MERGE a Case node keyed on case_id."""
    session.run(
        """
        MERGE (c:Case {case_id: $case_id})
        ON CREATE SET c.description = $description,
                      c.created_at  = datetime()
        ON MATCH  SET c.updated_at  = datetime()
        """,
        case_id=case_id,
        description=description,
    )


def merge_suspect(
    session: Session,
    name:  str,
    alias: Optional[str] = None,
) -> None:
    """
    MERGE a Suspect node keyed on name.

    Only identity-level properties are stored here: name and alias.
    Per-case evidence (case_id, source_sentence) is stored on the
    MENTIONS relationship via merge_mentions(), so that every case
    that mentions the same suspect retains its own independent
    Proof-of-Source without overwriting another case's evidence.
    """
    session.run(
        """
        MERGE (s:Suspect {name: $name})
        ON CREATE SET s.alias      = $alias,
                      s.created_at = datetime()
        ON MATCH  SET s.alias      = CASE WHEN $alias IS NOT NULL
                                          THEN $alias
                                          ELSE s.alias END,
                      s.updated_at = datetime()
        """,
        name=name,
        alias=alias,
    )


def merge_phone(session: Session, number: str) -> None:
    """MERGE a Phone node keyed on phone number."""
    session.run(
        """
        MERGE (p:Phone {number: $number})
        ON CREATE SET p.created_at = datetime()
        """,
        number=number,
    )


def merge_account(
    session: Session,
    account_number: str,
    bank_name:      str = "",
) -> None:
    """MERGE an Account node keyed on account_number."""
    session.run(
        """
        MERGE (a:Account {account_number: $account_number})
        ON CREATE SET a.bank_name  = $bank_name,
                      a.created_at = datetime()
        ON MATCH  SET a.bank_name  = $bank_name,
                      a.updated_at = datetime()
        """,
        account_number=account_number,
        bank_name=bank_name,
    )


def merge_location(session: Session, name: str, region: str = "") -> None:
    """MERGE a Location node keyed on name."""
    session.run(
        """
        MERGE (l:Location {name: $name})
        ON CREATE SET l.region     = $region,
                      l.created_at = datetime()
        ON MATCH  SET l.region     = $region,
                      l.updated_at = datetime()
        """,
        name=name,
        region=region,
    )


# ---------------------------------------------------------------------------
# Relationship MERGE helpers
# ---------------------------------------------------------------------------

def merge_called(
    session:   Session,
    caller:    str,
    callee:    str,
    timestamp: str,
    duration:  int,
    case_id:   str,
) -> None:
    """
    MERGE CALLED relationship between two Phone nodes.
    Keyed on (caller, callee, timestamp) — a single CDR record.
    """
    session.run(
        """
        MERGE (a:Phone {number: $caller})
        MERGE (b:Phone {number: $callee})
        MERGE (a)-[r:CALLED {timestamp: $timestamp}]->(b)
        ON CREATE SET r.duration = $duration,
                      r.case_id  = $case_id
        """,
        caller=caller,
        callee=callee,
        timestamp=timestamp,
        duration=duration,
        case_id=case_id,
    )


def merge_transferred(
    session:  Session,
    sender:   str,
    receiver: str,
    amount:   float,
    date:     str,
    case_id:  str,
) -> None:
    """
    MERGE TRANSFERRED relationship between two Account nodes.
    Keyed on (sender, receiver, date) — a single bank record.
    """
    session.run(
        """
        MERGE (s:Account {account_number: $sender})
        MERGE (r:Account {account_number: $receiver})
        MERGE (s)-[t:TRANSFERRED {date: $date, sender: $sender, receiver: $receiver}]->(r)
        ON CREATE SET t.amount  = $amount,
                      t.case_id = $case_id
        ON MATCH  SET t.amount  = $amount
        """,
        sender=sender,
        receiver=receiver,
        amount=amount,
        date=date,
        case_id=case_id,
    )


def merge_owns(
    session:  Session,
    suspect:  str,
    node_type: str,       # "Phone" or "Account"
    identifier: str,     # number / account_number
    case_id: str,
) -> None:
    """
    MERGE OWNS relationship from a Suspect to a Phone or Account.
    node_type must be "Phone" or "Account".
    """
    if node_type not in ("Phone", "Account"):
        raise ValueError("node_type must be 'Phone' or 'Account'")

    if node_type == "Phone":
        cypher = """
        MERGE (s:Suspect {name: $suspect})
        MERGE (p:Phone   {number: $identifier})
        MERGE (s)-[r:OWNS]->(p)
        ON CREATE SET r.case_id = $case_id
        """
    else:
        cypher = """
        MERGE (s:Suspect {name: $suspect})
        MERGE (a:Account {account_number: $identifier})
        MERGE (s)-[r:OWNS]->(a)
        ON CREATE SET r.case_id = $case_id
        """

    session.run(cypher, suspect=suspect, identifier=identifier, case_id=case_id)


def merge_located_at(
    session:  Session,
    suspect:  str,
    location: str,
    case_id:  str,
) -> None:
    """MERGE LOCATED_AT relationship from a Suspect to a Location."""
    session.run(
        """
        MERGE (s:Suspect  {name: $suspect})
        MERGE (l:Location {name: $location})
        MERGE (s)-[r:LOCATED_AT]->(l)
        ON CREATE SET r.case_id = $case_id
        """,
        suspect=suspect,
        location=location,
        case_id=case_id,
    )


def merge_mentions(
    session:         Session,
    case_id:         str,
    suspect:         str,
    source_sentence: str,
) -> None:
    """
    MERGE a MENTIONS relationship from a Case to a Suspect, storing
    source_sentence as a relationship property.

    The MERGE is keyed on the (Case, Suspect) node pair — so re-uploading
    the same case simply updates the existing relationship (idempotent),
    while a *different* case mentioning the same suspect produces a
    separate relationship with its own source_sentence intact.

    This is the canonical home for Proof-of-Source: the evidence is
    permanently linked to the specific case that produced it.
    """
    session.run(
        """
        MERGE (c:Case    {case_id: $case_id})
        MERGE (s:Suspect {name: $suspect})
        MERGE (c)-[r:MENTIONS]->(s)
        ON CREATE SET r.source_sentence = $source_sentence,
                      r.case_id         = $case_id,
                      r.created_at      = datetime()
        ON MATCH  SET r.source_sentence = $source_sentence,
                      r.updated_at      = datetime()
        """,
        case_id=case_id,
        suspect=suspect,
        source_sentence=source_sentence,
    )

