"""Text cleaning rules that remove MBTI label leakage.

The Hugging Face ``label_clean`` configuration masks only *exact* MBTI codes.
Our EDA showed that many codes survive in other forms, e.g.

* suffixed:            ``INFPs``, ``INTJ's``, ``infpness``, ``entpish``
* glued into words:    ``mrinfj``, ``femaleinfj``, ``u3000estp``
* spelled with breaks: ``I.N.F.J``, ``E-N-F-J``, ``E N F P``
* wildcard forms:      ``INxJ``, ``xNTP``, ``ExFP``

Any word that contains one of these is replaced as a whole by ``<MBTI_TYPE>``.

The same ``mask_mbti`` function must be applied to user input in the
Streamlit app, so training data and live predictions are cleaned identically.
"""

from __future__ import annotations

import re

MASK = "<MBTI_TYPE>"

MBTI_TYPES = (
    "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
)

# 1) Full four-letter type anywhere inside a word ("INFPs", "mrinfj", "infpness").
#    No ordinary English word contains one of the 16 codes, so this is safe.
_FULL_TYPE_IN_WORD = re.compile(
    r"\w*(?:" + "|".join(MBTI_TYPES) + r")\w*",
    re.IGNORECASE,
)

# 2) Letters split by separators ("I.N.F.J", "E-N-F-J", "E, N, F, P", "I(NTP", "int j").
#    Up to two separator characters between letters; must not touch other letters.
#    Checked against the full dataset: every match was a real MBTI mention.
_SEP = r"[\s.,\-()/_*'\"]"
_SPACED_TYPE = re.compile(
    rf"(?<![A-Za-z])[IE]{_SEP}{{0,2}}[NS]{_SEP}{{0,2}}[TF]{_SEP}{{0,2}}[JP](?![A-Za-z])\.?",
    re.IGNORECASE,
)

# 3) Wildcard forms at the start of a word ("INxJ", "xNTP", "ExFP", "IxxJs").
#    Checked by _is_wildcard_code so that "xxxx" etc. are left alone.
_WILDCARD_CANDIDATE = re.compile(r"\b[IEX][NSX][TFX][JPX]\w*", re.IGNORECASE)


def _is_wildcard_code(word: str) -> bool:
    """True if the first four letters form an MBTI code with 1–2 'x' wildcards."""
    code = word[:4].upper()
    n_x = code.count("X")
    return 1 <= n_x <= 2


def _mask_wildcard(match: re.Match) -> str:
    word = match.group(0)
    return MASK if _is_wildcard_code(word) else word


def mask_mbti(text: str) -> str:
    """Replace every MBTI type mention in ``text`` with ``<MBTI_TYPE>``."""
    # Whole-word rule first, so "u3000estp" becomes one mask, not "u3000<MBTI_TYPE>".
    text = _FULL_TYPE_IN_WORD.sub(MASK, text)
    text = _SPACED_TYPE.sub(MASK, text)
    text = _WILDCARD_CANDIDATE.sub(_mask_wildcard, text)
    return text


def find_type_mentions(text: str) -> list[str]:
    """Return MBTI mentions still present in ``text`` (used for auditing).

    Uses the same rules as ``mask_mbti`` so that, after masking, the result
    should be empty.
    """
    # Apply the rules in the same order as mask_mbti, masking as we go,
    # so a mention is counted once even if several rules would match it.
    found = _FULL_TYPE_IN_WORD.findall(text)
    text = _FULL_TYPE_IN_WORD.sub(MASK, text)
    found += _SPACED_TYPE.findall(text)
    text = _SPACED_TYPE.sub(MASK, text)
    found += [w for w in _WILDCARD_CANDIDATE.findall(text) if _is_wildcard_code(w)]
    return found


def clean_posts(posts: list[str]) -> list[str]:
    """Mask every post, drop empty ones and remove exact duplicates (order kept)."""
    seen: set[str] = set()
    cleaned: list[str] = []
    for post in posts:
        post = mask_mbti(post).strip()
        if post and post not in seen:
            seen.add(post)
            cleaned.append(post)
    return cleaned
