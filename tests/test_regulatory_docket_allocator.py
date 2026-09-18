"""
Comprehensive Unit Tests for Regulatory Docket Allocator Intelligent Contract.
Author: k bee (k-beee)
"""

from datetime import datetime, timezone
import hashlib
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import tests.conftest
import genlayer as gl
from contracts.regulatory_docket_allocator import (
    RegulatoryDocketAllocator,
    STATE_ENROLLING,
    STATE_MANIFEST_LOCKED,
    STATE_IMPACT_CONSENSUS,
    STATE_WITNESSES_ALLOCATED,
    STATE_CONTESTATION_OPEN,
    STATE_SOVEREIGN_RATIFIED,
    STATE_ANNULLED_PRELOCK,
    CHALLENGE_PROVENANCE_MISMATCH,
    CHALLENGE_DUPLICATE_ASTROTURF,
    STATUS_ACCEPTED,
    STATUS_REJECTED,
    REASON_PRIMARY_IMPACT_WITNESS,
    REASON_UNSELECTED_PROVENANCE_DISQUALIFIED,
    REASON_UNSELECTED_DUPLICATE_ASTROTURF,
)
from scripts.docket_manifest import compute_manifest_digest

AGENCY_OFFICER: str = "0x1111111111111111111111111111111111111111"
LOBBYIST_A: str = "0x2222222222222222222222222222222222222222"
PUBLIC_ADVOCATE: str = "0x3333333333333333333333333333333333333333"

NPRM_CHARTER_URL: str = "https://regulations.gov/dockets/epa-2026-clean-air.txt"
NPRM_CHARTER_TEXT: str = "OFFICIAL NOTICE OF PROPOSED RULEMAKING: EPA-2026-CLEAN-AIR\nMandate: Establish national ambient standards for particulate emissions."
NPRM_CHARTER_DIGEST: str = hashlib.sha256(NPRM_CHARTER_TEXT.encode("utf-8")).hexdigest()


class TestRegulatoryDocketAllocator(unittest.TestCase):
    def setUp(self):
        gl.message.sender_address = AGENCY_OFFICER
        gl.nondet.web.clear()
        gl.nondet.set_llm_handler(None)
        gl.nondet.web.set_url_content(NPRM_CHARTER_URL, NPRM_CHARTER_TEXT)
        self.allocator = RegulatoryDocketAllocator()

    def _populate_sample_docket(self, submission_count: int = 3, slot_count: int = 2):
        now = int(datetime.now(timezone.utc).timestamp())
        submissions = []
        for i in range(1, submission_count + 1):
            sid = f"sub-{i}"
            url = f"https://regulations.gov/submissions/sub-{i}.txt"
            body = f"Public technical comment {i} regarding economic and health impacts"
            gl.nondet.web.set_url_content(url, body)
            s_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
            submissions.append({"submission_id": sid, "url": url, "digest": s_hash})

        manifest_digest = compute_manifest_digest(submissions)
        d_id = self.allocator.initialize_docket(
            NPRM_CHARTER_URL,
            NPRM_CHARTER_DIGEST,
            manifest_digest,
            slot_count,
            now + 3600,
            now + 7200,
        )

        for s in submissions:
            self.allocator.enroll_submission(d_id, s["submission_id"], s["url"], s["digest"])

        return d_id, submissions, manifest_digest

    # --------------------------------------------------------------------------
    # 1. Initialization & Pre-conditions
    # --------------------------------------------------------------------------

    def test_initialize_docket_success(self):
        now = int(datetime.now(timezone.utc).timestamp())
        d_id = self.allocator.initialize_docket(
            NPRM_CHARTER_URL, NPRM_CHARTER_DIGEST, "f" * 64, 5, now + 100, now + 200
        )
        self.assertEqual(d_id, 1)
        docket = json.loads(self.allocator.get_docket(d_id))
        self.assertEqual(docket["state"], STATE_ENROLLING)
        self.assertEqual(docket["slot_count"], 5)
        self.assertEqual(docket["organizer"], AGENCY_OFFICER)

    def test_initialize_docket_deadline_validation(self):
        now = int(datetime.now(timezone.utc).timestamp())
        # Past enrollment deadline
        with self.assertRaises(gl.vm.UserError):
            self.allocator.initialize_docket(
                NPRM_CHARTER_URL, NPRM_CHARTER_DIGEST, "f" * 64, 5, now - 10, now + 100
            )

        # Contestation before enrollment deadline
        with self.assertRaises(gl.vm.UserError):
            self.allocator.initialize_docket(
                NPRM_CHARTER_URL, NPRM_CHARTER_DIGEST, "f" * 64, 5, now + 200, now + 100
            )

    # --------------------------------------------------------------------------
    # 2. Submission Enrollment & Deduplication
    # --------------------------------------------------------------------------

    def test_enroll_submission_apa_receipt(self):
        now = int(datetime.now(timezone.utc).timestamp())
        d_id = self.allocator.initialize_docket(
            NPRM_CHARTER_URL, NPRM_CHARTER_DIGEST, "f" * 64, 2, now + 100, now + 200
        )
        idx = self.allocator.enroll_submission(d_id, "sub-01", "https://reg.gov/1.txt", "a" * 64)
        self.assertEqual(idx, 0)
        s = json.loads(self.allocator.get_submission_by_index(d_id, 0))
        self.assertEqual(s["submission_id"], "sub-01")
        self.assertTrue(len(s["enrollment_receipt"]) == 64)

    def test_enroll_submission_deduplication(self):
        now = int(datetime.now(timezone.utc).timestamp())
        d_id = self.allocator.initialize_docket(
            NPRM_CHARTER_URL, NPRM_CHARTER_DIGEST, "f" * 64, 2, now + 100, now + 200
        )
        self.allocator.enroll_submission(d_id, "sub-01", "https://reg.gov/1.txt", "a" * 64)

        # Duplicate ID
        with self.assertRaises(gl.vm.UserError):
            self.allocator.enroll_submission(d_id, "sub-01", "https://reg.gov/2.txt", "b" * 64)

        # Duplicate URL
        with self.assertRaises(gl.vm.UserError):
            self.allocator.enroll_submission(d_id, "sub-02", "https://reg.gov/1.txt", "c" * 64)

        # Duplicate Digest
        with self.assertRaises(gl.vm.UserError):
            self.allocator.enroll_submission(d_id, "sub-03", "https://reg.gov/3.txt", "a" * 64)

    # --------------------------------------------------------------------------
    # 3. Manifest Commitment Lock & Annulment
    # --------------------------------------------------------------------------

    def test_commit_and_lock_manifest_success(self):
        d_id, subs, expected_hash = self._populate_sample_docket(2, 2)
        calc_hash = self.allocator.commit_and_lock_manifest(d_id)
        self.assertEqual(calc_hash, expected_hash)
        docket = json.loads(self.allocator.get_docket(d_id))
        self.assertEqual(docket["state"], STATE_MANIFEST_LOCKED)

    def test_commit_and_lock_manifest_hash_mismatch(self):
        now = int(datetime.now(timezone.utc).timestamp())
        d_id = self.allocator.initialize_docket(
            NPRM_CHARTER_URL, NPRM_CHARTER_DIGEST, "0" * 64, 2, now + 100, now + 200
        )
        self.allocator.enroll_submission(d_id, "sub-01", "https://reg.gov/1.txt", "a" * 64)
        with self.assertRaises(gl.vm.UserError):
            self.allocator.commit_and_lock_manifest(d_id)

    def test_annul_docket_prelock_only(self):
        d_id, subs, _ = self._populate_sample_docket(2, 2)
        # Pre-lock annulment succeeds
        res = self.allocator.annul_docket(d_id)
        self.assertEqual(res, STATE_ANNULLED_PRELOCK)

        # Cannot lock an annulled docket
        with self.assertRaises(gl.vm.UserError):
            self.allocator.commit_and_lock_manifest(d_id)

    # --------------------------------------------------------------------------
    # 4. Impact Clustering & Equivalence Principle Validator
    # --------------------------------------------------------------------------

    def test_impact_clustering_equivalence_success(self):
        d_id, subs, expected_hash = self._populate_sample_docket(2, 2)
        self.allocator.commit_and_lock_manifest(d_id)

        mock_llm = {
            "clusters": [
                {"cluster_id": 1, "label": "Economic Burden & Small Business Compliance", "summary": "Direct costs on enterprise operations"},
                {"cluster_id": 2, "label": "Public Health & Epidemiological Baselines", "summary": "Asthma and mortality reduction metrics"},
            ],
            "evaluations": [
                {"submission_id": "sub-1", "cluster_id": 1, "relevance_score": 90, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                {"submission_id": "sub-2", "cluster_id": 2, "relevance_score": 85, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
            ],
        }
        gl.nondet.set_llm_handler(lambda prompt: json.dumps(mock_llm))

        res = self.allocator.cluster_submissions(d_id)
        clusters = json.loads(res)
        self.assertEqual(len(clusters), 2)
        docket = json.loads(self.allocator.get_docket(d_id))
        self.assertEqual(docket["state"], STATE_IMPACT_CONSENSUS)

    def test_impact_clustering_validator_rejection(self):
        d_id, subs, _ = self._populate_sample_docket(2, 2)
        self.allocator.commit_and_lock_manifest(d_id)

        call_count = 0
        def discordant_llm(prompt):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return json.dumps({
                    "clusters": [{"cluster_id": 1, "label": "Impact A", "summary": "A"}],
                    "evaluations": [
                        {"submission_id": "sub-1", "cluster_id": 1, "relevance_score": 95, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                        {"submission_id": "sub-2", "cluster_id": 1, "relevance_score": 90, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                    ],
                })
            else:
                return json.dumps({
                    "clusters": [
                        {"cluster_id": 1, "label": "Impact A", "summary": "A"},
                        {"cluster_id": 2, "label": "Impact B", "summary": "B"},
                    ],
                    "evaluations": [
                        {"submission_id": "sub-1", "cluster_id": 1, "relevance_score": 50, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                        {"submission_id": "sub-2", "cluster_id": 2, "relevance_score": 50, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                    ],
                })

        gl.nondet.set_llm_handler(discordant_llm)
        with self.assertRaises(gl.vm.UserError):
            self.allocator.cluster_submissions(d_id)

    # --------------------------------------------------------------------------
    # 5. Balanced Witness Sortition Policy
    # --------------------------------------------------------------------------

    def test_allocate_witnesses_balanced_coverage(self):
        d_id, subs, _ = self._populate_sample_docket(3, 2)
        self.allocator.commit_and_lock_manifest(d_id)

        mock_llm = {
            "clusters": [
                {"cluster_id": 1, "label": "Economic Compliance", "summary": "Costs"},
                {"cluster_id": 2, "label": "Public Health", "summary": "Baselines"},
            ],
            "evaluations": [
                {"submission_id": "sub-1", "cluster_id": 1, "relevance_score": 95, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                {"submission_id": "sub-2", "cluster_id": 1, "relevance_score": 85, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                {"submission_id": "sub-3", "cluster_id": 2, "relevance_score": 75, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
            ],
        }
        gl.nondet.set_llm_handler(lambda p: json.dumps(mock_llm))
        self.allocator.cluster_submissions(d_id)

        res = self.allocator.allocate_hearing_witnesses(d_id)
        witnesses = json.loads(res)
        self.assertEqual(len(witnesses), 2)
        # Even though sub-2 has higher score than sub-3, sub-3 is empanelled for cluster 2 coverage!
        witness_ids = [w["submission_id"] for w in witnesses]
        self.assertIn("sub-1", witness_ids)
        self.assertIn("sub-3", witness_ids)

    # --------------------------------------------------------------------------
    # 6. APA Evidentiary Disputes & Consensus Arbitration
    # --------------------------------------------------------------------------

    def test_contestation_duplicate_astroturf(self):
        d_id, subs, _ = self._populate_sample_docket(3, 2)
        self.allocator.commit_and_lock_manifest(d_id)

        mock_llm = {
            "clusters": [{"cluster_id": 1, "label": "Economic Impact", "summary": "Costs"}],
            "evaluations": [
                {"submission_id": "sub-1", "cluster_id": 1, "relevance_score": 90, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                {"submission_id": "sub-2", "cluster_id": 1, "relevance_score": 80, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                {"submission_id": "sub-3", "cluster_id": 1, "relevance_score": 70, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
            ],
        }
        gl.nondet.set_llm_handler(lambda p: json.dumps(mock_llm))
        self.allocator.cluster_submissions(d_id)
        self.allocator.allocate_hearing_witnesses(d_id)

        # File duplicate astroturf challenge against sub-1 and sub-2
        gl.message.sender_address = PUBLIC_ADVOCATE
        ch_id = self.allocator.open_contestation(d_id, CHALLENGE_DUPLICATE_ASTROTURF, json.dumps(["sub-1", "sub-2"]))
        self.assertEqual(ch_id, 1)

        # Arbitrate: LLM confirms duplicate form-letter for dispute, and clusters for re-clustering
        def smart_llm(p):
            if "near-duplicates" in p:
                return json.dumps({"is_duplicate": True, "similarity_reason": "Verbatim bot form-letter text"})
            return json.dumps(mock_llm)

        gl.nondet.set_llm_handler(smart_llm)

        res = json.loads(self.allocator.resolve_contestation(d_id, ch_id))
        self.assertEqual(res["status"], STATUS_ACCEPTED)

        # sub-2 (lower rank) is marked duplicate and disqualified
        s2 = json.loads(self.allocator.get_submission_by_id(d_id, "sub-2"))
        self.assertFalse(s2["eligible"])
        self.assertEqual(s2["exclusion_reason"], REASON_UNSELECTED_DUPLICATE_ASTROTURF)

    def test_contestation_provenance_mismatch(self):
        d_id, subs, _ = self._populate_sample_docket(3, 1)
        self.allocator.commit_and_lock_manifest(d_id)

        mock_llm = {
            "clusters": [{"cluster_id": 1, "label": "Impact A", "summary": "Summary"}],
            "evaluations": [
                {"submission_id": "sub-1", "cluster_id": 1, "relevance_score": 90, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                {"submission_id": "sub-2", "cluster_id": 1, "relevance_score": 80, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
                {"submission_id": "sub-3", "cluster_id": 1, "relevance_score": 70, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False},
            ],
        }
        gl.nondet.set_llm_handler(lambda p: json.dumps(mock_llm))
        self.allocator.cluster_submissions(d_id)
        self.allocator.allocate_hearing_witnesses(d_id)

        # Open challenge against sub-1
        gl.message.sender_address = PUBLIC_ADVOCATE
        ch_id = self.allocator.open_contestation(d_id, CHALLENGE_PROVENANCE_MISMATCH, json.dumps(["sub-1"]))

        # Alter web content of sub-1
        gl.nondet.web.set_url_content("https://regulations.gov/submissions/sub-1.txt", "Altered text post-freeze")

        # Resolve challenge
        res = json.loads(self.allocator.resolve_contestation(d_id, ch_id))
        self.assertEqual(res["status"], STATUS_ACCEPTED)

        s1 = json.loads(self.allocator.get_submission_by_id(d_id, "sub-1"))
        self.assertFalse(s1["eligible"])
        self.assertEqual(s1["exclusion_reason"], REASON_UNSELECTED_PROVENANCE_DISQUALIFIED)

        # sub-2 now takes the lead witness seat
        roll = json.loads(self.allocator.get_witness_roll(d_id))
        self.assertEqual(roll[0]["submission_id"], "sub-2")

    # --------------------------------------------------------------------------
    # 7. Ratification & Immutability
    # --------------------------------------------------------------------------

    def test_ratify_docket_lifecycle(self):
        now = int(datetime.now(timezone.utc).timestamp())
        body = "Study text"
        s_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
        gl.nondet.web.set_url_content("https://reg.gov/sub.txt", body)
        expected = compute_manifest_digest([{"submission_id": "sub-1", "url": "https://reg.gov/sub.txt", "digest": s_hash}])

        d_id = self.allocator.initialize_docket(NPRM_CHARTER_URL, NPRM_CHARTER_DIGEST, expected, 1, now + 1, now + 2)
        self.allocator.enroll_submission(d_id, "sub-1", "https://reg.gov/sub.txt", s_hash)
        self.allocator.commit_and_lock_manifest(d_id)

        mock_llm = {
            "clusters": [{"cluster_id": 1, "label": "Impact", "summary": "Sum"}],
            "evaluations": [{"submission_id": "sub-1", "cluster_id": 1, "relevance_score": 90, "is_duplicate": False, "duplicate_of_id": "", "is_irrelevant": False}],
        }
        gl.nondet.set_llm_handler(lambda p: json.dumps(mock_llm))

        self.allocator.cluster_submissions(d_id)
        self.allocator.allocate_hearing_witnesses(d_id)

        # Cannot ratify while contestation window is active
        with self.assertRaises(gl.vm.UserError):
            self.allocator.ratify_docket(d_id)


if __name__ == "__main__":
    unittest.main()
