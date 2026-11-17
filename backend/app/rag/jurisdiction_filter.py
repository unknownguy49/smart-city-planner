from typing import List, Any


def _normalize(value: str) -> str:
    """
    Normalize text so variations such as:

        Andhra Pradesh
        Andhra-Pradesh
        Andhra_Pradesh

    are treated consistently.
    """

    return (
        str(value)
        .lower()
        .strip()
        .replace("-", " ")
        .replace("_", " ")
    )


def filter_by_jurisdiction(
    docs: List[Any],
    jurisdiction: str | None = None,
) -> List[Any]:
    """
    Filter retrieved regulation documents by jurisdiction.

    The current regulation dataset is focused on Andhra Pradesh.

    Matching is performed against both:
    - document source
    - document content

    Hyphens and underscores are normalized so that
    'Andhra Pradesh' matches 'Andhra-Pradesh'.
    """

    if not jurisdiction:
        return docs

    normalized_jurisdiction = _normalize(
        jurisdiction
    )

    filtered = []

    for doc in docs:

        source = _normalize(
            doc.metadata.get(
                "source",
                "",
            )
        )

        content = _normalize(
            doc.page_content
        )

        if (
            normalized_jurisdiction in source
            or normalized_jurisdiction in content
        ):
            filtered.append(doc)

    return filtered