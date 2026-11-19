import pytest

from src.etl.cleaning import MASK, clean_posts, find_type_mentions, mask_mbti


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
        # existing masks are kept
        (f"{MASK} and {MASK}", f"{MASK} and {MASK}"),
    ],
)
def test_masks_mbti_mentions(text, expected):
    assert mask_mbti(text) == expected
    assert find_type_mentions(mask_mbti(text)) == []


@pytest.mark.parametrize(
    "text",
    [
        "I enjoy exploring new ideas and thinking about the future.",
        "xxxxx censored",
        "I am an introvert and I like intuition",
        "existence is strange, next time",
        "Ni Ne Ti Fe are cognitive functions",
        "I N the middle",  # not a full spaced type
        "<URL> <POST_SEP> <COGNITIVE_FUNCTION>",
    ],
)
def test_leaves_normal_text_alone(text):
    assert mask_mbti(text) == text
    assert find_type_mentions(text) == []


def test_clean_posts_drops_empty_and_duplicates():
    posts = ["INFPs rock", "INTJs rock", "   ", "hello", "hello"]
    assert clean_posts(posts) == [f"{MASK} rock", "hello"]
