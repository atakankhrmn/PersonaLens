"""
Reusable PersonaLens Streamlit UI Components.

Strictly separated from ML prediction logic: pass your existing prediction
function `predict_fn(text: str) -> dict` into `render_analyze_section(predict_fn)`
without altering your trained model, dataset, or preprocessing pipeline.
"""

from typing import Callable, Dict, List, Optional
import html
import streamlit as st


PERSONALITY_GROUPS: Dict[str, Dict[str, str]] = {
    "analysts": {
        "name": "Analysts",
        "tagline": "Intuitive (N) and Thinking (T)",
        "accent": "#88619A",
        "ink": "#4F3460",
    },
    "diplomats": {
        "name": "Diplomats",
        "tagline": "Intuitive (N) and Feeling (F)",
        "accent": "#33A474",
        "ink": "#1D6446",
    },
    "sentinels": {
        "name": "Sentinels",
        "tagline": "Observant (S) and Judging (J)",
        "accent": "#4298B4",
        "ink": "#205B70",
    },
    "explorers": {
        "name": "Explorers",
        "tagline": "Observant (S) and Prospecting (P)",
        "accent": "#D99B26",
        "ink": "#7A530B",
    },
}

PERSONALITY_CATALOG: List[Dict[str, str]] = [
    {"code": "INTJ", "title": "The Architect", "group": "analysts", "desc": "Imaginative and strategic thinkers with a plan for everything."},
    {"code": "INTP", "title": "The Logician", "group": "analysts", "desc": "Innovative inventors with an unquenchable thirst for knowledge."},
    {"code": "ENTJ", "title": "The Commander", "group": "analysts", "desc": "Bold, imaginative, and strong-willed leaders who always find a way."},
    {"code": "ENTP", "title": "The Debater", "group": "analysts", "desc": "Smart and curious thinkers who cannot resist an intellectual challenge."},
    {"code": "INFJ", "title": "The Advocate", "group": "diplomats", "desc": "Quiet and mystical, yet very inspiring and tireless idealists."},
    {"code": "INFP", "title": "The Mediator", "group": "diplomats", "desc": "Poetic, kind, and altruistic people, always eager to help a good cause."},
    {"code": "ENFJ", "title": "The Protagonist", "group": "diplomats", "desc": "Charismatic and inspiring leaders, able to mesmerize their listeners."},
    {"code": "ENFP", "title": "The Campaigner", "group": "diplomats", "desc": "Enthusiastic, creative, and sociable free spirits who always find a reason to smile."},
    {"code": "ISTJ", "title": "The Logistician", "group": "sentinels", "desc": "Practical and fact-minded individuals whose reliability cannot be doubted."},
    {"code": "ISFJ", "title": "The Defender", "group": "sentinels", "desc": "Very dedicated and warm protectors, always ready to defend their loved ones."},
    {"code": "ESTJ", "title": "The Executive", "group": "sentinels", "desc": "Excellent administrators, unsurpassed at managing things or people."},
    {"code": "ESFJ", "title": "The Consul", "group": "sentinels", "desc": "Extraordinarily caring, social, and popular people, always eager to help."},
    {"code": "ISTP", "title": "The Virtuoso", "group": "explorers", "desc": "Bold and practical experimenters, masters of all kinds of tools."},
    {"code": "ISFP", "title": "The Adventurer", "group": "explorers", "desc": "Flexible and charming artists, always ready to explore and experience something new."},
    {"code": "ESTP", "title": "The Entrepreneur", "group": "explorers", "desc": "Smart, energetic, and perceptive people who truly enjoy living on the edge."},
    {"code": "ESFP", "title": "The Entertainer", "group": "explorers", "desc": "Spontaneous, energetic, and enthusiastic people—life is never boring around them."},
]

AXIS_SPECS = [
    ("EI", "Introverted (I)", "Extraverted (E)"),
    ("NS", "Observant (S)", "Intuitive (N)"),
    ("FT", "Feeling (F)", "Thinking (T)"),
    ("JP", "Prospecting (P)", "Judging (J)"),
]


def render_hero() -> None:
    """Render the PersonaLens landing headline and subtitle."""
    st.markdown(
        """
        <div style="padding: 1.5rem 0 1rem 0;">
          <div style="font-size: 0.8rem; color: #5A6375; font-weight: 500; margin-bottom: 0.6rem;">
            Experimental Text-Based MBTI Discovery &middot; 16 Archetypes
          </div>
          <h1 class="pl-display" style="font-size: 2.75rem; line-height: 1.1; margin: 0 0 0.75rem 0;">
            Discover the Personality Behind Your Words
          </h1>
          <p style="font-size: 1.125rem; color: #525B6E; max-width: 40rem; line-height: 1.6;">
            Explore your personality through machine learning text analysis.
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_personality_card(item: Dict[str, str], svg_markup: Optional[str] = None) -> None:
    """Render an individual MBTI card tinted by its personality group."""
    group = PERSONALITY_GROUPS[item["group"]]
    visual = svg_markup or (
        f'<div class="pl-code" style="font-size: 2.25rem; color: {group["ink"]}; '
        f'padding: 1.25rem 0;">{html.escape(item["code"])}</div>'
    )
    st.markdown(
        f"""
        <div class="pl-card pl-group-{item['group']}" style="text-align: center;">
          <div style="display: flex; justify-content: center; margin-bottom: 0.75rem;">
            {visual}
          </div>
          <div class="pl-code" style="font-size: 0.875rem; color: {group['ink']};">
            {html.escape(item['code'])} &middot; {html.escape(group['name'])}
          </div>
          <h4 class="pl-display" style="margin: 0.35rem 0 0.5rem 0; font-size: 1.25rem;">
            {html.escape(item['title'])}
          </h4>
          <p style="font-size: 0.875rem; color: #4B5364; line-height: 1.5; margin: 0;">
            {html.escape(item['desc'])}
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_personality_groups(svg_map: Optional[Dict[str, str]] = None) -> None:
    """Render all 16 personality types in 4 groups with 4 cards per row on desktop."""
    for group_id, meta in PERSONALITY_GROUPS.items():
        st.markdown(
            f"""
            <div style="margin-top: 2.5rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(0,0,0,0.07); padding-bottom: 0.65rem;">
              <h3 class="pl-display" style="color: {meta['ink']}; margin: 0; font-size: 1.75rem;">
                {html.escape(meta['name'])}
              </h3>
              <span style="font-size: 0.85rem; color: #6B7280;">{html.escape(meta['tagline'])}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )
        items = [t for t in PERSONALITY_CATALOG if t["group"] == group_id]
        cols = st.columns(4, gap="medium")
        for col, item in zip(cols, items):
            with col:
                render_personality_card(item, svg_map.get(item["code"]) if svg_map else None)


def render_prediction_result(prediction: Dict[str, object], svg_markup: Optional[str] = None) -> None:
    """
    Render prediction output strictly from real model fields.
    Expected keys:
      - predicted_type (str, required): e.g. 'INTP'
      - scores (dict | None, optional): {'EI': P(E), 'NS': P(N), 'FT': P(T), 'JP': P(J)} in 0..1
      - model_version (str | None, optional)
    """
    code = str(prediction.get("predicted_type") or prediction.get("type") or "").upper()
    match = next((t for t in PERSONALITY_CATALOG if t["code"] == code), None)
    if not match:
        st.warning("Prediction did not return a recognized MBTI code.")
        return

    group = PERSONALITY_GROUPS[match["group"]]
    model_version = prediction.get("model_version")
    version_text = f" &middot; Model {html.escape(str(model_version))}" if model_version else ""

    st.markdown(
        f"""
        <div class="pl-card pl-group-{match['group']}" style="margin-bottom: 1.5rem;">
          <div style="font-size: 0.85rem; color: {group['ink']}; font-weight: 600;">
            {html.escape(group['name'])} &middot; {html.escape(group['tagline'])}{version_text}
          </div>
          <h2 class="pl-display" style="font-size: 2.25rem; margin: 0.35rem 0;">
            <span class="pl-code" style="color: {group['ink']};">{html.escape(match['code'])}</span> &mdash; {html.escape(match['title'])}
          </h2>
          <p style="font-size: 1rem; color: #374151; line-height: 1.6; margin: 0;">
            {html.escape(match['desc'])}
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if svg_markup:
        st.markdown(svg_markup, unsafe_allow_html=True)

    scores = prediction.get("scores")
    if isinstance(scores, dict) and all(
        isinstance(scores.get(k), (int, float)) and 0.0 <= float(scores[k]) <= 1.0
        for k, _, _ in AXIS_SPECS
    ):
        st.subheader("Four Dimension Probabilities")
        for key, left_label, right_label in AXIS_SPECS:
            prob_right = float(scores[key])
            right_pct = prob_right * 100.0
            left_pct = 100.0 - right_pct
            st.markdown(
                f"""
                <div style="margin-bottom: 0.9rem;">
                  <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:600; margin-bottom:0.3rem;">
                    <span>{html.escape(left_label)} ({left_pct:.0f}%)</span>
                    <span>{html.escape(right_label)} ({right_pct:.0f}%)</span>
                  </div>
                  <div class="pl-dimension-track">
                    <div style="width:{left_pct:.1f}%; background:{group['accent'] if left_pct > 50 else 'transparent'};"></div>
                    <div style="width:{right_pct:.1f}%; background:{group['accent'] if right_pct >= 50 else 'transparent'};"></div>
                  </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    st.markdown(
        """
        <div class="pl-disclaimer" style="margin-top: 1.5rem;">
          <strong>Experimental Prediction Notice:</strong> This output is an experimental prediction of
          self-reported MBTI labels from writing, not an official personality assessment.
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_analyze_section(predict_fn: Optional[Callable[[str], Dict[str, object]]] = None) -> None:
    """Connect the PersonaLens text input UI to an external Python prediction function."""
    user_text = st.text_area(
        "Share a sample of your writing",
        placeholder="Tell us about yourself, your thoughts, your interests, or how you see the world...",
        height=180,
    )
    if st.button("Analyze My Personality", type="primary"):
        if predict_fn is None:
            st.info("Model not connected yet. Wire your trained prediction function to enable inference.")
            return
        if not user_text.strip():
            st.warning("Please enter some text before running the analysis.")
            return
        result = predict_fn(user_text.strip())
        render_prediction_result(result)
