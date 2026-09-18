"""
Canonical Rulemaking Docket Manifest Builder and Digest Calculator.
Administrative Rulemaking Allocator
"""

import hashlib
import json
import re
import sys
from typing import Any, Dict, List

_URL_PATTERN = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.IGNORECASE)
_SHA256_PATTERN = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)


def validate_submission_entry(entry: Dict[str, Any]) -> Dict[str, str]:
    """Validate and normalize a rulemaking submission manifest entry."""
    sub_id = str(entry.get("submission_id", "")).strip()
    url = str(entry.get("url", "")).strip()
    digest = str(entry.get("digest", "")).strip().lower()

    if not sub_id:
        raise ValueError("ERR_INVALID_SUBMISSION_ID: submission_id cannot be empty")
    if "|" in sub_id or "\n" in sub_id or "\r" in sub_id:
        raise ValueError(f"ERR_FORBIDDEN_CHARACTERS: submission_id '{sub_id}' contains delimiters")

    if not _URL_PATTERN.match(url):
        raise ValueError(f"ERR_INVALID_URL: '{url}' is not a valid HTTP/HTTPS URL")
    if "|" in url or "\n" in url or "\r" in url:
        raise ValueError(f"ERR_FORBIDDEN_CHARACTERS: url '{url}' contains delimiters")

    if not _SHA256_PATTERN.match(digest):
        raise ValueError(f"ERR_INVALID_DIGEST: '{digest}' is not a 64-char hexadecimal SHA-256 digest")

    return {
        "submission_id": sub_id,
        "url": url,
        "digest": digest,
    }


def format_canonical_manifest_entry(entry: Dict[str, Any]) -> str:
    """Format single entry into canonical pipe-delimited format."""
    clean = validate_submission_entry(entry)
    return f"{clean['submission_id']}|{clean['url']}|{clean['digest']}"


def build_canonical_manifest_string(submissions: List[Dict[str, Any]]) -> str:
    """Build canonical multi-line manifest string sorted lexicographically by submission_id."""
    clean_entries = [validate_submission_entry(e) for e in submissions]
    clean_entries.sort(key=lambda x: x["submission_id"])
    return "\n".join(format_canonical_manifest_entry(e) for e in clean_entries)


def compute_manifest_digest(submissions: List[Dict[str, Any]]) -> str:
    """Compute deterministic SHA-256 digest of the canonical manifest string."""
    manifest_str = build_canonical_manifest_string(submissions)
    return hashlib.sha256(manifest_str.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 docket_manifest.py <submissions.json>")
        sys.exit(1)

    with open(sys.argv[1], "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        print("Error: JSON must be an array of submission objects")
        sys.exit(1)

    manifest_hash = compute_manifest_digest(data)
    manifest_text = build_canonical_manifest_string(data)
    print(f"Canonical Manifest SHA-256: {manifest_hash}\n")
    print(manifest_text)
