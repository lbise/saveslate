"""Import AI service tests."""

import json

from app.services.import_ai import _parse_suggestions


def test_parse_suggestions_ignores_disabled_description_cleaning():
    suggestions = _parse_suggestions(
        response_text=json.dumps({
            "suggestions": [
                {
                    "rowIndex": 0,
                    "cleanedDescription": "Migros Basel",
                    "categoryId": "cat-food",
                    "confidence": 0.94,
                    "reason": "Known grocery merchant",
                    "ruleKeyword": "migros",
                }
            ]
        }),
        allowed_row_indexes={0},
        row_descriptions={0: "Grocery Store"},
        allowed_category_ids={"cat-food"},
        uncategorized_row_indexes={0},
        clean_descriptions=False,
        categorize=True,
    )

    assert len(suggestions) == 1
    assert suggestions[0].cleaned_description is None
    assert suggestions[0].category_id == "cat-food"


def test_parse_suggestions_ignores_disabled_categorization():
    suggestions = _parse_suggestions(
        response_text=json.dumps({
            "suggestions": [
                {
                    "rowIndex": 0,
                    "cleanedDescription": "Migros Basel",
                    "categoryId": "cat-food",
                    "confidence": 0.94,
                    "reason": "Cleaned merchant name",
                    "ruleKeyword": "migros",
                }
            ]
        }),
        allowed_row_indexes={0},
        row_descriptions={0: "Grocery Store"},
        allowed_category_ids={"cat-food"},
        uncategorized_row_indexes={0},
        clean_descriptions=True,
        categorize=False,
    )

    assert len(suggestions) == 1
    assert suggestions[0].cleaned_description == "Migros Basel"
    assert suggestions[0].category_id is None
    assert suggestions[0].rule_keyword is None
