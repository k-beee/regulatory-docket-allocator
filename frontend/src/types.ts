/**
 * Regulatory Docket Allocator Data Models & Types
 * Author: k bee (k-beee)
 */

export type LifecycleState =
  | 'ENROLLING'
  | 'MANIFEST_LOCKED'
  | 'IMPACT_CONSENSUS'
  | 'WITNESSES_ALLOCATED'
  | 'CONTESTATION_OPEN'
  | 'SOVEREIGN_RATIFIED'
  | 'ANNULLED_PRELOCK';

export type ChallengeType = 'PROVENANCE_MISMATCH' | 'DUPLICATE_ASTROTURF';

export type ContestationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface SubmissionRecord {
  index: number;
  submission_id: string;
  url: string;
  digest: string;
  registrar: string;
  admission_authority: string;
  enrollment_receipt: string;
  eligible: boolean;
  exclusion_reason: string;
  cluster_id: number;
  cluster_label: string;
  relevance_score: number;
  is_duplicate: boolean;
  duplicate_of_id: string;
  selected: boolean;
  selection_rank: number;
  reason_code: string;
  rationale: string;
}

export interface RegulatoryCluster {
  cluster_id: number;
  label: string;
  summary: string;
  submission_ids: string[];
}

export interface ContestationRecord {
  id: number;
  challenge_type: ChallengeType;
  target_ids: string[];
  challenger: string;
  status: ContestationStatus;
  resolution_reason: string;
  resolved_at_revision: number;
}

export interface DocketSummary {
  docket_id: number;
  organizer: string;
  admission_authority: string;
  proposal_url: string;
  proposal_digest: string;
  expected_manifest_digest: string;
  computed_manifest_digest: string;
  slot_count: number;
  enrollment_deadline: number;
  contestation_deadline: number;
  state: LifecycleState;
  submission_count: number;
  revision: number;
  accepted_contestation_count: number;
  pending_contestation_count: number;
  total_contestation_count: number;
  annulment_reason: string;
}

export interface AuditBundle {
  docket: DocketSummary;
  state: LifecycleState;
  regulatory_clusters: RegulatoryCluster[];
  selected_witnesses: SubmissionRecord[];
  all_submissions: SubmissionRecord[];
  contestations: ContestationRecord[];
  canonical_manifest_sha256: string;
  apa_compliance_score: number;
  apa_compliance_tier: string;
  exported_at: string;
}

export interface WalletProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}
