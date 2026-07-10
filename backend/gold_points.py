"""
Reads gold points (.docx files) containing the candidate's experience and project narratives.
These are used as the source of truth for resume generation.
"""

import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("gold_points")

# Gold points directory: v2shrey/gold points/ (co-located, portable)
GOLD_POINTS_DIR = Path(__file__).parent.parent / "gold points"


def _read_docx(path: Path) -> Optional[str]:
    """Extract plain text from a .docx file."""
    try:
        from docx import Document
        doc = Document(str(path))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except ImportError:
        logger.error("python-docx not installed. Run: pip install python-docx")
        return None
    except Exception as e:
        logger.error(f"Failed to read {path}: {e}")
        return None


def read_experience() -> str:
    """Read professional experience narratives from gold points."""
    path = GOLD_POINTS_DIR / "professional_experience.docx"
    if not path.exists():
        logger.warning(f"Experience file not found: {path}")
        return _fallback_experience()
    text = _read_docx(path)
    if not text:
        return _fallback_experience()
    logger.info(f"Loaded experience from {path} ({len(text)} chars)")
    return text


def read_projects() -> str:
    """Read project narratives from gold points."""
    path = GOLD_POINTS_DIR / "projects.docx"
    if not path.exists():
        logger.warning(f"Projects file not found: {path}")
        return _fallback_projects()
    text = _read_docx(path)
    if not text:
        return _fallback_projects()
    logger.info(f"Loaded projects from {path} ({len(text)} chars)")
    return text


def _fallback_experience() -> str:
    """Minimal fallback experience if docx not readable."""
    return """
TEPICHE INTERNATIONAL — Data Analyst Intern (Sep 2025 – Feb 2026, Remote)
- Data analysis and reporting for business operations
- Built dashboards and automated reports
- Performed statistical analysis on business datasets

LTIMINDTREE — Software Engineer (Oct 2021 – Aug 2024, Karnataka, India)
- Software engineering and data engineering for enterprise clients (3 years)
- Built data pipelines and ETL processes
- Deployed ML models and analytics solutions
- Integrated systems and APIs
- Worked on cloud infrastructure (Azure)
""".strip()


def _fallback_projects() -> str:
    """Minimal fallback projects if docx not readable."""
    return """
REPODOC AI
- LangGraph multi-agent pipeline for automated code documentation
- FAISS dual-index (text + code) for semantic search
- LLM-judge for quality evaluation
- Streamlit app with .docx export
- GitHub: https://github.com/shreyas-achary/repodoc

CREDIT RISK PD MODEL
- XGBoost probability-of-default model on 49k rows
- Handled 11.4:1 class imbalance with SMOTE
- MLflow experiment tracking, SHAP explainability
- Deployed via Streamlit + Docker

PRESSURE SENSOR ANALYTICS
- Analytics for 144 industrial sensors using hierarchical clustering
- LDA/QDA classification, PCA dimensionality reduction
- R-based statistical analysis

WINE QUALITY ANALYSIS
- 6,500 row dataset; Welch's t-tests, linear regression
- Random Forest, K-means, Spectral Clustering
""".strip()
