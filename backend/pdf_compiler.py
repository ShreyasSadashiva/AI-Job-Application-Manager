"""
PDF compilation from LaTeX strings using pdflatex.
"""

import shutil
import subprocess
import tempfile
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("pdf_compiler")


def sanitize_filename(name: str) -> str:
    return "".join(c for c in name if c.isalnum() or c in (" ", "-", "_")).strip().replace(" ", "_")


def make_pdf_filename(company: str, position: str) -> str:
    return f"Shreyas_Achary_CV_{sanitize_filename(company)}_{sanitize_filename(position)}.pdf"


def compile_latex_to_pdf(tex_content: str) -> Optional[bytes]:
    """Compile LaTeX string to PDF bytes. Returns None on failure."""
    if not shutil.which("pdflatex"):
        logger.error("pdflatex not found in PATH. Install TeX Live or MiKTeX.")
        return None

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = Path(tmpdir) / "document.tex"
        tex_path.write_text(tex_content, encoding="utf-8")

        last_result = None
        for _ in range(2):
            last_result = subprocess.run(
                ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, str(tex_path)],
                capture_output=True,
                text=True,
                timeout=60,
            )

        pdf_path = Path(tmpdir) / "document.pdf"
        if pdf_path.exists():
            return pdf_path.read_bytes()

        log_snippet = (last_result.stdout or "")[-2000:] if last_result else "No output"
        logger.error(f"LaTeX compilation failed:\n{log_snippet}")
        return None
