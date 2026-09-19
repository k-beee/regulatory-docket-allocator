"""
Regression Test Suite: Verified Reproducible Application Dataset & Contract Bindings.
Author: k bee (k-beee)
"""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import tests.conftest
import genlayer as gl
from contracts.regulatory_docket_allocator import (
    RegulatoryDocketAllocator,
    STATE_ENROLLING,
    STATE_MANIFEST_LOCKED,
    STATE_ANNULLED_PRELOCK,
    STATE_WITNESSES_ALLOCATED,
    STATE_CONTESTATION_OPEN,
    CHALLENGE_DUPLICATE_ASTROTURF,
    CHALLENGE_PROVENANCE_MISMATCH,
)
from scripts.docket_manifest import compute_manifest_digest, build_canonical_manifest_string

AGENCY_OFFICER: str = "0x1111111111111111111111111111111111111111"
PUBLIC_STAKEHOLDER: str = "0x2222222222222222222222222222222222222222"

NPRM_CHARTER_URL = (
    "https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/nprm-epa-2026.txt"
)
NPRM_CHARTER_DIGEST = "af6d1c26d932fd08c75c0ba79e16105605a64c06f73e9790b2e9466b591d5e9a"
EXPECTED_MANIFEST_DIGEST = "23a385cf2c5e85b48af0b3a49c501ec4f03cfb7aa63510a425636cd3222f58e8"

CONFIGURED_DATASET = [
    {
        "submission_id": "EPA-SUB-001",
        "url": "https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub1-industry.txt",
        "digest": "a0e8fd652015c05be982defa160a2fdeac85a2197dbed36144a9b45e21acabab",
        "fixture_file": "sub1-industry.txt",
    },
    {
        "submission_id": "EPA-SUB-002",
        "url": "https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub2-epidemiology.txt",
        "digest": "e916f0efdf0b52c0107197daf9839953211b398bac86fc33deee06701ce12c4a",
        "fixture_file": "sub2-epidemiology.txt",
    },
    {
        "submission_id": "EPA-SUB-003",
        "url": "https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub3-small-biz.txt",
        "digest": "e2026a7df83c0056fe482bf95e60b57fb90444b58c1e5a10dc713a232d72d974",
        "fixture_file": "sub3-small-biz.txt",
    },
    {
        "submission_id": "EPA-SUB-004",
        "url": "https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub4-clean-tech.txt",
        "digest": "cdf7ac8836d3d728e084cfb3fb56a52c420411de3cf8d72eafa170be4f98e16c",
        "fixture_file": "sub4-clean-tech.txt",
    },
    {
        "submission_id": "EPA-SUB-005",
        "url": "https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub5-tampered-sample.txt",
        "digest": "03043ced0923843fb2d29f53ba2e91b4d57d6e9cd0ebf33264759389aeb95753",
        "fixture_file": "sub5-tampered-sample.txt",
    },
]


class TestReproducibleDatasetWorkflow(unittest.TestCase):
    def setUp(self):
        gl.message.sender_address = AGENCY_OFFICER
        gl.nondet.web.clear()
        gl.nondet.set_llm_handler(None)
        self.allocator = RegulatoryDocketAllocator()

    def test_fixture_files_integrity(self):
        """Assert that local checked-in fixture files exactly match the configured SHA-256 digests."""
        fixtures_dir = Path(__file__).resolve().parent.parent / "frontend" / "public" / "fixtures"

        # Verify charter fixture
        charter_path = fixtures_dir / "nprm-epa-2026.txt"
        self.assertTrue(charter_path.exists(), f"Missing charter fixture: {charter_path}")
        charter_content = charter_path.read_bytes()
        actual_charter_hash = hashlib.sha256(charter_content).hexdigest()
        self.assertEqual(actual_charter_hash, NPRM_CHARTER_DIGEST)

        # Verify each submission fixture
        for item in CONFIGURED_DATASET:
            p = fixtures_dir / item["fixture_file"]
            self.assertTrue(p.exists(), f"Missing fixture file: {p}")
            content = p.read_bytes()
            actual_hash = hashlib.sha256(content).hexdigest()
            self.assertEqual(actual_hash, item["digest"], f"Digest mismatch for {item['fixture_file']}")

    def test_configured_dataset_manifest_hash(self):
        """Assert that the canonical manifest string of the 5 submissions hashes to EXPECTED_MANIFEST_DIGEST."""
        calculated = compute_manifest_digest(CONFIGURED_DATASET)
        self.assertEqual(calculated, EXPECTED_MANIFEST_DIGEST)

    def test_manifest_lock_workflow_success(self):
        """Assert the full repository-defined workflow passes commit_and_lock_manifest without mismatch error."""
        now = int(datetime.now(timezone.utc).timestamp())
        d_id = self.allocator.initialize_docket(
            NPRM_CHARTER_URL,
            NPRM_CHARTER_DIGEST,
            EXPECTED_MANIFEST_DIGEST,
            3,
            now + 86400,
            now + 172800,
        )
        self.assertEqual(d_id, 1)

        # Enroll all 5 submissions from the configured dataset
        for s in CONFIGURED_DATASET:
            self.allocator.enroll_submission(d_id, s["submission_id"], s["url"], s["digest"])

        docket_before_lock = json.loads(self.allocator.get_docket(d_id))
        self.assertEqual(docket_before_lock["state"], STATE_ENROLLING)
        self.assertEqual(docket_before_lock["submission_count"], 5)

        # Execute manifest lock
        locked_hash = self.allocator.commit_and_lock_manifest(d_id)
        self.assertEqual(locked_hash, EXPECTED_MANIFEST_DIGEST)

        docket_after_lock = json.loads(self.allocator.get_docket(d_id))
        self.assertEqual(docket_after_lock["state"], STATE_MANIFEST_LOCKED)
        self.assertEqual(docket_after_lock["computed_manifest_digest"], EXPECTED_MANIFEST_DIGEST)

    def test_annul_docket_signature_binding(self):
        """Assert annul_docket accepts only docket_id: u256 matching the contract interface."""
        now = int(datetime.now(timezone.utc).timestamp())
        d_id = self.allocator.initialize_docket(
            NPRM_CHARTER_URL,
            NPRM_CHARTER_DIGEST,
            EXPECTED_MANIFEST_DIGEST,
            3,
            now + 86400,
            now + 172800,
        )
        # Calling with exactly 1 parameter: docket_id
        res = self.allocator.annul_docket(d_id)
        self.assertEqual(res, STATE_ANNULLED_PRELOCK)

        docket = json.loads(self.allocator.get_docket(d_id))
        self.assertEqual(docket["state"], STATE_ANNULLED_PRELOCK)
        self.assertIn("Administrative annulment", docket["annulment_reason"])

    def test_open_contestation_signature_binding(self):
        """Assert open_contestation accepts (docket_id, challenge_type, targets_json) and stores clean record."""
        now = int(datetime.now(timezone.utc).timestamp())
        d_id = self.allocator.initialize_docket(
            NPRM_CHARTER_URL,
            NPRM_CHARTER_DIGEST,
            EXPECTED_MANIFEST_DIGEST,
            3,
            now + 86400,
            now + 172800,
        )
        for s in CONFIGURED_DATASET:
            self.allocator.enroll_submission(d_id, s["submission_id"], s["url"], s["digest"])

        self.allocator.commit_and_lock_manifest(d_id)

        # Emulate reaching WITNESSES_ALLOCATED state
        docket = self.allocator._retrieve_docket(d_id)
        docket["state"] = STATE_WITNESSES_ALLOCATED
        self.allocator._persist_docket(d_id, docket)

        # Open contestation with only docket_id, challenge_type, and target JSON string
        gl.message.sender_address = PUBLIC_STAKEHOLDER
        target_ids = ["EPA-SUB-003", "EPA-SUB-005"]
        ch_id = self.allocator.open_contestation(
            d_id,
            CHALLENGE_DUPLICATE_ASTROTURF,
            json.dumps(target_ids),
        )
        self.assertEqual(ch_id, 1)

        docket_updated = self.allocator._retrieve_docket(d_id)
        self.assertEqual(docket_updated["state"], STATE_CONTESTATION_OPEN)
        all_contestations = json.loads(self.allocator.get_all_contestations(d_id))
        self.assertEqual(len(all_contestations), 1)
        record = all_contestations[0]
        self.assertEqual(record["id"], 1)
        self.assertEqual(record["challenge_type"], CHALLENGE_DUPLICATE_ASTROTURF)
        self.assertEqual(record["target_ids"], target_ids)
        self.assertEqual(record["challenger"], PUBLIC_STAKEHOLDER)


if __name__ == "__main__":
    unittest.main()
