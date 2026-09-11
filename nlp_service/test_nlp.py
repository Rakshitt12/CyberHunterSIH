"""
Stage 2 — End-to-end tests: NER extraction + alias resolution.

Realistic sample FIR sentence:

  "On 2026-03-04, the complainant Ramesh Patel reported that a suspect named
  Vikram Singh, reachable at +919823456780, threatened him and demanded
  Rs. 3,50,000 to be deposited into a bank account; the incident occurred
  near Connaught Place, New Delhi."
"""

import sys
import os

# Allow running directly from nlp_service/ or from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from extractor import extract_entities
from alias_resolver import find_alias_candidates


# ---------------------------------------------------------------------------
# Shared realistic FIR text used across multiple tests
# ---------------------------------------------------------------------------
SAMPLE_FIR = (
    "On 2026-03-04, the complainant Ramesh Patel reported that a suspect named "
    "Vikram Singh, reachable at +919823456780, threatened him and demanded "
    "Rs. 3,50,000 to be deposited into a bank account; the incident occurred "
    "near Connaught Place, New Delhi."
)

# Existing suspects already in the graph
EXISTING_SUSPECTS = [
    "R.K. Patel",        # Deliberately similar (same surname, abbreviated first)
    "Vikram S. Singh",   # Very close to extracted "Vikram Singh"
    "Ajay Kumar",        # Clearly unrelated
    "Priya Sharma",      # Clearly unrelated
]


# ---------------------------------------------------------------------------
# Part A — NER tests
# ---------------------------------------------------------------------------

def test_extract_entities_returns_list():
    entities = extract_entities(SAMPLE_FIR)
    assert isinstance(entities, list), "extract_entities must return a list"


def test_each_entity_has_required_keys():
    entities = extract_entities(SAMPLE_FIR)
    required_keys = {"text", "label", "source_sentence", "start_char", "end_char", "confidence"}
    for ent in entities:
        missing = required_keys - set(ent.keys())
        assert not missing, f"Entity missing keys: {missing} — {ent}"


def test_source_sentence_never_empty():
    """Proof-of-Source guarantee: every entity must have a non-empty source sentence."""
    entities = extract_entities(SAMPLE_FIR)
    for ent in entities:
        assert ent["source_sentence"].strip(), (
            f"source_sentence is empty for entity: {ent}"
        )


def test_person_entities_found():
    entities = extract_entities(SAMPLE_FIR)
    persons = [e["text"] for e in entities if e["label"] == "PERSON"]
    print(f"\n  PERSON entities: {persons}")
    # At least one of the two names must be found
    assert any(
        "Ramesh" in p or "Patel" in p or "Vikram" in p or "Singh" in p
        for p in persons
    ), f"Expected person names not found. Got: {persons}"


def test_phone_entity_found():
    entities = extract_entities(SAMPLE_FIR)
    phones = [e["text"] for e in entities if e["label"] == "PHONE"]
    print(f"\n  PHONE entities: {phones}")
    assert any("9823456780" in p for p in phones), (
        f"Expected phone +919823456780 not found. Got: {phones}"
    )


def test_amount_entity_found():
    entities = extract_entities(SAMPLE_FIR)
    amounts = [e["text"] for e in entities if e["label"] == "AMOUNT"]
    print(f"\n  AMOUNT entities: {amounts}")
    assert len(amounts) > 0, f"Expected currency amount not found. Got: {amounts}"


def test_gpe_entity_found():
    entities = extract_entities(SAMPLE_FIR)
    gpes = [e["text"] for e in entities if e["label"] == "GPE"]
    print(f"\n  GPE entities: {gpes}")
    assert any(
        "Delhi" in g or "Connaught" in g
        for g in gpes
    ), f"Expected GPE not found. Got: {gpes}"


def test_source_sentence_contains_entity_text():
    """Every source_sentence must actually contain the entity text."""
    entities = extract_entities(SAMPLE_FIR)
    for ent in entities:
        assert ent["text"] in ent["source_sentence"], (
            f"source_sentence does not contain entity text.\n"
            f"  entity:   {ent['text']!r}\n"
            f"  sentence: {ent['source_sentence']!r}"
        )


def test_empty_text_returns_empty_list():
    assert extract_entities("") == []
    assert extract_entities("   ") == []


def test_multi_sentence_source_tracking():
    """Entities from different sentences must reference their own sentence."""
    multi = (
        "Suspect Arjun Mehta was seen in Mumbai on Monday. "
        "His associate Priya Desai was traced to Pune via call records."
    )
    entities = extract_entities(multi)
    persons = {e["text"]: e["source_sentence"] for e in entities if e["label"] == "PERSON"}
    print(f"\n  Multi-sentence persons: {persons}")
    for name, sent in persons.items():
        assert name in sent, (
            f"Person {name!r} not found in its source_sentence: {sent!r}"
        )


# ---------------------------------------------------------------------------
# Part B — Alias resolution tests
# ---------------------------------------------------------------------------

def test_similar_name_flagged():
    """
    'Vikram Singh' vs 'Vikram S. Singh' — should be flagged as a candidate.
    """
    candidates = find_alias_candidates("Vikram Singh", EXISTING_SUSPECTS)
    candidate_names = [c["candidate"] for c in candidates]
    print(f"\n  Alias candidates for 'Vikram Singh': {candidates}")
    assert "Vikram S. Singh" in candidate_names, (
        f"'Vikram S. Singh' should be flagged as candidate. Got: {candidate_names}"
    )


def test_unrelated_name_not_flagged():
    """
    'Ramesh Patel' vs 'Ajay Kumar' — score should be below threshold.
    """
    candidates = find_alias_candidates("Ramesh Patel", EXISTING_SUSPECTS)
    candidate_names = [c["candidate"] for c in candidates]
    print(f"\n  Alias candidates for 'Ramesh Patel': {candidates}")
    assert "Ajay Kumar" not in candidate_names, (
        f"'Ajay Kumar' incorrectly flagged as alias of 'Ramesh Patel'. Got: {candidate_names}"
    )
    assert "Priya Sharma" not in candidate_names, (
        f"'Priya Sharma' incorrectly flagged as alias of 'Ramesh Patel'. Got: {candidate_names}"
    )


def test_action_required_always_set():
    """Every candidate result must mandate human confirmation."""
    candidates = find_alias_candidates("Vikram Singh", EXISTING_SUSPECTS)
    for c in candidates:
        assert c["action_required"] == "HUMAN_CONFIRMATION_REQUIRED", (
            f"action_required not set correctly: {c}"
        )


def test_results_sorted_by_score_descending():
    candidates = find_alias_candidates("Vikram Singh", EXISTING_SUSPECTS)
    scores = [c["score"] for c in candidates]
    assert scores == sorted(scores, reverse=True), (
        f"Candidates not sorted by score descending: {scores}"
    )


def test_empty_existing_names_returns_empty():
    assert find_alias_candidates("Ramesh Patel", []) == []


def test_empty_new_name_returns_empty():
    assert find_alias_candidates("", EXISTING_SUSPECTS) == []


def test_score_in_valid_range():
    candidates = find_alias_candidates("Vikram Singh", EXISTING_SUSPECTS, threshold=0)
    for c in candidates:
        assert 0 <= c["score"] <= 100, f"Score out of range: {c['score']}"


# ---------------------------------------------------------------------------
# End-to-end narrative test
# ---------------------------------------------------------------------------

def test_end_to_end():
    """
    Full pipeline: extract names from sample FIR → run alias check on each
    extracted PERSON against known suspects → print a readable report.
    """
    print("\n" + "=" * 60)
    print("END-TO-END: NER + Alias Resolution")
    print("=" * 60)
    print(f"\nFIR TEXT:\n  {SAMPLE_FIR}\n")

    entities = extract_entities(SAMPLE_FIR)

    print("EXTRACTED ENTITIES:")
    for e in entities:
        print(f"  [{e['label']}] {e['text']!r}  |  confidence={e['confidence']}")
        print(f"         source_sentence: {e['source_sentence']!r}")

    persons = [e["text"] for e in entities if e["label"] == "PERSON"]
    assert len(persons) > 0, "No PERSON entities extracted — cannot run alias check"

    print("\nALIAS RESOLUTION:")
    print(f"  Existing suspects in graph: {EXISTING_SUSPECTS}")
    for name in persons:
        candidates = find_alias_candidates(name, EXISTING_SUSPECTS)
        if candidates:
            print(f"\n  [ALIAS FOUND] '{name}' has {len(candidates)} candidate alias(es) requiring human review:")
            for c in candidates:
                print(f"      -> '{c['candidate']}'  score={c['score']}  via {c['scorer_used']}")
                print(f"         ACTION: {c['action_required']}")
        else:
            print(f"\n  [NEW SUSPECT] '{name}' -- no alias candidates above threshold")

    print("\n" + "=" * 60)

