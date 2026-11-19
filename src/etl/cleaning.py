"""Text cleaning rules for PersonaLens.

``clean_text`` is the single entry point. It must be used both in the ETL
(training data) and in the Streamlit app (user input) so that the model always
sees text cleaned the same way.

It does three things, in this order:

1. **Fix encoding artefacts** left by the original scrape, e.g. ``isnx92t`` →
   ``isn't``, ``x93quotex94`` → ``"quote"``, ``u200b`` → ``""``.

2. **Mask MBTI types** → ``<MBTI_TYPE>``. The Hugging Face configs mask only
   exact codes; we also catch

   * suffixed / glued:     ``INFPs``, ``infpness``, ``mrinfj``, ``u3000estp``
   * split by separators:  ``I.N.F.J``, ``E, N, F, P``, ``I(NTP``, ``int j``
   * wildcards:            ``INxJ``, ``xNTPs``, ``E_TJ``
   * partial codes:        ``NFPs``, ``NTJ``, ``STJ``, ``INF`` (upper-case only)
   * temperaments:         ``NT``, ``NF``, ``SJ``, ``SP`` (upper-case only)

3. **Mask other typology vocabulary** that gives the label away:

   * ``MBTI``, ``Myers-Briggs``, ``cognitive function(s)`` → ``<MBTI_TERM>``
   * cognitive functions ``Fi``, ``Ne``, ``NeTi``…          → ``<COGNITIVE_FUNCTION>``
   * Socionics codes ``LII``, ``EII``…                       → ``<TYPOLOGY_TERM>``
   * Enneagram ``4w5``, ``cp6w7`` and stackings ``sx/so``     → ``<TYPOLOGY_TERM>``

The placeholder names match the ones used by the Hugging Face
``psychometric_clean`` configuration; our rules mask the same vocabulary, so
the main training set (HF ``label_clean`` + this cleaning) needs no extra HF pass.
"""

from __future__ import annotations

import re
from typing import Callable

MASK = "<MBTI_TYPE>"
TERM_MASK = "<MBTI_TERM>"
FUNCTION_MASK = "<COGNITIVE_FUNCTION>"
TYPOLOGY_MASK = "<TYPOLOGY_TERM>"

MBTI_TYPES = (
    "INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP",
)

# --------------------------------------------------------------------------- #
# 1. Encoding artefacts
# --------------------------------------------------------------------------- #
# The original Kaggle text contains escaped Windows-1252 / Unicode characters
# without the backslash, glued to words: "isnx92t", "x93Naked", "âx80x9c".
# Not next to a digit, so "0x92" or "1280x960" are left alone.
_ESC = r"(?<![0-9])x{}(?![0-9])"
_ENCODING_FIXES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"âx80x9[89]"), "'"),
    (re.compile(r"âx80x9[cd]"), '"'),
    (re.compile(r"âx80x9[34]"), " - "),
    (re.compile(r"âx80¢"), " "),
    (re.compile(_ESC.format("9[12]")), "'"),
    (re.compile(_ESC.format("9[34]")), '"'),
    (re.compile(_ESC.format("9[67]")), " - "),
    (re.compile(_ESC.format("85")), "..."),
    (re.compile(_ESC.format("95")), " "),  # bullet point
    (re.compile(r"u200b"), ""),
    (re.compile(r"u3000"), " "),
]


def fix_encoding(text: str) -> str:
    # Repeat until stable: in "x97x97" the second code sits right after a digit
    # and is only fixable once the first one has been replaced.
    for _ in range(5):
        before = text
        for pattern, repl in _ENCODING_FIXES:
            text = pattern.sub(repl, text)
        if text == before:
            break
    return text


# --------------------------------------------------------------------------- #
# 2. MBTI type rules  (all → <MBTI_TYPE>)
# --------------------------------------------------------------------------- #
# Full four-letter type anywhere inside a word. No English word contains one.
# The leading \b makes the search start only at word starts (much faster).
_FULL_TYPE_IN_WORD = re.compile(r"\b\w*?(?:" + "|".join(MBTI_TYPES) + r")\w*", re.IGNORECASE)

# Letters split by up to two separator characters. Every match in the dataset
# was a real MBTI mention.
_SEP = r"[\s.,\-()/_*'\"]"
_SPACED_TYPE = re.compile(
    rf"(?<![A-Za-z])[IE]{_SEP}{{0,2}}[NS]{_SEP}{{0,2}}[TF]{_SEP}{{0,2}}[JP](?![A-Za-z])\.?",
    re.IGNORECASE,
)

# Wildcards: x or _ in place of 1–3 letters ("INxJ", "xNTPs", "E_TJ", "Ixxx", "xxFx").
_WILDCARD_CANDIDATE = re.compile(r"\b[IEX][NSX_][TFX_][JPX_]\w*", re.IGNORECASE)


def _is_wildcard_code(word: str) -> bool:
    """1–2 wildcards: always a type ("INxJ", "IxxJs"). 3 wildcards still reveal one
    letter ("Ixxx", "xxFx") but only count as a type when the word is just the code
    (+ plural "s"), so stretched words like "Exxxcellent" are left alone.
    "xxxx" reveals nothing and is never masked."""
    code = word[:4].upper()
    n_wild = code.count("X") + code.count("_")
    if 1 <= n_wild <= 2:
        return True
    return n_wild == 3 and word[4:].lower() in ("", "s")


def _mask_wildcard(m: re.Match) -> str:
    return MASK if _is_wildcard_code(m.group(0)) else m.group(0)


# Three-letter partial codes, upper-case only. EST, ENT, ESP and ISP are left
# out because they are common abbreviations (time zone, doctor, ...).
_PARTIAL_CODES = (
    "NTJ", "NTP", "NFJ", "NFP", "STJ", "STP", "SFJ", "SFP",
    "INF", "INT", "ENF", "ISF", "IST", "ESF",
    "INJ", "INP", "ENJ", "ENP", "ISJ", "ESJ",
    "ITJ", "ITP", "IFJ", "IFP", "ETJ", "ETP", "EFJ", "EFP",
)
_PARTIAL_TYPE = re.compile(r"\b(?:" + "|".join(_PARTIAL_CODES) + r")s?\b")

# Keirsey temperaments as codes, upper-case only ("NT", "NFs", "SJ").
_TEMPERAMENT = re.compile(r"\b(?:NT|NF|SJ|SP)s?\b")

# --------------------------------------------------------------------------- #
# 3. Other typology vocabulary
# --------------------------------------------------------------------------- #
# Also glued forms ("MBTIs", "funkymbti", "myersbrigg"), but never our own
# placeholders such as "<MBTI_TYPE>".
_MBTI_TERM = re.compile(
    r"(?<!<)\b\w*?mbti\w*|\bMyers[\s-]?Brigg\w*|\bcognitive functions?\b",
    re.IGNORECASE,
)

# Cognitive functions, case-sensitive, alone or glued ("Fi", "Ne-dom", "NeTi").
# "Wi-Fi", "Sci-Fi" and "Hi-Fi" are left alone.
_FUNCTION = r"(?:Ni|Ne|Si|Se|Ti|Te|Fi|Fe)"
_NOT_WIFI = r"(?<![Ww]i-)(?<![Ss]ci-)(?<![Hh]i-)"
# "Sis" (sister) and "Tis" ('tis) are ordinary words, not plural functions.
_COGNITIVE_FUNCTION = re.compile(rf"(?<!\w){_NOT_WIFI}(?!(?:Sis|Tis)\b){_FUNCTION}{{1,4}}s?\b")

# Socionics codes. SEE and LIE are ordinary shouted words, so they are masked
# only in the "SEE-Fi" style used when listing socionics types.
_SOCIONICS = re.compile(
    r"\b(?:ILE|SEI|ESE|LII|EIE|LSI|SLE|IEI|ILI|ESI|LSE|EII|IEE|SLI)s?\b|\b(?:SEE|LIE)(?=-)"
)

# Enneagram wings, also glued ("4w5", "cp6w7", "8w9f").
_ENNEAGRAM = re.compile(r"\b\w*?(?<![0-9])[1-9]w[1-9](?![0-9])\w*", re.IGNORECASE)

# Instinctual stackings ("sx/so", "sp/sx"); "so/so" is an ordinary phrase.
_STACKING = re.compile(r"\b(sp|sx|so)\s*/\s*(sp|sx|so)\b", re.IGNORECASE)


def _mask_stacking(m: re.Match) -> str:
    return m.group(0) if m.group(1).lower() == m.group(2).lower() else TYPOLOGY_MASK


# --------------------------------------------------------------------------- #
# Rule table – order matters
# --------------------------------------------------------------------------- #
Replacement = str | Callable[[re.Match], str]

RULES: list[tuple[str, re.Pattern, Replacement]] = [
    # MBTI types; whole-word rule first so "u3000estp" becomes one mask
    ("type_full", _FULL_TYPE_IN_WORD, MASK),
    ("type_spaced", _SPACED_TYPE, MASK),
    ("type_wildcard", _WILDCARD_CANDIDATE, _mask_wildcard),
    ("type_partial", _PARTIAL_TYPE, MASK),
    ("temperament", _TEMPERAMENT, MASK),
    # other typology vocabulary
    ("mbti_term", _MBTI_TERM, TERM_MASK),
    ("cognitive_function", _COGNITIVE_FUNCTION, FUNCTION_MASK),
    ("socionics", _SOCIONICS, TYPOLOGY_MASK),
    ("enneagram", _ENNEAGRAM, TYPOLOGY_MASK),
    ("stacking", _STACKING, _mask_stacking),
]

TYPE_RULES = ("type_full", "type_spaced", "type_wildcard")


def _apply(text: str, rule_names=None, collect: dict | None = None) -> str:
    for name, pattern, repl in RULES:
        if rule_names is not None and name not in rule_names:
            continue
        if collect is not None:
            for m in pattern.finditer(text):
                if callable(repl) and repl(m) == m.group(0):
                    continue  # callback decided it is not a mention
                collect.setdefault(name, []).append(m.group(0))
        text = pattern.sub(repl, text)
    return text


def clean_text(text: str) -> str:
    """Full cleaning: fix encoding, then mask all typology leakage."""
    return _apply(fix_encoding(text))


def mask_mbti(text: str) -> str:
    """Mask only full / split / wildcard MBTI types (kept for comparisons)."""
    return _apply(text, rule_names=TYPE_RULES)


def find_leaks(text: str) -> dict[str, list[str]]:
    """Return every leaking mention in ``text``, grouped by rule name.

    Rules are applied in the same order as ``clean_text`` and masked as we go,
    so each mention is counted once. After ``clean_text`` the result is empty.
    """
    found: dict[str, list[str]] = {}
    _apply(fix_encoding(text), collect=found)
    return found


def find_type_mentions(text: str) -> list[str]:
    """MBTI type mentions only (full, split and wildcard forms)."""
    found: dict[str, list[str]] = {}
    _apply(text, rule_names=TYPE_RULES, collect=found)
    return [m for name in TYPE_RULES for m in found.get(name, [])]


# --------------------------------------------------------------------------- #
# Post-level cleaning
# --------------------------------------------------------------------------- #
# A post made only of placeholders and punctuation carries no language signal.
_PLACEHOLDER = re.compile(r"<[A-Z_]+>")
_ALNUM = re.compile(r"[^\W_]")


def is_placeholder_only(post: str) -> bool:
    return _ALNUM.search(_PLACEHOLDER.sub("", post)) is None


def clean_posts(posts: list[str]) -> list[str]:
    """Clean every post, drop empty / placeholder-only ones and duplicates."""
    seen: set[str] = set()
    cleaned: list[str] = []
    for post in posts:
        post = re.sub(r"\s+", " ", clean_text(post)).strip()
        if post and not is_placeholder_only(post) and post not in seen:
            seen.add(post)
            cleaned.append(post)
    return cleaned
