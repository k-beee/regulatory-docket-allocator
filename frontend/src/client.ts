/**
 * GenLayer Intelligent Contract Client & Rulemaking Simulation Engine
 * Regulatory Docket Allocator (k-beee)
 */

import { NETWORK_CONFIG } from './config';
import {
  DocketSummary,
  SubmissionRecord,
  RegulatoryCluster,
  ContestationRecord,
  ChallengeType,
} from './types';

export class RegulatoryContractClient {
  private contractAddress: string;
  private provider: any | null = null;
  private isSimulation: boolean = false;

  // In-memory simulation state for instant browser exploration
  private simDocket: DocketSummary = {
    docket_id: 1,
    organizer: '0x1111111111111111111111111111111111111111',
    admission_authority: '0x1111111111111111111111111111111111111111',
    proposal_url: 'https://regulations.gov/charters/epa-2026-clean-air.txt',
    proposal_digest: 'e89f1345d9b2311f987625110d939626e259b3df9e63e1986c758bb8efb7a1ff',
    expected_manifest_digest: 'e7e46a3a8525bec289a421b6bc55ed8ff9d72f10b776a30138c08a3b588b8efb',
    computed_manifest_digest: 'e7e46a3a8525bec289a421b6bc55ed8ff9d72f10b776a30138c08a3b588b8efb',
    slot_count: 2,
    enrollment_deadline: Math.floor(Date.now() / 1000) + 3600,
    contestation_deadline: Math.floor(Date.now() / 1000) + 7200,
    state: 'ENROLLING',
    submission_count: 0,
    revision: 1,
    accepted_contestation_count: 0,
    pending_contestation_count: 0,
    total_contestation_count: 0,
    annulment_reason: '',
  };

  private simSubmissions: SubmissionRecord[] = [];
  private simClusters: RegulatoryCluster[] = [];
  private simContestations: ContestationRecord[] = [];

  constructor(contractAddress: string, provider?: any, simulationMode: boolean = false) {
    this.contractAddress = contractAddress;
    this.provider = provider || null;
    this.isSimulation = simulationMode;
  }

  public setSimulation(active: boolean) {
    this.isSimulation = active;
  }

  public getSimulation(): boolean {
    return this.isSimulation;
  }

  // --------------------------------------------------------------------------
  // Public Views
  // --------------------------------------------------------------------------

  public async getDocket(docketId: number = 1): Promise<DocketSummary> {
    if (this.isSimulation || !this.provider) {
      return {
        ...this.simDocket,
        submission_count: this.simSubmissions.length,
        total_contestation_count: this.simContestations.length,
        pending_contestation_count: this.simContestations.filter((c) => c.status === 'PENDING').length,
        accepted_contestation_count: this.simContestations.filter((c) => c.status === 'ACCEPTED').length,
      };
    }

    return this.callView('get_docket', [docketId]);
  }

  public async getAllSubmissions(docketId: number = 1): Promise<SubmissionRecord[]> {
    if (this.isSimulation || !this.provider) {
      return [...this.simSubmissions];
    }
    const res = await this.callView('get_all_submissions', [docketId]);
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  public async getRegulatoryClusters(docketId: number = 1): Promise<RegulatoryCluster[]> {
    if (this.isSimulation || !this.provider) {
      return [...this.simClusters];
    }
    const res = await this.callView('get_regulatory_clusters', [docketId]);
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  public async getWitnessRoll(docketId: number = 1): Promise<SubmissionRecord[]> {
    if (this.isSimulation || !this.provider) {
      return this.simSubmissions
        .filter((s) => s.selected)
        .sort((a, b) => a.selection_rank - b.selection_rank);
    }
    const res = await this.callView('get_witness_roll', [docketId]);
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  public async getDocketSummary(docketId: number = 1): Promise<DocketSummary> {
    return this.getDocket(docketId);
  }

  public async getContestations(docketId: number = 1): Promise<ContestationRecord[]> {
    return this.getAllContestations(docketId);
  }

  public async getAllContestations(docketId: number = 1): Promise<ContestationRecord[]> {
    if (this.isSimulation || !this.provider) {
      return [...this.simContestations];
    }
    const res = await this.callView('get_all_contestations', [docketId]);
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  public async getManifestExport(docketId: number = 1): Promise<string> {
    if (this.isSimulation || !this.provider) {
      return this.simSubmissions
        .slice()
        .sort((a, b) => a.submission_id.localeCompare(b.submission_id))
        .map((s) => `${s.submission_id}|${s.url}|${s.digest.toLowerCase()}`)
        .join('\n');
    }
    return this.callView('get_manifest_export', [docketId]);
  }

  // --------------------------------------------------------------------------
  // Write Transactions
  // --------------------------------------------------------------------------

  public async enrollSubmission(
    docketId: number,
    submissionId: string,
    url: string,
    digest: string
  ): Promise<string> {
    if (this.isSimulation || !this.provider) {
      const idx = this.simSubmissions.length;
      const receipt = `APA-${submissionId.toUpperCase()}-${digest.slice(0, 8)}`;
      const rec: SubmissionRecord = {
        index: idx,
        submission_id: submissionId.trim(),
        url: url.trim(),
        digest: digest.trim().toLowerCase(),
        registrar: this.simDocket.organizer,
        admission_authority: this.simDocket.admission_authority,
        enrollment_receipt: receipt,
        eligible: true,
        exclusion_reason: '',
        cluster_id: 0,
        cluster_label: '',
        relevance_score: 0,
        is_duplicate: false,
        duplicate_of_id: '',
        selected: false,
        selection_rank: 0,
        reason_code: '',
        rationale: '',
      };
      this.simSubmissions.push(rec);
      return `0xsim_tx_enroll_${Date.now()}`;
    }

    return this.sendWrite('enroll_submission', [docketId, submissionId, url, digest]);
  }

  public async commitAndLockManifest(docketId: number = 1): Promise<string> {
    if (this.isSimulation || !this.provider) {
      this.simDocket.state = 'MANIFEST_LOCKED';
      return `0xsim_tx_lock_${Date.now()}`;
    }
    return this.sendWrite('commit_and_lock_manifest', [docketId]);
  }

  public async lockManifest(expectedDigest?: string, docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.commitAndLockManifest(docketId);
    return { hash };
  }

  public async clusterSubmissions(docketId: number = 1): Promise<{ hash: string }> {
    if (this.isSimulation || !this.provider) {
      this.simClusters = [
        {
          cluster_id: 1,
          label: 'Economic Burden & Industrial Compliance',
          summary: 'Capital expenditure timelines, industrial plant retrofits, and power grid operating margins.',
          submission_ids: ['sub-industry-coalition', 'sub-small-biz-alliance', 'sub-clean-tech-institute'],
        },
        {
          cluster_id: 2,
          label: 'Public Health & Epidemiological Baselines',
          summary: 'Clinical respiratory hospitalizations, childhood asthma mitigation, and mortality reduction.',
          submission_ids: ['sub-epidemiology-consortium'],
        },
      ];

      for (const s of this.simSubmissions) {
        if (s.submission_id === 'sub-industry-coalition') {
          s.cluster_id = 1;
          s.cluster_label = 'Economic Burden & Industrial Compliance';
          s.relevance_score = 93;
        } else if (s.submission_id === 'sub-epidemiology-consortium') {
          s.cluster_id = 2;
          s.cluster_label = 'Public Health & Epidemiological Baselines';
          s.relevance_score = 89;
        } else if (s.submission_id === 'sub-small-biz-alliance') {
          s.cluster_id = 1;
          s.cluster_label = 'Economic Burden & Industrial Compliance';
          s.relevance_score = 84;
        } else if (s.submission_id === 'sub-clean-tech-institute') {
          s.cluster_id = 1;
          s.cluster_label = 'Economic Burden & Industrial Compliance';
          s.relevance_score = 80;
        }
      }

      this.simDocket.state = 'IMPACT_CONSENSUS';
      return { hash: `0xsim_tx_cluster_${Date.now()}` };
    }
    const hash = await this.sendWrite('cluster_submissions', [docketId]);
    return { hash };
  }

  public async allocateHearingWitnesses(docketId: number = 1): Promise<string> {
    if (this.isSimulation || !this.provider) {
      const s1 = this.simSubmissions.find((s) => s.submission_id === 'sub-industry-coalition');
      const s2 = this.simSubmissions.find((s) => s.submission_id === 'sub-epidemiology-consortium');

      if (s1) {
        s1.selected = true;
        s1.selection_rank = 1;
        s1.reason_code = 'PRIMARY_IMPACT_WITNESS';
        s1.rationale = 'Lead Oral Witness for Impact Vector #1: Economic Burden (Relevance 93)';
      }
      if (s2) {
        s2.selected = true;
        s2.selection_rank = 2;
        s2.reason_code = 'PRIMARY_IMPACT_WITNESS';
        s2.rationale = 'Lead Oral Witness for Impact Vector #2: Public Health (Relevance 89)';
      }

      this.simDocket.state = 'WITNESSES_ALLOCATED';
      return `0xsim_tx_allocate_${Date.now()}`;
    }
    return this.sendWrite('allocate_hearing_witnesses', [docketId]);
  }

  public async allocateWitnesses(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.allocateHearingWitnesses(docketId);
    return { hash };
  }

  public async openContestation(
    challengeType: ChallengeType,
    targetIds: string[],
    evidenceUrl?: string,
    rationale?: string,
    docketId: number = 1
  ): Promise<{ hash: string }> {
    if (this.isSimulation || !this.provider) {
      const cid = this.simContestations.length + 1;
      this.simContestations.push({
        id: cid,
        challenge_type: challengeType,
        target_ids: targetIds,
        challenger: '0x3333333333333333333333333333333333333333',
        status: 'PENDING',
        resolution_reason: '',
        resolved_at_revision: 0,
      });
      this.simDocket.state = 'CONTESTATION_OPEN';
      return { hash: `0xsim_tx_challenge_${Date.now()}` };
    }
    const hash = await this.sendWrite('open_contestation', [docketId, challengeType, JSON.stringify(targetIds)]);
    return { hash };
  }

  public async resolveContestation(
    challengeId: number,
    outcome: string = 'ACCEPT',
    reason: string = '',
    docketId: number = 1
  ): Promise<{ hash: string }> {
    if (this.isSimulation || !this.provider) {
      const c = this.simContestations.find((item) => item.id === challengeId);
      if (c) {
        c.status = outcome === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
        c.resolution_reason = reason || 'Arbitration finding recorded';
        c.resolved_at_revision = this.simDocket.revision + 1;
        this.simDocket.revision += 1;

        if (outcome === 'ACCEPT' && c.target_ids.length > 0) {
          const target = this.simSubmissions.find((s) => s.submission_id === c.target_ids[0]);
          if (target) {
            target.eligible = false;
            target.selected = false;
            target.exclusion_reason = 'PROVENANCE_DISQUALIFIED';
          }

          const replacement = this.simSubmissions.find((s) => s.submission_id === 'sub-small-biz-alliance');
          if (replacement) {
            replacement.selected = true;
            replacement.selection_rank = 1;
            replacement.reason_code = 'PRIMARY_IMPACT_WITNESS';
            replacement.rationale = 'Re-allocated lead witness for Impact Vector #1 following disqualification';
          }
        }
      }
      return { hash: `0xsim_tx_resolve_${Date.now()}` };
    }
    const hash = await this.sendWrite('resolve_contestation', [docketId, challengeId]);
    return { hash };
  }

  public async ratifyDocket(docketId: number = 1): Promise<{ hash: string }> {
    if (this.isSimulation || !this.provider) {
      this.simDocket.state = 'SOVEREIGN_RATIFIED';
      return { hash: `0xsim_tx_ratify_${Date.now()}` };
    }
    const hash = await this.sendWrite('ratify_docket', [docketId]);
    return { hash };
  }

  public async annulDocket(reason: string, docketId: number = 1): Promise<{ hash: string }> {
    if (this.isSimulation || !this.provider) {
      this.simDocket.state = 'ANNULLED_PRELOCK';
      this.simDocket.annulment_reason = reason;
      return { hash: `0xsim_tx_annul_${Date.now()}` };
    }
    const hash = await this.sendWrite('annul_docket', [docketId, reason]);
    return { hash };
  }

  private async callView(method: string, args: any[]): Promise<any> {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'gen_callView',
      params: [{ to: this.contractAddress, function: method, args }],
    };

    const response = await fetch(NETWORK_CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || `RPC Error in ${method}`);
    return data.result;
  }

  private async sendWrite(method: string, args: any[]): Promise<string> {
    if (!this.provider) throw new Error('ERR_NO_WALLET: Connect wallet to submit transactions');

    const accounts = await this.provider.request({ method: 'eth_accounts' });
    const from = accounts[0];

    const txPayload = {
      from,
      to: this.contractAddress,
      data: JSON.stringify({ function: method, args }),
    };

    return await this.provider.request({
      method: 'eth_sendTransaction',
      params: [txPayload],
    });
  }
}

export { RegulatoryContractClient as GenLayerContractClient };
