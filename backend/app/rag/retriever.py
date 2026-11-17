from app.rag.query import ask, get_page
from app.rag.jurisdiction_filter import filter_by_jurisdiction


RULE_TOPICS = [
    "FAR FSI Floor Area Ratio floor area requirements",
    "building height maximum permissible height",
    "setbacks front side rear setback requirements",
    "parking off street parking requirements",
    "road width road access road widening requirements",
    "ground coverage plot coverage requirements",
    "open space green area landscaping requirements",
]


def _is_far_document(doc) -> bool:
    text = doc.page_content.lower()

    far_terms = [
        "floor area ratio",
        "permissible far",
        "purchasable far",
        "floor space index",
        "far =",
        "f.a.r.",
    ]

    return any(term in text for term in far_terms)


def _is_development_control_document(doc) -> bool:
    """
    Identify chunks containing actual development-control
    provisions rather than only general definitions.
    """

    text = doc.page_content.lower()

    control_terms = [
        "development and building controls",
        "development controls for different uses",
        "minimum setbacks",
        "permissible setbacks",
        "ground coverage",
        "height permissible",
        "height of building",
        "minimum abutting road width",
        "all-round open space",
    ]

    return any(term in text for term in control_terms)


def _is_table_of_contents(doc) -> bool:
    """
    Detect table-of-contents chunks so they don't
    outrank actual regulation provisions.
    """

    text = doc.page_content.lower()

    return (
        "table of contents" in text
        or (
            "table 20" in text
            and "table 24" in text
            and "table 25" in text
        )
    )


def _is_table_24_document(doc) -> bool:
    """
    Detect the main Table 24 development-control table.

    PDF extraction can sometimes separate the Table 24
    title from its rows, so this also checks for the
    characteristic table columns and commercial rows.
    """

    text = doc.page_content.lower()

    has_table_24 = "table 24" in text

    has_development_controls = (
        "development controls for different uses" in text
    )

    has_table_columns = (
        "maximum far" in text
        and "maximum ground coverage" in text
        and "maximum height" in text
    )

    has_commercial_rows = (
        "convenient/neighbourhood" in text
        or "convenient/neighbourhood shopping" in text
        or "convenient/neighborhood" in text
        or "sector shopping" in text
        or "sub-district centre" in text
        or "central business district" in text
    )

    return (
        (has_table_24 and has_development_controls)
        or (
            has_table_columns
            and has_commercial_rows
        )
    )


def _unique_documents(docs):
    unique_docs = []
    seen = set()

    for doc in docs:
        content = doc.page_content.strip()

        if content and content not in seen:
            seen.add(content)
            unique_docs.append(doc)

    return unique_docs

def _get_table_24():
    """
    Table 24 is located on PDF page 159 of the
    2024 Andhra Pradesh Standardized Development
    and Building Regulations document.
    """

    documents = get_page(159)

    table_24_docs = []

    for doc in documents:

        text = doc.page_content.lower()

        if (
            "development controls for different uses" in text
            or (
                "maximum far" in text
                and "maximum ground coverage" in text
                and "maximum height" in text
            )
        ):
            table_24_docs.append(doc)

    return table_24_docs

def retrieve(
    question: str,
    k: int = 4,
    jurisdiction: str | None = None,
):
    """
    Retrieve relevant Andhra Pradesh building regulations.

    Priority:

    1. Table 24 development-control provisions
    2. Other actual development-control provisions
    3. FAR/FSI provisions for FAR questions
    4. Other relevant regulations
    5. Table-of-contents pages
    """

    question_lower = question.lower()

    all_docs = []

    is_far_question = (
        "far" in question_lower
        or "fsi" in question_lower
        or "floor area ratio" in question_lower
        or "floor space index" in question_lower
    )

    # ---------------------------------------------------------
    # DIRECT TABLE 24 RETRIEVAL
    # ---------------------------------------------------------

    table_24_docs = []

    if is_far_question:
        table_24_docs = _get_table_24()

        all_docs.extend(table_24_docs)

    is_far_question = (
        "far" in question_lower
        or "fsi" in question_lower
        or "floor area ratio" in question_lower
        or "floor space index" in question_lower
    )

    # ---------------------------------------------------------
    # FAR / FSI SPECIFIC RETRIEVAL
    # ---------------------------------------------------------

    if is_far_question:

        far_queries = [
            question,

            "Table 24 Development Controls for Different Uses",

            (
                "Maximum FAR Maximum Ground Coverage "
                "Maximum Height Use Activity Commercial"
            ),

            (
                "ii Commercial Convenient Neighbourhood "
                "shopping centre Sector shopping "
                "Sub-district centre"
            ),

            (
                "Central business district Hotels Banks "
                "Cinema multiplex Informal bazaar market "
                "Warehousing godowns"
            ),

            (
                "commercial development controls "
                "FAR ground coverage height"
            ),
        ]

        for query in far_queries:
            all_docs.extend(ask(query))

    # ---------------------------------------------------------
    # GENERAL BUILDING CONTROL RETRIEVAL
    # ---------------------------------------------------------

    else:

        initial_docs = ask(question)

        if initial_docs:
            all_docs.append(initial_docs[0])

        for topic in RULE_TOPICS:
            all_docs.extend(
                ask(f"{question} {topic}")
            )

    # Remove None values
    all_docs = [
        doc
        for doc in all_docs
        if doc is not None
    ]

    # Remove duplicate pages
    unique_docs = _unique_documents(all_docs)

    # ---------------------------------------------------------
    # TABLE 24 PRIORITY
    # ---------------------------------------------------------

    table_24_docs = [
        doc
        for doc in unique_docs
        if _is_table_24_document(doc)
    ]

    other_docs = [
        doc
        for doc in unique_docs
        if doc not in table_24_docs
    ]

    # Table 24 pages are now first
    unique_docs = table_24_docs + other_docs

    # ---------------------------------------------------------
    # TABLE OF CONTENTS DEPRIORITIZATION
    # ---------------------------------------------------------

    actual_docs = [
        doc
        for doc in unique_docs
        if not _is_table_of_contents(doc)
    ]

    toc_docs = [
        doc
        for doc in unique_docs
        if _is_table_of_contents(doc)
    ]

    # ---------------------------------------------------------
    # DEVELOPMENT CONTROL DOCUMENTS
    # ---------------------------------------------------------

    development_docs = [
        doc
        for doc in actual_docs
        if _is_development_control_document(doc)
    ]

    other_regulation_docs = [
        doc
        for doc in actual_docs
        if not _is_development_control_document(doc)
    ]

    # ---------------------------------------------------------
    # FINAL PRIORITIZATION
    # ---------------------------------------------------------

    if is_far_question:

        far_docs = [
            doc
            for doc in development_docs
            if _is_far_document(doc)
        ]

        non_far_docs = [
            doc
            for doc in actual_docs
            if not _is_far_document(doc)
        ]

        prioritized = (
            table_24_docs
            + far_docs
            + development_docs
            + non_far_docs
        )

    else:

        prioritized = (
            table_24_docs
            + development_docs
            + other_regulation_docs
        )

    # TOC pages always last
    prioritized.extend(toc_docs)
    # ---------------------------------------------------------
    # JURISDICTION FILTER
    # ---------------------------------------------------------

    if jurisdiction:
        prioritized = filter_by_jurisdiction(
            prioritized,
            jurisdiction,
        )

    return _unique_documents(prioritized)[:k]


def retrieve_context(
    question: str,
    k: int = 4,
    jurisdiction: str | None = None,
) -> str:
    """
    Convert retrieved regulation documents into
    a formatted context string for the agents.
    """

    docs = retrieve(
        question,
        k,
        jurisdiction,
    )

    if not docs:
        return "No relevant regulations were found."

    context_parts = []

    for i, doc in enumerate(docs, start=1):

        source = doc.metadata.get(
            "source",
            "Unknown source"
        )

        page = doc.metadata.get(
            "page",
            "Unknown page"
        )

        context_parts.append(
            f"""
--- Regulation {i} ---
Source: {source}
Page: {page}

{doc.page_content}
"""
        )

    return "\n".join(context_parts)


def build_prompt(
    question: str,
    k: int = 4,
    jurisdiction: str | None = None,
) -> str:
    """
    Build the prompt used by the regulation-aware
    AI assistant.
    """

    context = retrieve_context(
        question,
        k,
        jurisdiction,
    )

    return f"""
You are an AI assistant for a Smart City Planner.

Answer the user's question using the following
building and development regulations.

REGULATION CONTEXT:
{context}

USER QUESTION:
{question}

Instructions:
- Base the answer on the provided regulation context.
- Do not invent regulations.
- Prefer explicit numerical requirements and tables.
- Distinguish definitions from actual development controls.
- If the provided context does not contain enough information,
  clearly say that more regulation information is required.
"""