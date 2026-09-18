"""
Regulatory Docket Allocator — GenLayer Intelligent Contract
=============================================================
Orchestrating verifiable Administrative Procedure Act (APA) public comment
allocation, non-deterministic regulatory impact clustering, and balanced
oral hearing witness sortition on GenLayer Studionet.

Author: k bee (k-beee)
License: MIT
"""

from datetime import datetime, timezone
import hashlib
import json
import re
import typing

import genlayer as gl
from genlayer import TreeMap, u256


# ==============================================================================
# 1. Operational Constants & APA Rulemaking Bounds
# ==============================================================================

MIN_WITNESS_SLOTS: int = 1
MAX_WITNESS_SLOTS: int = 50

MIN_REGULATORY_IMPACT_CLUSTERS: int = 1
MAX_REGULATORY_IMPACT_CLUSTERS: int = 6
MAX_WITNESSES_PER_IMPACT_CLUSTER: int = 3

# Seven-Phase Lifecycle Machine
STATE_ENROLLING: str = "ENROLLING"
STATE_MANIFEST_LOCKED: str = "MANIFEST_LOCKED"
STATE_IMPACT_CONSENSUS: str = "IMPACT_CONSENSUS"
STATE_WITNESSES_ALLOCATED: str = "WITNESSES_ALLOCATED"
STATE_CONTESTATION_OPEN: str = "CONTESTATION_OPEN"
STATE_SOVEREIGN_RATIFIED: str = "SOVEREIGN_RATIFIED"
STATE_ANNULLED_PRELOCK: str = "ANNULLED_PRELOCK"

# APA Evidentiary Dispute Categories
CHALLENGE_PROVENANCE_MISMATCH: str = "PROVENANCE_MISMATCH"
CHALLENGE_DUPLICATE_ASTROTURF: str = "DUPLICATE_ASTROTURF"

# Adjudication Statuses
STATUS_PENDING: str = "PENDING"
STATUS_ACCEPTED: str = "ACCEPTED"
STATUS_REJECTED: str = "REJECTED"

# Standardized Witness Selection Rationale Codes
REASON_PRIMARY_IMPACT_WITNESS: str = "PRIMARY_IMPACT_WITNESS"
REASON_SECONDARY_IMPACT_DEPTH: str = "SECONDARY_IMPACT_DEPTH"
REASON_UNSELECTED_IMPACT_CAP: str = "IMPACT_CAP_REACHED"
REASON_UNSELECTED_SLOT_CAPACITY: str = "SLOT_CAPACITY_LIMIT"
REASON_UNSELECTED_LOWER_RELEVANCE: str = "LOWER_RELEVANCE_RANKING"
REASON_UNSELECTED_DUPLICATE_ASTROTURF: str = "DUPLICATE_ASTROTURF"
REASON_UNSELECTED_PROVENANCE_DISQUALIFIED: str = "PROVENANCE_DISQUALIFIED"
REASON_UNSELECTED_OUT_OF_SCOPE: str = "OUT_OF_SCOPE_IRRELEVANT"


# ==============================================================================
# 2. Cryptographic Verification & Address Normalization Helpers
# ==============================================================================

def _canonicalize_address(addr: typing.Any) -> str:
    """Normalize address representation into 42-char lowercase hex string."""
    if hasattr(addr, "as_hex"):
        return str(addr.as_hex).lower()
    if isinstance(addr, str):
        clean = addr.strip().lower()
        return clean if clean.startswith("0x") else "0x" + clean
    if isinstance(addr, int):
        return "0x" + f"{addr:040x}"
    if isinstance(addr, (bytes, bytearray)):
        return "0x" + addr.hex().lower()
    return str(addr).lower()


def _is_valid_hex_address(addr: str) -> bool:
    """Validate 42-char 0x-prefixed hexadecimal Ethereum/GenLayer address."""
    if not isinstance(addr, str) or len(addr) != 42 or not addr.startswith("0x"):
        return False
    return all(c in "0123456789abcdefABCDEF" for c in addr[2:])


def _resolve_transaction_caller() -> str:
    """Obtain validated transaction sender from GenVM execution context. Fails closed."""
    try:
        caller = gl.message.sender_address
    except Exception as err:
        raise gl.vm.UserError(f"ERR_CALLER_UNAVAILABLE: Execution context sender unavailable: {err}")

    normalized = _canonicalize_address(caller)
    if not _is_valid_hex_address(normalized) or normalized == "0x0000000000000000000000000000000000000000":
        raise gl.vm.UserError("ERR_INVALID_CALLER: Caller address is invalid, malformed, or zero address")
    return normalized


def _current_timestamp_utc() -> int:
    """Deterministic transaction execution timestamp in UTC seconds."""
    return int(datetime.now(timezone.utc).timestamp())


def _has_forbidden_delimiters(val: str) -> bool:
    """Reject pipe delimiters, CR, LF, tabs, and ASCII control characters."""
    for char in val:
        code = ord(char)
        if char in ("|", "\r", "\n", "\t") or code < 32 or code == 127:
            return True
    return False


def _validate_sha256_digest(digest: str) -> bool:
    """Enforce strict 64-character lowercase hexadecimal format."""
    if not isinstance(digest, str) or len(digest) != 64:
        return False
    return all(c in "0123456789abcdefABCDEF" for c in digest)


def _validate_http_url(url: str) -> bool:
    """Validate HTTP/HTTPS URI scheme."""
    if not isinstance(url, str) or len(url) > 512:
        return False
    if _has_forbidden_delimiters(url):
        return False
    pattern = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.IGNORECASE)
    return bool(pattern.match(url.strip()))


def _compute_apa_compliance_receipt(
    docket_id: int, submission_id: str, url: str, digest: str, registrar: str
) -> str:
    """Compute tamper-proof APA compliance receipt hash for enrolled submission."""
    canonical_payload = (
        f"{docket_id}|{submission_id.strip()}|{url.strip()}|{digest.strip().lower()}|{registrar.lower()}"
    )
    return hashlib.sha256(canonical_payload.encode("utf-8")).hexdigest()


def _format_canonical_submission_line(sub: dict) -> str:
    """Format single submission into canonical pipe-delimited entry."""
    return f"{sub['submission_id'].strip()}|{sub['url'].strip()}|{sub['digest'].strip().lower()}"


def _build_canonical_manifest_string(submissions: list) -> str:
    """Assemble sorted canonical manifest text for cryptographic verification."""
    sorted_subs = sorted(submissions, key=lambda s: str(s["submission_id"]).strip())
    return "\n".join(_format_canonical_submission_line(s) for s in sorted_subs)


def _compute_manifest_hash(submissions: list) -> str:
    """Compute deterministic SHA-256 hash of entire sorted submission batch."""
    manifest_str = _build_canonical_manifest_string(submissions)
    return hashlib.sha256(manifest_str.encode("utf-8")).hexdigest().lower()


def _encode_json_compact(data: typing.Any) -> str:
    """Deterministic JSON serialization with sorted keys."""
    return json.dumps(data, separators=(",", ":"), sort_keys=True)
