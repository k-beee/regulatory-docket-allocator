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


# ==============================================================================
# 3. Deterministic Balanced Witness Sortition Engine
# ==============================================================================

def _witness_tiebreak_key(sub: dict) -> tuple:
    """Deterministic tie-breaker: descending relevance score, ascending digest, ascending index."""
    relevance = int(sub.get("relevance_score", 0))
    digest = str(sub.get("digest", "")).lower()
    index = int(sub.get("index", 0))
    return (-relevance, digest, index)


def _execute_witness_sortition_algorithm(slot_count: int, submissions: list, clusters: list) -> list:
    """Execute two-pass balanced witness sortition ensuring full impact domain coverage."""
    # Reset selection state
    for s in submissions:
        s["selected"] = False
        s["selection_rank"] = 0
        s["reason_code"] = ""
        s["rationale"] = ""

    # Filter eligible pool
    eligible_pool = [
        s for s in submissions
        if s.get("eligible", True)
        and int(s.get("cluster_id", 0)) > 0
        and not s.get("is_duplicate", False)
        and not s.get("is_irrelevant", False)
    ]

    cluster_delegate_tally = {int(c["cluster_id"]): 0 for c in clusters}
    selected_witnesses = []

    # Pass 1: Perspective Coverage Pass (Top witness per impact cluster)
    for c in clusters:
        cid = int(c["cluster_id"])
        c_candidates = [s for s in eligible_pool if int(s["cluster_id"]) == cid]
        if not c_candidates:
            continue

        c_candidates.sort(key=_witness_tiebreak_key)
        top_witness = c_candidates[0]
        top_witness["selected"] = True
        top_witness["reason_code"] = REASON_PRIMARY_IMPACT_WITNESS
        top_witness["rationale"] = f"Empanelled as lead oral hearing witness for Impact Vector #{cid}: {c.get('label', '')}"
        selected_witnesses.append(top_witness)
        cluster_delegate_tally[cid] = 1

        if len(selected_witnesses) >= slot_count:
            break

    # Pass 2: Proportional Depth Pass (Fill remaining seats globally)
    if len(selected_witnesses) < slot_count:
        remaining_candidates = [s for s in eligible_pool if not s["selected"]]
        remaining_candidates.sort(key=_witness_tiebreak_key)

        for candidate in remaining_candidates:
            cid = int(candidate["cluster_id"])
            if cluster_delegate_tally.get(cid, 0) >= MAX_WITNESSES_PER_IMPACT_CLUSTER:
                continue

            candidate["selected"] = True
            candidate["reason_code"] = REASON_SECONDARY_IMPACT_DEPTH
            candidate["rationale"] = f"Empanelled as depth hearing witness for Impact Vector #{cid} (Relevance {candidate['relevance_score']})"
            selected_witnesses.append(candidate)
            cluster_delegate_tally[cid] = cluster_delegate_tally.get(cid, 0) + 1

            if len(selected_witnesses) >= slot_count:
                break

    # Assign final rank order
    selected_witnesses.sort(key=lambda s: (-int(s.get("relevance_score", 0)), str(s.get("digest", "")), int(s.get("index", 0))))
    for rank, w in enumerate(selected_witnesses, start=1):
        w["selection_rank"] = rank

    # Tag unselected submissions with explanatory reasons
    for s in submissions:
        if s["selected"]:
            continue
        if not s.get("eligible", True):
            if s.get("exclusion_reason") == REASON_UNSELECTED_PROVENANCE_DISQUALIFIED:
                s["reason_code"] = REASON_UNSELECTED_PROVENANCE_DISQUALIFIED
                s["rationale"] = "Disqualified: Web content altered after manifest freeze (cryptographic hash mismatch)"
            elif s.get("exclusion_reason") == REASON_UNSELECTED_DUPLICATE_ASTROTURF:
                s["reason_code"] = REASON_UNSELECTED_DUPLICATE_ASTROTURF
                s["rationale"] = f"Disqualified: Confirmed duplicate form-letter astroturfing of {s.get('duplicate_of_id', '')}"
            else:
                s["reason_code"] = REASON_UNSELECTED_OUT_OF_SCOPE
                s["rationale"] = "Evaluated as out of scope or irrelevant to published NPRM charter"
        elif int(s.get("cluster_id", 0)) == 0:
            s["reason_code"] = REASON_UNSELECTED_OUT_OF_SCOPE
            s["rationale"] = "Evaluated as out of scope or irrelevant to published NPRM charter"
        elif s.get("is_duplicate", False):
            s["reason_code"] = REASON_UNSELECTED_DUPLICATE_ASTROTURF
            s["rationale"] = f"Identified as near-duplicate astroturfed submission of {s.get('duplicate_of_id', '')}"
        elif cluster_delegate_tally.get(int(s.get("cluster_id", 0)), 0) >= MAX_WITNESSES_PER_IMPACT_CLUSTER:
            s["reason_code"] = REASON_UNSELECTED_IMPACT_CAP
            s["rationale"] = f"Impact Vector {s['cluster_id']} reached maximum capacity cap of {MAX_WITNESSES_PER_IMPACT_CLUSTER} witnesses"
        elif len(selected_witnesses) >= slot_count:
            s["reason_code"] = REASON_UNSELECTED_SLOT_CAPACITY
            s["rationale"] = "Unselected: Hearing witness schedule capacity filled with higher-ranked candidates"
        else:
            s["reason_code"] = REASON_UNSELECTED_LOWER_RELEVANCE
            s["rationale"] = "Unselected: Lower substantive relevance score or tie-break ranking"

    return selected_witnesses


# ==============================================================================
# 4. RegulatoryDocketAllocator Intelligent Contract
# ==============================================================================

class RegulatoryDocketAllocator(gl.Contract):
    """GenLayer Intelligent Contract orchestrating transparent administrative rulemaking sortition."""

    docket_count: u256
    dockets: TreeMap[u256, str]

    def __init__(self):
        self.docket_count = u256(0)
        self.dockets = TreeMap()

    def _retrieve_docket(self, docket_id: int) -> dict:
        """Load and deserialize regulatory docket state from persistent storage."""
        key = u256(docket_id)
        if key not in self.dockets:
            raise gl.vm.UserError(f"ERR_DOCKET_NOT_FOUND: Regulatory docket {docket_id} does not exist")
        return json.loads(self.dockets[key])

    def _persist_docket(self, docket_id: int, docket: dict) -> None:
        """Serialize and persist updated regulatory docket state."""
        key = u256(docket_id)
        self.dockets[key] = json.dumps(docket)

    @gl.public.write
    def initialize_docket(
        self,
        proposal_url: str,
        proposal_digest: str,
        expected_manifest_digest: str,
        slot_count: u256,
        enrollment_deadline: u256,
        contestation_deadline: u256,
    ) -> u256:
        """Initialize a new administrative rulemaking docket in the ENROLLING state."""
        if not _validate_http_url(proposal_url):
            raise gl.vm.UserError("ERR_INVALID_PROPOSAL_URL: NPRM charter must be a valid public HTTP/HTTPS URL")
        if not _validate_sha256_digest(proposal_digest):
            raise gl.vm.UserError("ERR_INVALID_PROPOSAL_DIGEST: Proposal digest must be 64-char hexadecimal SHA-256")
        if not _validate_sha256_digest(expected_manifest_digest):
            raise gl.vm.UserError("ERR_INVALID_MANIFEST_DIGEST: Expected manifest digest must be 64-char hexadecimal SHA-256")
        if not (MIN_WITNESS_SLOTS <= int(slot_count) <= MAX_WITNESS_SLOTS):
            raise gl.vm.UserError(
                f"ERR_INVALID_SLOT_COUNT: Witness slot capacity must be between {MIN_WITNESS_SLOTS} and {MAX_WITNESS_SLOTS}"
            )

        now = _current_timestamp_utc()
        if int(enrollment_deadline) <= now:
            raise gl.vm.UserError(
                f"ERR_PAST_DEADLINE: Comment enrollment deadline ({enrollment_deadline}) must be strictly in the future (> {now})"
            )
        if int(contestation_deadline) <= int(enrollment_deadline):
            raise gl.vm.UserError(
                f"ERR_INVALID_SEQUENCE: Contestation deadline ({contestation_deadline}) must succeed enrollment deadline ({enrollment_deadline})"
            )

        agency_officer = _resolve_transaction_caller()
        self.docket_count = u256(int(self.docket_count) + 1)
        d_id = int(self.docket_count)

        docket_state = {
            "id": d_id,
            "organizer": agency_officer,
            "admission_authority": agency_officer,
            "proposal_url": proposal_url.strip(),
            "proposal_digest": proposal_digest.strip().lower(),
            "expected_manifest_digest": expected_manifest_digest.strip().lower(),
            "computed_manifest_digest": "",
            "slot_count": int(slot_count),
            "enrollment_deadline": int(enrollment_deadline),
            "contestation_deadline": int(contestation_deadline),
            "state": STATE_ENROLLING,
            "revision": 1,
            "submissions": [],
            "clusters": [],
            "contestations": [],
            "contestation_keys": [],
            "accepted_contestation_count": 0,
            "annulment_reason": "",
        }

        self._persist_docket(d_id, docket_state)
        return u256(d_id)

    @gl.public.write
    def enroll_submission(
        self,
        docket_id: u256,
        submission_id: str,
        url: str,
        digest: str,
    ) -> u256:
        """Enroll an official public comment or scientific study into the regulatory docket."""
        docket = self._retrieve_docket(int(docket_id))
        caller = _resolve_transaction_caller()

        if caller != docket["admission_authority"]:
            raise gl.vm.UserError(
                f"ERR_UNAUTHORIZED_REGISTRAR: Caller {caller} is not docket admission authority ({docket['admission_authority']})"
            )
        if docket["state"] != STATE_ENROLLING:
            raise gl.vm.UserError(
                f"ERR_INVALID_LIFECYCLE_STATE: Docket is in state {docket['state']}, expected ENROLLING"
            )

        now = _current_timestamp_utc()
        if now >= docket["enrollment_deadline"]:
            raise gl.vm.UserError(
                f"ERR_ENROLLMENT_EXPIRED: Enrollment deadline {docket['enrollment_deadline']} has lapsed (now {now})"
            )

        clean_id = submission_id.strip()
        clean_url = url.strip()
        clean_digest = digest.strip().lower()

        if not clean_id:
            raise gl.vm.UserError("ERR_INVALID_SUBMISSION_ID: Submission identifier cannot be empty")
        if _has_forbidden_delimiters(clean_id):
            raise gl.vm.UserError(f"ERR_FORBIDDEN_CHARACTERS: Submission ID '{clean_id}' contains delimiters or control characters")
        if not _validate_http_url(clean_url):
            raise gl.vm.UserError(f"ERR_INVALID_SUBMISSION_URL: URL '{clean_url}' is not a valid public HTTP/HTTPS URL")
        if not _validate_sha256_digest(clean_digest):
            raise gl.vm.UserError(f"ERR_INVALID_DIGEST: Digest '{clean_digest}' is not a 64-char hexadecimal SHA-256")

        # Deduplication checks
        for existing in docket["submissions"]:
            if existing["submission_id"] == clean_id:
                raise gl.vm.UserError(f"ERR_DUPLICATE_ID: Submission ID '{clean_id}' is already enrolled in this docket")
            if existing["url"] == clean_url:
                raise gl.vm.UserError(f"ERR_DUPLICATE_URL: Submission URL '{clean_url}' is already enrolled in this docket")
            if existing["digest"] == clean_digest:
                raise gl.vm.UserError(f"ERR_DUPLICATE_DIGEST: Content digest '{clean_digest}' is already enrolled in this docket")

        idx = len(docket["submissions"])
        receipt = _compute_apa_compliance_receipt(int(docket_id), clean_id, clean_url, clean_digest, caller)

        record = {
            "index": idx,
            "submission_id": clean_id,
            "url": clean_url,
            "digest": clean_digest,
            "registrar": caller,
            "admission_authority": docket["admission_authority"],
            "enrollment_receipt": receipt,
            "eligible": True,
            "exclusion_reason": "",
            "cluster_id": 0,
            "cluster_label": "",
            "relevance_score": 0,
            "is_duplicate": False,
            "duplicate_of_id": "",
            "selected": False,
            "selection_rank": 0,
            "reason_code": "",
            "rationale": "",
        }

        docket["submissions"].append(record)
        self._persist_docket(int(docket_id), docket)
        return u256(idx)

    @gl.public.write
    def commit_and_lock_manifest(self, docket_id: u256) -> str:
        """Freeze enrolled submission batch and verify canonical manifest digest against precommitted target."""
        docket = self._retrieve_docket(int(docket_id))
        caller = _resolve_transaction_caller()
        if caller != docket["organizer"]:
            raise gl.vm.UserError(f"ERR_UNAUTHORIZED: Caller {caller} is not docket organizer ({docket['organizer']})")
        if docket["state"] != STATE_ENROLLING:
            raise gl.vm.UserError(f"ERR_INVALID_LIFECYCLE_STATE: Docket is in state {docket['state']}, expected ENROLLING")
        if len(docket["submissions"]) == 0:
            raise gl.vm.UserError("ERR_EMPTY_DOCKET: Cannot lock an empty submission manifest")

        # Re-verify all enrollment receipts at lock boundary
        for s in docket["submissions"]:
            if s.get("registrar") != docket["admission_authority"]:
                raise gl.vm.UserError("ERR_UNAUTHORIZED_REGISTRAR: Enrolled submission registrar does not match admission authority")
            expected_receipt = _compute_apa_compliance_receipt(
                int(docket_id), s["submission_id"], s["url"], s["digest"], s["registrar"]
            )
            if s.get("enrollment_receipt") != expected_receipt:
                raise gl.vm.UserError("ERR_RECEIPT_TAMPERED: APA compliance receipt does not match submission record")

        computed_hash = _compute_manifest_hash(docket["submissions"])
        if computed_hash != docket["expected_manifest_digest"]:
            raise gl.vm.UserError(
                f"ERR_MANIFEST_HASH_MISMATCH: Computed manifest hash ({computed_hash}) does not match expected target ({docket['expected_manifest_digest']})"
            )

        docket["computed_manifest_digest"] = computed_hash
        docket["state"] = STATE_MANIFEST_LOCKED
        self._persist_docket(int(docket_id), docket)
        return computed_hash

    @gl.public.write
    def annul_docket(self, docket_id: u256) -> str:
        """Agency recovery path to abort an enrollment batch before cryptographic freeze."""
        docket = self._retrieve_docket(int(docket_id))
        caller = _resolve_transaction_caller()
        if caller != docket["organizer"]:
            raise gl.vm.UserError(f"ERR_UNAUTHORIZED: Caller {caller} is not docket organizer ({docket['organizer']})")
        if docket["state"] != STATE_ENROLLING:
            raise gl.vm.UserError(
                f"ERR_IMMUTABLE_AFTER_LOCK: Cannot annul docket in state {docket['state']}; only ENROLLING dockets may be annulled"
            )

        docket["state"] = STATE_ANNULLED_PRELOCK
        docket["annulment_reason"] = f"Administrative annulment executed by {caller} prior to manifest lock"
        self._persist_docket(int(docket_id), docket)
        return STATE_ANNULLED_PRELOCK
