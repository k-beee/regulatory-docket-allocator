"""
Unit tests for canonical rulemaking docket manifest builder.
"""

import hashlib
import unittest
from scripts.docket_manifest import (
    validate_submission_entry,
    format_canonical_manifest_entry,
    build_canonical_manifest_string,
    compute_manifest_digest,
)


class TestDocketManifest(unittest.TestCase):
    def setUp(self):
        self.sample_submissions = [
            {
                "submission_id": "sub-pharma-01",
                "url": "https://regulations.gov/docket/sub-01.txt",
                "digest": "a" * 64,
            },
            {
                "submission_id": "sub-public-health-02",
                "url": "https://regulations.gov/docket/sub-02.txt",
                "digest": "b" * 64,
            },
            {
                "submission_id": "sub-small-biz-03",
                "url": "https://regulations.gov/docket/sub-03.txt",
                "digest": "c" * 64,
            },
        ]

    def test_validate_entry_success(self):
        entry = self.sample_submissions[0]
        res = validate_submission_entry(entry)
        self.assertEqual(res["submission_id"], "sub-pharma-01")
        self.assertEqual(res["url"], "https://regulations.gov/docket/sub-01.txt")
        self.assertEqual(res["digest"], "a" * 64)

    def test_validate_entry_invalid_url(self):
        with self.assertRaises(ValueError):
            validate_submission_entry({"submission_id": "s1", "url": "ftp://bad-url", "digest": "a" * 64})

    def test_validate_entry_forbidden_delimiters(self):
        with self.assertRaises(ValueError):
            validate_submission_entry({"submission_id": "s1|pipe", "url": "https://reg.gov", "digest": "a" * 64})

    def test_build_canonical_manifest_sorting(self):
        shuffled = [self.sample_submissions[2], self.sample_submissions[0], self.sample_submissions[1]]
        manifest = build_canonical_manifest_string(shuffled)
        lines = manifest.split("\n")
        self.assertTrue(lines[0].startswith("sub-pharma-01"))
        self.assertTrue(lines[1].startswith("sub-public-health-02"))
        self.assertTrue(lines[2].startswith("sub-small-biz-03"))

    def test_compute_manifest_digest_invariance(self):
        hash1 = compute_manifest_digest(self.sample_submissions)
        hash2 = compute_manifest_digest(list(reversed(self.sample_submissions)))
        self.assertEqual(hash1, hash2)
        self.assertEqual(len(hash1), 64)


if __name__ == "__main__":
    unittest.main()
