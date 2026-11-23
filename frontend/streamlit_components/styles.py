"""
PersonaLens Custom CSS for Streamlit.
Apply at app startup via:
    from streamlit_components.styles import inject_personalens_styles
    inject_personalens_styles()
"""

import streamlit as st


PERSONALENS_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

:root {
  --pl-bg: #FAF9F6;
  --pl-surface: #FFFFFF;
  --pl-ink: #1E2430;
  --pl-muted: #525B6E;
  --pl-analysts-bg: #F7F2FA;
  --pl-analysts-border: #E1D2EB;
  --pl-analysts-ink: #4F3460;
  --pl-analysts-accent: #88619A;
  --pl-diplomats-bg: #F0F9F4;
  --pl-diplomats-border: #C8E9D8;
  --pl-diplomats-ink: #1D6446;
  --pl-diplomats-accent: #33A474;
  --pl-sentinels-bg: #F0F7FA;
  --pl-sentinels-border: #C7E2ED;
  --pl-sentinels-ink: #205B70;
  --pl-sentinels-accent: #4298B4;
  --pl-explorers-bg: #FEF9EC;
  --pl-explorers-border: #F2DFB0;
  --pl-explorers-ink: #7A530B;
  --pl-explorers-accent: #D99B26;
}

.stApp {
  background-color: var(--pl-bg);
  color: var(--pl-ink);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
}

h1, h2, h3, .pl-display {
  font-family: 'Bricolage Grotesque', system-ui, -apple-system, sans-serif;
  color: var(--pl-ink);
}

.pl-card {
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(30, 36, 48, 0.08);
  background: var(--pl-surface);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  height: 100%;
}

.pl-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 36px -14px rgba(30, 36, 48, 0.14);
}

.pl-group-analysts { background: var(--pl-analysts-bg); border-color: var(--pl-analysts-border); }
.pl-group-diplomats { background: var(--pl-diplomats-bg); border-color: var(--pl-diplomats-border); }
.pl-group-sentinels { background: var(--pl-sentinels-bg); border-color: var(--pl-sentinels-border); }
.pl-group-explorers { background: var(--pl-explorers-bg); border-color: var(--pl-explorers-border); }

.pl-code {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.pl-dimension-track {
  height: 12px;
  width: 100%;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  background: #E8ECEF;
}

.pl-disclaimer {
  border-radius: 16px;
  background: #F4F5F7;
  border: 1px solid rgba(30, 36, 48, 0.06);
  padding: 16px 20px;
  font-size: 0.875rem;
  color: var(--pl-muted);
}

div.stButton > button[kind="primary"] {
  background-color: #33A474;
  border-color: #33A474;
  border-radius: 12px;
  font-weight: 600;
  padding: 0.65rem 1.5rem;
}

div.stButton > button[kind="primary"]:hover {
  background-color: #298B61;
  border-color: #298B61;
}
</style>
"""


def inject_personalens_styles() -> None:
    """Inject PersonaLens light-theme CSS tokens into Streamlit."""
    st.markdown(PERSONALENS_CSS, unsafe_allow_html=True)
