import pytest

from src.etl.cleaning import (
    FUNCTION_MASK,
    MASK,
    TERM_MASK,
    TYPOLOGY_MASK,
    clean_posts,
    clean_text,
    find_leaks,
    find_type_mentions,
    fix_encoding,
    is_placeholder_only,
    mask_mbti,
)


# --------------------------------------------------------------------------- #
# MBTI types (mask_mbti = full / split / wildcard types only)
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "text, expected",
    [
        # exact and case variants
        ("I am an INFJ", f"I am an {MASK}"),
        ("i am an infj", f"i am an {MASK}"),
        # suffixed forms (missed by the HF label_clean config)
        ("All INFPs are kind", f"All {MASK} are kind"),
        ("my INTJ's plan", f"my {MASK}'s plan"),
        ("peak infpness", f"peak {MASK}"),
        ("that is so entpish", f"that is so {MASK}"),
        # glued into usernames / words
        ("thanks mrinfj!", f"thanks {MASK}!"),
        ("u3000estp here", f"{MASK} here"),
        # spelled with separators
        ("I.N.F.J. here", f"{MASK} here"),
        ("an E-N-F-J", f"an {MASK}"),
        ("type E N F P now", f"type {MASK} now"),
        ("E, N, F, P", MASK),
        ("I(NTP) maybe", f"{MASK}) maybe"),
        ("i n t p", MASK),
        ("an int j", f"an {MASK}"),
        ("I*S*F*J", MASK),
        # wildcard forms
        ("probably INxJ", f"probably {MASK}"),
        ("xNTPs unite", f"{MASK} unite"),
        ("an IxxJ maybe", f"an {MASK} maybe"),
        ("So E_TJ!", f"So {MASK}!"),
        # three wildcards still reveal one letter
        ("many Ixxx friends", f"many {MASK} friends"),
        ("Michael xxFx", f"Michael {MASK}"),
        ("made for xxxJ's", f"made for {MASK}'s"),
        ("all the XXXJs?", f"all the {MASK}?"),
        ("my E___ sister", f"my {MASK} sister"),
        # existing masks are kept
        (f"{MASK} and {MASK}", f"{MASK} and {MASK}"),
    ],
)
def test_masks_mbti_types(text, expected):
    assert mask_mbti(text) == expected
    assert find_type_mentions(mask_mbti(text)) == []
    assert find_leaks(clean_text(text)) == {}


# --------------------------------------------------------------------------- #
# Partial codes, temperaments and other typology vocabulary (clean_text)
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "text, expected",
    [
        # partial three-letter codes
        ("NFPs are dreamers", f"{MASK} are dreamers"),
        ("not an NTJ tyrant", f"not an {MASK} tyrant"),
        ("most STJ people", f"most {MASK} people"),
        # temperaments
        ("my NT friends", f"my {MASK} friends"),
        ("other SJs and SPs", f"other {MASK} and {MASK}"),
        ("NF-ish things", f"{MASK}-ish things"),
        # MBTI system words
        ("the MBTI test", f"the {TERM_MASK} test"),
        ("Myers-Briggs is old", f"{TERM_MASK} is old"),
        ("my cognitive functions", f"my {TERM_MASK}"),
        ("all MBTIs and funkymbti", f"all {TERM_MASK} and {TERM_MASK}"),
        ("the myersbrigg site", f"the {TERM_MASK} site"),
        (f"{MASK} vs MBTI", f"{MASK} vs {TERM_MASK}"),
        # cognitive functions
        ("strong Fi and Ne", f"strong {FUNCTION_MASK} and {FUNCTION_MASK}"),
        ("a Ni-dom", f"a {FUNCTION_MASK}-dom"),
        ("NeTi loop", f"{FUNCTION_MASK} loop"),
        # socionics
        ("I'm an ILI in socionics", f"I'm an {TYPOLOGY_MASK} in socionics"),
        ("SEE-Fi or LIE-Te", f"{TYPOLOGY_MASK}-{FUNCTION_MASK} or {TYPOLOGY_MASK}-{FUNCTION_MASK}"),
        # enneagram
        ("I'm a 4w5", f"I'm a {TYPOLOGY_MASK}"),
        ("cp6w7 and 8w9f", f"{TYPOLOGY_MASK} and {TYPOLOGY_MASK}"),
        ("9w1 sx/so", f"{TYPOLOGY_MASK} {TYPOLOGY_MASK}"),
    ],
)
def test_masks_typology_terms(text, expected):
    assert clean_text(text) == expected
    assert find_leaks(clean_text(text)) == {}


@pytest.mark.parametrize(
    "text",
    [
        "I enjoy exploring new ideas and thinking about the future.",
        "xxxxx censored",
        "an XXXX type",  # reveals nothing
        "Exxxcellent! I'm feeling exxxxcellent",
        "I am an introvert and I like intuition",
        "existence is strange, next time",
        "I N the middle",  # not a full spaced type
        "<URL> <POST_SEP> <COGNITIVE_FUNCTION>",
        "Wi-Fi and Sci-Fi movies",
        "Fine, I'll see. Tie the knot.",
        "Love you Sis! 'Tis the season.",
        "THIS IS A LIE. YOU SEE?",  # shouted words, not socionics
        "it was so/so",
        "I live in EST and visit the ENT doctor",
        "resolution 1280x960 and 0x92 in hex",
        "4 weeks, 3w ago",  # no digit after w
    ],
)
def test_leaves_normal_text_alone(text):
    assert clean_text(text) == text
    assert find_leaks(text) == {}


# --------------------------------------------------------------------------- #
# Encoding fixes
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "text, expected",
    [
        ("It isnx92t pretty, therex92s a reason", "It isn't pretty, there's a reason"),
        ("said:x93Naked I camex94", 'said:"Naked I came"'),
        ("Wow x97 so", "Wow  -  so"),
        ("yea x97x97x97 ok", "yea  -  -  -  ok"),
        ("x95 female x95 15", "  female   15"),
        ("bad moodx85 Hence", "bad mood... Hence"),
        ("u200bKill me", "Kill me"),
        ("âx80x9cThe Logicianâx80x9d", '"The Logician"'),
    ],
)
def test_fix_encoding(text, expected):
    assert fix_encoding(text) == expected


# --------------------------------------------------------------------------- #
# Post-level cleaning
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("post", ["<MBTI_TYPE>", "' <URL>", ".", "<URL> <URL> ...", "<MBTI_TYPE>."])
def test_placeholder_only_posts(post):
    assert is_placeholder_only(post)


def test_clean_posts_drops_empty_placeholders_and_duplicates():
    posts = ["INFPs rock", "INTJs rock", "   ", "hello", "hello", "' <URL>", "INFJ", "Yes."]
    assert clean_posts(posts) == [f"{MASK} rock", "hello", "Yes."]


def test_clean_posts_normalises_whitespace():
    assert clean_posts(["a  u3000 b"]) == ["a b"]
