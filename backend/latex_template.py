"""
LaTeX resume template for Shreyas Achary's format.
Static info is hardcoded; AI only generates bullets and selects projects.
"""

LATEX_PREAMBLE = r"""\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage{hyperref}
\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    filecolor=blue,
    urlcolor=blue,
    citecolor=blue
}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\usepackage{geometry}

\geometry{margin=0.4in}
\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-6pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\newcommand{\resumeItem}[1]{\item\small{#1 \vspace{-2pt}}}

\newcommand{\resumeSubheading}[4]{
  \vspace{-1pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-5pt}
}

\newcommand{\resumeProject}[1]{
  \vspace{-1pt}\item
  \small{#1}\vspace{-5pt}
}

\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

\newcommand{\resumeSpace}{\vspace{6pt}}

\begin{document}
"""

LATEX_FOOTER = r"""
\end{document}
"""


def _escape_latex(text: str) -> str:
    if not text:
        return ""
    replacements = [
        ("\\", r"\textbackslash{}"),
        ("&", r"\&"),
        ("%", r"\%"),
        ("$", r"\$"),
        ("#", r"\#"),
        ("_", r"\_"),
        ("{", r"\{"),
        ("}", r"\}"),
        ("~", r"\textasciitilde{}"),
        ("^", r"\textasciicircum{}"),
    ]
    for old, new in replacements:
        text = text.replace(old, new)
    return text


def _clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("~", "--")
    return _escape_latex(text)


def build_skills_section(skill_categories: dict) -> str:
    lines = []
    lines.append(r"\section{Technical Skills}")
    lines.append(r"\begin{itemize}[leftmargin=0.15in, label={}]")
    lines.append(r"  \small{\item{")
    for category, skills in skill_categories.items():
        skills_str = ", ".join(skills)
        lines.append(f"    \\textbf{{{_clean_text(category)}}}: {_clean_text(skills_str)} \\\\")
    lines.append(r"  }}")
    lines.append(r"\end{itemize}")
    return "\n".join(lines)


def build_projects_section(tailored_projects: list) -> str:
    lines = []
    lines.append(r"\section{Projects}")
    lines.append(r"\resumeSubHeadingListStart")
    for i, proj in enumerate(tailored_projects):
        name = _clean_text(proj.get("name", "Project"))
        header_parts = [r"\textbf{" + name + r"}"]
        if proj.get("demo_url"):
            header_parts.append(r"\href{" + proj["demo_url"] + r"}{Demo}")
        if proj.get("github_url"):
            header_parts.append(r"\href{" + proj["github_url"] + r"}{GitHub}")
        header = " $|$\n  ".join(header_parts)
        lines.append(f"  \\resumeProject{{{header}}}")
        lines.append(r"  \resumeItemListStart")
        for bullet in proj.get("bullets", []):
            lines.append(f"    \\resumeItem{{{_clean_text(bullet)}}}")
        lines.append(r"  \resumeItemListEnd")
        if i < len(tailored_projects) - 1:
            lines.append(r"  \resumeSpace")
    lines.append(r"\resumeSubHeadingListEnd")
    return "\n".join(lines)


def build_latex(analyzed_jd, tailored_content) -> str:
    """Assemble the final .tex file for Shreyas Achary's template."""
    sections = []
    sections.append(LATEX_PREAMBLE)

    # Header — STATIC
    sections.append(r"""\begin{center}
    \textbf{\Huge \scshape Shreyas Achary} \\ \vspace{2pt}
    \small +353.089.977.4573 $|$
    \href{mailto:shreyasacharya8@gmail.com}{shreyasacharya8@gmail.com} $|$
    \href{https://linkedin.com/in/shreyas-achary}{linkedin.com/in/shreyas-achary} $|$
    \href{https://portfolio-three-rho-41.vercel.app/}{Portfolio}
\end{center}""")

    # Professional Summary
    if tailored_content.summary:
        sections.append(r"\section{Professional Summary}")
        sections.append(_clean_text(tailored_content.summary))

    # Skills
    if tailored_content.skills_section:
        sections.append(tailored_content.skills_section)
    elif tailored_content.skills_data:
        sections.append(build_skills_section(tailored_content.skills_data))

    # Certifications
    if tailored_content.certifications:
        cert_lines = [r"\section{Certifications}", r"\resumeSubHeadingListStart"]
        for cert in tailored_content.certifications:
            cert_lines.append(f"  \\resumeItem{{{cert}}}")
        cert_lines.append(r"\resumeSubHeadingListEnd")
        sections.append("\n".join(cert_lines))

    # Experience
    exp_lines = [r"\section{Experience}", r"\resumeSubHeadingListStart"]

    if tailored_content.tepiche_bullets:
        title = tailored_content.tepiche_title or "Data Analyst Intern"
        exp_lines.append(f"  \\resumeSubheading")
        exp_lines.append(f"    {{{_clean_text(title)}}}{{Sep 2025 -- Feb 2026}}")
        exp_lines.append(f"    {{Tepiche International}}{{Remote}}")
        exp_lines.append(r"    \resumeItemListStart")
        for b in tailored_content.tepiche_bullets:
            exp_lines.append(f"      \\resumeItem{{{_clean_text(b)}}}")
        exp_lines.append(r"    \resumeItemListEnd")
        exp_lines.append(r"    \resumeSpace")

    if tailored_content.ltimindtree_bullets:
        title = tailored_content.ltimindtree_title or "Software Engineer"
        exp_lines.append(f"  \\resumeSubheading")
        exp_lines.append(f"    {{{_clean_text(title)}}}{{Oct 2021 -- Aug 2024}}")
        exp_lines.append(f"    {{LTIMindtree}}{{Karnataka, India}}")
        exp_lines.append(r"    \resumeItemListStart")
        for b in tailored_content.ltimindtree_bullets:
            exp_lines.append(f"      \\resumeItem{{{_clean_text(b)}}}")
        exp_lines.append(r"    \resumeItemListEnd")

    exp_lines.append(r"\resumeSubHeadingListEnd")
    sections.append("\n".join(exp_lines))

    # Projects
    if tailored_content.selected_projects:
        sections.append(build_projects_section(tailored_content.selected_projects))

    # Education — STATIC
    sections.append(r"""\section{Education}
\resumeSubHeadingListStart
  \resumeSubheading
    {University College Dublin}{Sep 2024 -- Sep 2025}
    {MSc in Data and Computational Science $|$ GPA: 2:1}{Dublin, Ireland}
    \resumeItemListStart
      \resumeItem{Relevant Modules: Statistical Machine Learning \& AI, Modern Regression Analysis, Multivariate Analysis.}
    \resumeItemListEnd
  \resumeSubheading
    {NMAM Institute of Technology}{Aug 2017 -- Jul 2021}
    {Bachelor of Engineering in Electronics and Communication Engineering}{Karnataka, India}
\resumeSubHeadingListEnd""")

    sections.append(LATEX_FOOTER)
    return "\n\n".join(sections)
