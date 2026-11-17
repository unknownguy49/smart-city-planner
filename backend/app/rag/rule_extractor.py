import re


COMMERCIAL_TABLE_24_ROWS = {
    "Convenient/Neighbourhood shopping centre":
        "convenient/neighbourhood shopping centre",

    "Sector shopping":
        "sector shopping",

    "Sub-district centre":
        "sub-district centre",

    "Central business district":
        "central business district",

    "Hotels":
        "hotels",

    "Banks":
        "banks",

    "Cinema/multiplex":
        "cinema/multiplex",

    "Informal/bazaar market":
        "informal/bazaar market",

    "Warehousing/godowns":
        "warehousing/godowns",
}


def _normalize_text(text: str) -> str:
    """
    Normalize PDF-extracted text while preserving useful
    regulatory information.
    """

    normalized = " ".join(text.split())

    # Fix common PDF word splits.
    replacements = {
        "Convenient/Neighbourho od":
            "Convenient/Neighbourhood",

        "Neighbourho od":
            "Neighbourhood",

        "commerci al":
            "commercial",

        "provisio n":
            "provision",

        "Permissi- ble":
            "Permissible",

        "off - street":
            "off-street",

        "storm water":
            "stormwater",
    }

    for old, new in replacements.items():
        normalized = normalized.replace(
            old,
            new,
        )

    return normalized


def _unique(items):
    """
    Preserve order while removing duplicates.
    """

    result = []

    for item in items:

        if item not in result:
            result.append(item)

    return result


def _extract_matches(
    text: str,
    patterns: list[str],
) -> list[str]:

    results = []

    for pattern in patterns:

        matches = re.findall(
            pattern,
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )

        for match in matches:

            if isinstance(match, tuple):
                match = " ".join(match)

            match = " ".join(
                match.split()
            )

            if match and match not in results:
                results.append(match)

    return results


# =============================================================
# TABLE 24
# =============================================================

def extract_commercial_controls(text: str) -> dict:
    """
    Extract commercial development controls from
    Table 24: Development Controls for Different Uses.

    Returns:

    {
        "Sector shopping": {
            "far": 2.0,
            "ground_coverage_percent": 30.0,
            "height_m": 24.0
        }
    }
    """

    controls = {}

    normalized = _normalize_text(text)

    row_names = [
        "Convenient/Neighbourhood shopping centre",
        "Sector shopping",
        "Sub-district centre",
        "Central business district",
        "Hotels",
        "Banks",
        "Cinema/multiplex",
        "Informal/bazaar market",
        "Warehousing/godowns",
    ]

    # ---------------------------------------------------------
    # FIND ROW POSITIONS
    # ---------------------------------------------------------

    positions = []

    for row_name in row_names:

        match = re.search(
            re.escape(row_name),
            normalized,
            flags=re.IGNORECASE,
        )

        if match:

            positions.append(
                (
                    match.start(),
                    row_name,
                )
            )

    positions.sort()

    # ---------------------------------------------------------
    # PARSE EACH ROW
    # ---------------------------------------------------------

    for index, (start, row_name) in enumerate(
        positions
    ):

        if index + 1 < len(positions):

            end = positions[
                index + 1
            ][0]

        else:

            end = start + 250

        row_text = normalized[
            start:end
        ]

        # -----------------------------------------------------
        # NUMERICAL HEIGHT
        # -----------------------------------------------------

        match = re.search(
            r"-\s*"
            r"(\d+(?:\.\d+)?)\s+"
            r"(\d+(?:\.\d+)?)\s+"
            r"(\d+(?:\.\d+)?)",
            row_text,
            flags=re.IGNORECASE,
        )

        if match:

            controls[row_name] = {

                "far": float(
                    match.group(1)
                ),

                "ground_coverage_percent":
                    float(
                        match.group(2)
                    ),

                "height_m":
                    float(
                        match.group(3)
                    ),
            }

            continue

        # -----------------------------------------------------
        # NO LIMIT HEIGHT
        # -----------------------------------------------------

        match = re.search(
            r"-\s*"
            r"(\d+(?:\.\d+)?)\s+"
            r"(\d+(?:\.\d+)?)\s+"
            r"No\s+limit",
            row_text,
            flags=re.IGNORECASE,
        )

        if match:

            controls[row_name] = {

                "far": float(
                    match.group(1)
                ),

                "ground_coverage_percent":
                    float(
                        match.group(2)
                    ),

                "height_m": None,

                "height_limit":
                    "No limit",
            }

    return controls


# =============================================================
# FAR
# =============================================================

def extract_far_values(
    text: str,
) -> list[float]:

    commercial_controls = (
        extract_commercial_controls(text)
    )

    if commercial_controls:

        values = [

            control["far"]

            for control
            in commercial_controls.values()

        ]

        return sorted(
            set(values)
        )

    values = []

    patterns = [

        r"\bFAR\s*"
        r"(?:of|=|:)\s*"
        r"(\d+(?:\.\d+)?)",

        r"\bFSI\s*"
        r"(?:of|=|:)\s*"
        r"(\d+(?:\.\d+)?)",

        r"\b(?:FAR|FSI)\s+"
        r"(?:shall be|is|may be)\s*"
        r"(\d+(?:\.\d+)?)",

        r"\b(?:maximum|permissible)\s+FAR\s*"
        r"(?:of|=|:)?\s*"
        r"(\d+(?:\.\d+)?)",
    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        for value in matches:

            far = float(value)

            if far not in values:
                values.append(far)

    return sorted(values)


# =============================================================
# HEIGHT
# =============================================================

def extract_height_values(
    text: str,
) -> list[float]:

    commercial_controls = (
        extract_commercial_controls(text)
    )

    if commercial_controls:

        values = [

            control["height_m"]

            for control
            in commercial_controls.values()

            if control.get(
                "height_m"
            ) is not None
        ]

        return sorted(
            set(values)
        )

    values = []

    patterns = [

        r"\bheight\s*"
        r"(?:of|up to|shall be|is|may be)?\s*"
        r"(\d+(?:\.\d+)?)\s*m",

        r"\bmaximum height\s*"
        r"[:\-]?\s*"
        r"(\d+(?:\.\d+)?)\s*m",
    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        for value in matches:

            height = float(value)

            if height not in values:
                values.append(height)

    return sorted(values)


# =============================================================
# MAXIMUM HEIGHT
# =============================================================

def extract_maximum_height(
    text: str,
) -> list[float]:
    """
    Return actual numerical height values instead of
    large raw text fragments.

    This intentionally avoids returning entire table rows.
    """

    return extract_height_values(text)


# =============================================================
# SETBACKS
# =============================================================

def extract_setbacks(
    text: str,
) -> list[dict]:
    """
    Extract setback-related regulatory sections.

    Because setback requirements depend on plot size,
    building type and high-rise status, this function
    preserves the relevant regulatory section instead
    of pretending there is one universal setback.
    """

    normalized = _normalize_text(text)

    results = []

    patterns = [

        r"Setbacks for Multiple Buildings on a Single Plot"
        r".{0,1200}",

        r"Table 22 Minimum Setbacks for Single High-rise"
        r" Building on a Single Plot"
        r".{0,1200}",

        r"Setbacks for Multiple High-rise Buildings on a Single Plot"
        r".{0,1200}",

        r"Setbacks & Height for All Types of Non-High Rise Buildings"
        r".{0,1000}",

        r"TABLE\s*[–-]\s*17 Minimum Setbacks and Height Permissible"
        r".{0,1200}",
    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            normalized,
            flags=re.IGNORECASE,
        )

        for match in matches:

            cleaned = " ".join(
                match.split()
            )

            if cleaned:

                results.append(
                    {
                        "type": "regulatory_section",
                        "text": cleaned,
                    }
                )

    # Remove duplicate sections.
    unique = []

    seen = set()

    for item in results:

        value = item["text"]

        if value not in seen:

            seen.add(value)

            unique.append(item)

    return unique


# =============================================================
# PARKING
# =============================================================

def extract_parking(
    text: str,
) -> list[dict]:
    """
    Extract activity-specific parking requirements.

    Only accepts known/useful development categories so
    unrelated words from surrounding PDF text are not
    incorrectly interpreted as land-use categories.
    """

    normalized = _normalize_text(text)

    results = []

    # ---------------------------------------------------------
    # KNOWN DEVELOPMENT USES
    # ---------------------------------------------------------

    known_uses = [
        "Sub district centre",
        "Central business district",
        "Hotels",
        "Banks",
        "Cinema/multiplex",
        "Informal/bazaar market",
        "Warehousing/godowns",
        "Industrial",
        "Senior/higher secondary school",
        "Religious buildings",
        "clinical lab",
        "trauma centre",
        "biotech park",
    ]

    # ---------------------------------------------------------
    # PARSE PARKING REQUIREMENTS
    # ---------------------------------------------------------

    for use in known_uses:

        pattern = (
            re.escape(use)
            + r".{0,120}?"
            + r"(\d+(?:\.\d+)?)"
            + r"\s*ECS\s*/\s*100\s*m2"
            + r"(?:\s+area)?"
            + r"(?:\s+of\s+"
            r"(permissible FAR|covered area))?"
        )

        matches = re.findall(
            pattern,
            normalized,
            flags=re.IGNORECASE,
        )

        for match in matches:

            if isinstance(match, tuple):

                requirement = float(
                    match[0]
                )

                basis = (
                    match[1]
                    if match[1]
                    else "covered area"
                )

            else:

                requirement = float(
                    match
                )

                basis = "covered area"

            results.append(
                {
                    "use": use,
                    "requirement": requirement,
                    "unit": "ECS/100 m2",
                    "basis": basis,
                }
            )

    # ---------------------------------------------------------
    # REMOVE DUPLICATES
    # ---------------------------------------------------------

    unique = []

    seen = set()

    for item in results:

        key = (
            item["use"],
            item["requirement"],
            item["basis"],
        )

        if key not in seen:

            seen.add(key)

            unique.append(item)

    return unique

# =============================================================
# ROAD WIDTH
# =============================================================

def extract_road_width(
    text: str,
) -> list[dict]:
    """
    Extract explicit road/access-width requirements.

    Does not assume that every road-width number in a
    setback table is the minimum site-access requirement.
    """

    normalized = _normalize_text(text)

    results = []

    patterns = [

        r"minimum width of\s*"
        r"(\d+(?:\.\d+)?)\s*m",

        r"minimum\s+"
        r"(?:abutting\s+)?road\s+width"
        r".{0,100}?"
        r"(\d+(?:\.\d+)?)\s*m",

        r"public\s+road"
        r".{0,100}?"
        r"(\d+(?:\.\d+)?)\s*m",

        r"public\s+street"
        r".{0,100}?"
        r"(\d+(?:\.\d+)?)\s*m",
    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            normalized,
            flags=re.IGNORECASE,
        )

        for value in matches:

            width = float(value)

            if width not in [
                item["width_m"]
                for item in results
            ]:

                results.append(
                    {
                        "width_m": width,
                        "type": "explicit_requirement",
                    }
                )

    # ---------------------------------------------------------
    # PRESERVE IMPORTANT 12M FOOTPATH RULE
    # ---------------------------------------------------------

    if (
        "roads with row 12 m and above"
        in normalized.lower()
    ):

        results.append(
            {
                "width_m": 12.0,
                "type": "footpath_trigger",
                "description": (
                    "Footpath required for roads "
                    "with ROW 12 m and above."
                ),
            }
        )

    return results


# =============================================================
# GREEN / OPEN SPACE
# =============================================================

def extract_green_area(
    text: str,
) -> list[str]:

    normalized = _normalize_text(text)

    return _extract_matches(
        normalized,
        [
            r"\bgreen\s+area\b.{0,300}",

            r"\bgreenery\b.{0,300}",

            r"\blandscaping\b.{0,300}",

            r"\bopen\s+space\b.{0,300}",
        ],
    )


# =============================================================
# GROUND COVERAGE
# =============================================================

def extract_ground_coverage(
    text: str,
) -> list[float]:
    """
    Return explicit ground-coverage percentages.

    Table 24 values are preferred.
    """

    commercial_controls = (
        extract_commercial_controls(text)
    )

    if commercial_controls:

        values = [

            control[
                "ground_coverage_percent"
            ]

            for control
            in commercial_controls.values()
        ]

        return sorted(
            set(values)
        )

    values = []

    patterns = [

        r"ground\s+coverage"
        r".{0,100}?"
        r"(\d+(?:\.\d+)?)\s*%",

        r"plot\s+coverage"
        r".{0,100}?"
        r"(\d+(?:\.\d+)?)\s*%",
    ]

    for pattern in patterns:

        matches = re.findall(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        for value in matches:

            coverage = float(value)

            if coverage not in values:

                values.append(
                    coverage
                )

    return sorted(values)


# =============================================================
# MAIN RULE EXTRACTION
# =============================================================

def extract_rules(
    text: str,
) -> dict:
    """
    Convert retrieved regulation text into structured
    planning/regulatory information.

    The raw regulatory context remains available separately
    through retrieve_context().
    """

    normalized = _normalize_text(text)

    commercial_controls = (
        extract_commercial_controls(
            normalized
        )
    )

    far_values = extract_far_values(
        normalized
    )

    height_values = extract_height_values(
        normalized
    )

    setbacks = extract_setbacks(
        normalized
    )

    parking = extract_parking(
        normalized
    )

    road_width = extract_road_width(
        normalized
    )

    green_area = extract_green_area(
        normalized
    )

    ground_coverage = (
        extract_ground_coverage(
            normalized
        )
    )

    return {

        # -----------------------------------------------------
        # STRUCTURED TABLE 24 CONTROLS
        # -----------------------------------------------------

        "commercial_controls":
            commercial_controls,

        # -----------------------------------------------------
        # FAR / FSI
        # -----------------------------------------------------

        "far_values":
            far_values,

        "far_fsi":
            _extract_matches(
                normalized,
                [
                    r"Floor Area\s+Ratio\s*\(FAR\).*?"
                    r"(?:quotient|dividing).*?"
                    r"plot",

                    r"\bFAR\b.*?"
                    r"(?:total covered area|covered areas).*?"
                    r"(?:plot area)",

                    r"\bFSI\b.*?"
                    r"(?:Floor Space Index|Floor Area Ratio).*?",
                ],
            ),

        # -----------------------------------------------------
        # HEIGHT
        # -----------------------------------------------------

        "maximum_height":
            extract_maximum_height(
                normalized
            ),

        "height_values":
            height_values,

        # -----------------------------------------------------
        # SETBACKS
        # -----------------------------------------------------

        "setbacks":
            setbacks,

        # -----------------------------------------------------
        # PARKING
        # -----------------------------------------------------

        "parking":
            parking,

        # -----------------------------------------------------
        # ROAD WIDTH
        # -----------------------------------------------------

        "road_width":
            road_width,

        # -----------------------------------------------------
        # GREEN / OPEN SPACE
        # -----------------------------------------------------

        "green_area":
            green_area,

        # -----------------------------------------------------
        # GROUND COVERAGE
        # -----------------------------------------------------

        "ground_coverage":
            ground_coverage,
    }