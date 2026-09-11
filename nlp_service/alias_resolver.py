"""
Stage 2 — Part B: Alias / Suspect Name Fuzzy Matching

Uses RapidFuzz to detect candidate aliases for a newly extracted suspect name
against the pool of already-known names in the graph.

NON-NEGOTIABLE constraint: this function NEVER merges automatically.
It returns ranked candidates above the threshold for human confirmation only.
"""

from typing import List, Dict, Any
from rapidfuzz import fuzz, process


# Default similarity threshold (0–100). Set deliberately conservative.
DEFAULT_THRESHOLD = 85


def find_alias_candidates(
    new_name: str,
    existing_names: List[str],
    threshold: int = DEFAULT_THRESHOLD,
) -> List[Dict[str, Any]]:
    """
    Return names from *existing_names* that are likely aliases of *new_name*,
    ranked by similarity score descending.

    Uses a combination of three RapidFuzz scorers and takes the maximum, so
    that both "Ramesh Patel" ↔ "Ramesh K. Patel" and abbreviation-style
    matches are fairly scored:
        - fuzz.WRatio        — handles token reordering and partial overlaps
        - fuzz.token_sort_ratio — normalises token order
        - fuzz.partial_ratio  — substring sensitivity (catches initials)

    Parameters
    ----------
    new_name : str
        The name extracted from the current FIR being processed.
    existing_names : list[str]
        All suspect names already present in the graph.
    threshold : int
        Minimum score (0–100) to include a candidate. Default: 85.

    Returns
    -------
    list[dict]  — sorted by score descending, empty if nothing meets threshold.
        Each dict contains:
            candidate    : str   — the matching name from existing_names
            score        : float — best similarity score (0–100)
            scorer_used  : str   — which scorer produced the best score
            action_required : str — always "HUMAN_CONFIRMATION_REQUIRED"

    IMPORTANT: The caller must present these candidates to an investigator
    and receive explicit confirmation before any graph merge is written.
    No automatic merge is performed here or anywhere downstream.
    """
    if not new_name or not existing_names:
        return []

    scorers = {
        "WRatio": fuzz.WRatio,
        "token_sort_ratio": fuzz.token_sort_ratio,
        "partial_ratio": fuzz.partial_ratio,
    }

    results: List[Dict[str, Any]] = []

    for existing in existing_names:
        best_score = 0.0
        best_scorer = ""
        len_shorter = min(len(new_name), len(existing))
        len_longer = max(len(new_name), len(existing))
        length_ratio = len_shorter / len_longer if len_longer > 0 else 0.0

        for scorer_name, scorer_fn in scorers.items():
            raw_score = scorer_fn(new_name, existing)

            # Length-ratio guard:
            # If the candidate relies on partial_ratio, only accept it if the shorter
            # string is at least 75% the length of the longer string.
            # This prevents false-positive substring matches where a short name is
            # accidentally contained in a much longer unrelated name.
            if scorer_name == "partial_ratio" and length_ratio < 0.75:
                continue

            if raw_score > best_score:
                best_score = raw_score
                best_scorer = scorer_name

        if best_score >= threshold:
            results.append({
                "candidate": existing,
                "score": round(best_score, 2),
                "scorer_used": best_scorer,
                "action_required": "HUMAN_CONFIRMATION_REQUIRED",
            })

    # Rank highest score first
    results.sort(key=lambda r: r["score"], reverse=True)
    return results

