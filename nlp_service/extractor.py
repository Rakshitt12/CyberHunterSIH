"""
Stage 2 — Part A: Named Entity Recognition (NER) with Proof-of-Source

Extracts PERSON, GPE, PHONE, and AMOUNT entities from FIR text using spaCy's
en_core_web_sm model with a custom EntityRuler for Indian phone numbers and
currency amounts.

Every entity returned retains its exact source sentence — this is the
Proof-of-Source required for evidence linking in Stage 4 (graph construction).
"""

import re
import spacy
from spacy.language import Language
from spacy.pipeline import EntityRuler
from typing import List, Dict, Any


# ---------------------------------------------------------------------------
# EntityRuler patterns for Indian phone numbers and currency amounts.
# These are added BEFORE the NER component so the model can see them.
# ---------------------------------------------------------------------------

PHONE_PATTERNS = [
    # +91XXXXXXXXXX  or  0XXXXXXXXXX  or  plain 10-digit
    {"label": "PHONE", "pattern": [{"TEXT": {"REGEX": r"^\+?91?[-\s]?\d{10}$"}}]},
    {"label": "PHONE", "pattern": [{"TEXT": {"REGEX": r"^0\d{10}$"}}]},
    {"label": "PHONE", "pattern": [{"TEXT": {"REGEX": r"^\d{10}$"}}]},
    # hyphenated / spaced formats: +91-98765-43210
    {
        "label": "PHONE",
        "pattern": [
            {"TEXT": {"REGEX": r"^\+?91$"}},
            {"TEXT": {"REGEX": r"^[\-\s]?$"}, "OP": "?"},
            {"TEXT": {"REGEX": r"^\d{5}$"}},
            {"TEXT": {"REGEX": r"^[\-\s]?$"}, "OP": "?"},
            {"TEXT": {"REGEX": r"^\d{5}$"}},
        ],
    },
]

AMOUNT_PATTERNS = [
    # spaCy splits "Rs." → ["Rs", "."]  so we need a 3-token pattern:
    #   Rs  .  3,50,000
    {"label": "AMOUNT", "pattern": [
        {"LOWER": "rs"},
        {"TEXT": "."},
        {"TEXT": {"REGEX": r"^\d[\d,]+$"}},
    ]},
    # INR 12,00,000  or  ₹ 5000  (single-token currency symbol)
    {"label": "AMOUNT", "pattern": [
        {"TEXT": {"REGEX": r"^(?:INR|₹)$"}},
        {"TEXT": {"REGEX": r"^\d[\d,]+$"}},
    ]},
    # 2,50,000 rupees
    {"label": "AMOUNT", "pattern": [
        {"TEXT": {"REGEX": r"^\d[\d,]+$"}},
        {"LOWER": {"IN": ["rupees", "rs", "inr"]}},
    ]},
]

COMMON_LOCATIONS = [
    # Major Cities & Metro Areas
    "Mumbai", "Delhi", "New Delhi", "Bengaluru", "Bangalore", "Hyderabad",
    "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow",
    "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna",
    "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut",
    "Rajkot", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar",
    "Navi Mumbai", "Allahabad", "Prayagraj", "Ranchi", "Howrah", "Coimbatore",
    "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota",
    "Guwahati", "Chandigarh", "Solapur", "Noida", "Gurgaon", "Gurugram",
    # Mumbai Areas & Localities
    "Bandra", "Andheri", "Colaba", "Dadar", "Kurla", "Borivali", "Juhu",
    "Worli", "Malad", "Ghatkopar", "Powai", "Chembur", "Dharavi", "Byculla",
    "Parel", "Fort", "Marine Lines", "Nariman Point", "Lokhandwala", "Versova",
    "Goregaon", "Kandivali", "Dahisar", "Mulund", "Bhandup", "Vikhroli", "Kalyan",
    "Dombivli", "Vashi", "Nerul", "Belapur", "Panvel",
    # Delhi Areas & Localities
    "Connaught Place", "Karol Bagh", "Rohini", "Saket", "Dwarka", "Lajpat Nagar",
    "Chanakyapuri", "Hauz Khas", "Janakpuri", "Pitampura", "Vasant Kunj",
    "Chandni Chowk", "Paharganj", "Civil Lines", "Kashmere Gate", "Mayur Vihar",
    "Shahdara", "Laxmi Nagar", "Preet Vihar", "Paschim Vihar", "Punjabi Bagh",
    "Rajouri Garden", "Tilak Nagar", "Nehru Place", "South Extension",
    "Greater Kailash", "Defense Colony", "Safdarjung", "Okhla", "Indirapuram",
    # States & Union Territories
    "Maharashtra", "Karnataka", "Tamil Nadu", "Uttar Pradesh", "Gujarat",
    "Rajasthan", "West Bengal", "Punjab", "Haryana", "Bihar", "Madhya Pradesh",
    "Kerala", "Goa", "Assam", "Odisha", "Telangana", "Andhra Pradesh"
]

GPE_PATTERNS = []
for loc in COMMON_LOCATIONS:
    tokens = loc.split()
    if len(tokens) == 1:
        GPE_PATTERNS.append({"label": "GPE", "pattern": [{"LOWER": tokens[0].lower()}]})
    else:
        GPE_PATTERNS.append({"label": "GPE", "pattern": [{"LOWER": t.lower()} for t in tokens]})

GPE_PATTERNS.extend([
    {"label": "GPE", "pattern": [{"IS_TITLE": True}, {"LOWER": {"IN": ["nagar", "vihar", "puram", "ganj", "bagh", "chowk", "road", "marg", "colony", "enclave", "place"]}}]},
    {"label": "GPE", "pattern": [{"LOWER": {"IN": ["sector", "phase"]}}, {"TEXT": {"REGEX": r"^\d+[A-Za-z]?$"}}]},
])

KNOWN_LOCATIONS_LOWER = {loc.lower() for loc in COMMON_LOCATIONS}

TITLE_PREFIX_PATTERN = re.compile(
    r"^(?:complainant|victim|informant|accused|suspect|perpetrator)\b[\s:,-]*",
    re.IGNORECASE,
)
COMPLAINANT_KEYWORDS = {"complainant", "victim", "informant"}
SUSPECT_KEYWORDS = {"accused", "suspect", "perpetrator"}
COMMON_SURNAMES = {
    "kumar", "singh", "lal", "sharma", "verma", "gupta", "patel", "yadav",
    "prasad", "devi", "chand", "ram", "das", "nath", "choudhary", "shukla",
    "mishra", "tiwari", "pandey", "reddy", "rao", "nair", "pillai", "menon"
}


def trim_role_prefix(text: str) -> tuple:
    """
    Consolidated helper to strip leading role title keywords
    (e.g. 'Complainant Mohan Lal' -> 'Mohan Lal', 'Victim Ramesh' -> 'Ramesh').
    Returns (clean_name, detected_role_or_None).
    """
    m = re.match(
        r"^(complainant|victim|informant|accused|suspect|perpetrator)\b[\s:,-]*(.*)$",
        text.strip(),
        re.IGNORECASE,
    )
    if m:
        kw = m.group(1).lower()
        role = "complainant" if kw in COMPLAINANT_KEYWORDS else "suspect"
        clean_name = m.group(2).strip()
        return clean_name, role
    return text.strip(), None


def should_merge_adjacent_persons(curr_text: str, nxt_text: str) -> bool:
    """
    Guards against incorrectly merging distinct people who sit next to each other
    with no punctuation (e.g. 'Ramesh Singh Vikram Patel were both present').
    Only merges when tokens represent fragmented parts of a single name (e.g. 'Victim Ramesh' + 'Kumar').
    """
    curr_clean, _ = trim_role_prefix(curr_text)
    nxt_clean, _ = trim_role_prefix(nxt_text)

    curr_words = curr_clean.split()
    nxt_words = nxt_clean.split()

    if not curr_words or not nxt_words:
        return False

    # If both entities already have 2+ words (e.g. "Ramesh Singh" and "Vikram Patel"),
    # they are distinct full names and must NOT be merged.
    if len(curr_words) >= 2 and len(nxt_words) >= 2:
        return False

    # If current entity has 2+ words and next is 1 word, only merge if next is a recognized surname suffix
    if len(curr_words) >= 2 and len(nxt_words) == 1:
        if nxt_words[0].lower() not in COMMON_SURNAMES:
            return False

    # Standard Indian person name has at most 3 words (First Middle Last)
    if len(curr_words) + len(nxt_words) > 3:
        return False

    return True


def _build_nlp() -> Language:
    """
    Load en_core_web_sm and inject a custom EntityRuler for phones, amounts, and locations.
    The ruler runs BEFORE the statistical NER so its labels are not overwritten.
    """
    nlp = spacy.load("en_core_web_sm")

    ruler = nlp.add_pipe("entity_ruler", before="ner", config={"overwrite_ents": False})
    ruler.add_patterns(PHONE_PATTERNS + AMOUNT_PATTERNS + GPE_PATTERNS)

    return nlp


# Singleton – build once, reuse across calls
_NLP: Language | None = None


def _get_nlp() -> Language:
    global _NLP
    if _NLP is None:
        _NLP = _build_nlp()
    return _NLP


# ---------------------------------------------------------------------------
# Core extraction function
# ---------------------------------------------------------------------------

SUPPORTED_LABELS = {"PERSON", "GPE", "PHONE", "AMOUNT"}

# Fallback regex for bare Indian phone numbers not caught by the EntityRuler
# (e.g. when the number is tightly joined to surrounding punctuation in text)
_PHONE_RE = re.compile(
    r"(?<!\d)(?:\+91[\s\-]?)?[6-9]\d{9}(?!\d)"
)


def extract_entities(text: str) -> List[Dict[str, Any]]:
    """
    Extract PERSON, GPE, PHONE, and AMOUNT entities from *text*.

    Each result dict contains:
        - text:          the raw entity string
        - label:         entity type (PERSON | GPE | PHONE | AMOUNT)
        - source_sentence: the exact sentence the entity was found in
        - start_char:    character offset start in *text*
        - end_char:      character offset end in *text*
        - confidence:    "rule" (EntityRuler match) or "model" (spaCy NER)

    Proof-of-Source guarantee: source_sentence is always populated.
    """
    if not text or not text.strip():
        return []

    nlp = _get_nlp()
    doc = nlp(text)

    sents = list(doc.sents)

    def _sentence_for_offset(start: int, end: int | None = None) -> str:
        """
        Return the sentence text that best covers the span [start, end).
        If the span crosses a sentence boundary (rare: spaCy splits at 'Rs.'),
        merge the two adjacent sentences so the entity text is always present
        in the returned source_sentence.
        """
        containing = None
        for sent in sents:
            if sent.start_char <= start < sent.end_char:
                containing = sent
                break
        if containing is None:
            return text.strip()

        # If end is beyond this sentence, include the next sentence too
        if end is not None and end > containing.end_char:
            idx = sents.index(containing)
            if idx + 1 < len(sents):
                return (containing.text + " " + sents[idx + 1].text).strip()

        return containing.text.strip()

    entities: List[Dict[str, Any]] = []
    seen: set = set()  # (text_lower, label, source_sentence) dedup key

    # --- spaCy entities (both EntityRuler and NER) ---
    for ent in doc.ents:
        if ent.label_ not in SUPPORTED_LABELS:
            continue

        label = ent.label_
        raw = ent.text.strip()
        if not raw:
            continue

        source_sent = _sentence_for_offset(ent.start_char, ent.end_char)
        key = (raw.lower(), label, source_sent)
        if key in seen:
            continue
        seen.add(key)

        # Determine confidence source
        # EntityRuler sets ent.kb_id_ to "" and has no score;
        # we distinguish by checking if it matched a pattern vs model
        confidence = "rule" if ent.ent_id_ == "" and label in {"PHONE", "AMOUNT"} else "model"

        entities.append({
            "text": raw,
            "label": label,
            "source_sentence": source_sent,
            "start_char": ent.start_char,
            "end_char": ent.end_char,
            "confidence": confidence,
        })

    # --- Regex fallback for Indian phone numbers not caught above ---
    for match in _PHONE_RE.finditer(text):
        raw = match.group().strip()
        source_sent = _sentence_for_offset(match.start())
        key = (raw.lower(), "PHONE", source_sent)
        if key in seen:
            continue
        seen.add(key)
        entities.append({
            "text": raw,
            "label": "PHONE",
            "source_sentence": source_sent,
            "start_char": match.start(),
            "end_char": match.end(),
            "confidence": "regex",
        })

    # --- Regex fallback for Indian currency amounts not caught by EntityRuler ---
    _AMOUNT_RE = re.compile(
        r"(?:Rs\.?\s*|INR\s*|₹\s*)\d[\d,]+",
        re.IGNORECASE,
    )
    for match in _AMOUNT_RE.finditer(text):
        raw = match.group().strip()
        source_sent = _sentence_for_offset(match.start(), match.end())
        key = (raw.lower(), "AMOUNT", source_sent)
        if key in seen:
            continue
        seen.add(key)
        entities.append({
            "text": raw,
            "label": "AMOUNT",
            "source_sentence": source_sent,
            "start_char": match.start(),
            "end_char": match.end(),
            "confidence": "regex",
        })

    # Sort by character position
    entities.sort(key=lambda e: e["start_char"])

    # --- Consolidation & Post-processing Pass ---
    # 1. Relabel any PERSON entity whose text is in KNOWN_LOCATIONS_LOWER as GPE
    for ent in entities:
        if ent["label"] == "PERSON" and ent["text"].strip().lower() in KNOWN_LOCATIONS_LOWER:
            ent["label"] = "GPE"

    # 2. Merge adjacent PERSON entities ONLY if they form parts of a single name
    merged_entities: List[Dict[str, Any]] = []
    i = 0
    while i < len(entities):
        curr = dict(entities[i])
        if curr["label"] == "PERSON":
            while i + 1 < len(entities) and entities[i + 1]["label"] == "PERSON":
                nxt = entities[i + 1]
                between = text[curr["end_char"]:nxt["start_char"]]
                if between.strip() == "" and should_merge_adjacent_persons(curr["text"], nxt["text"]):
                    curr["text"] = text[curr["start_char"]:nxt["end_char"]].strip()
                    curr["end_char"] = nxt["end_char"]
                    i += 1
                else:
                    break
        merged_entities.append(curr)
        i += 1

    # 3. Strip role keywords from PERSON entity text and assign role metadata
    cleaned_entities: List[Dict[str, Any]] = []
    for ent in merged_entities:
        if ent["label"] == "PERSON":
            if ent["text"].strip().lower() in KNOWN_LOCATIONS_LOWER:
                ent["label"] = "GPE"
                cleaned_entities.append(ent)
                continue

            clean_name, detected_role = trim_role_prefix(ent["text"])
            if detected_role:
                ent["role"] = detected_role
            if clean_name:
                ent["text"] = clean_name

        cleaned_entities.append(ent)

    return cleaned_entities

