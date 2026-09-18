/**
 * GenLayer Intelligent Contract Client
 * Regulatory Docket Allocator (k-beee)
 * 100% Live Studionet Contract RPC Transport
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

  constructor(contractAddress: string, provider?: any) {
    this.contractAddress = contractAddress;
    this.provider = provider || null;
  }

  // --------------------------------------------------------------------------
  // Public Views
  // --------------------------------------------------------------------------

  public async getDocketCount(): Promise<number> {
    const res = await this.callView('get_docket_count', []);
    return Number(res || 0);
  }

  public async getDocket(docketId: number = 1): Promise<DocketSummary> {
    const res = await this.callView('get_docket', [docketId]);
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  public async getDocketSummary(docketId: number = 1): Promise<DocketSummary> {
    return this.getDocket(docketId);
  }

  public async getAllSubmissions(docketId: number = 1): Promise<SubmissionRecord[]> {
    const res = await this.callView('get_all_submissions', [docketId]);
    if (!res) return [];
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  public async getRegulatoryClusters(docketId: number = 1): Promise<RegulatoryCluster[]> {
    const res = await this.callView('get_regulatory_clusters', [docketId]);
    if (!res) return [];
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  public async getWitnessRoll(docketId: number = 1): Promise<SubmissionRecord[]> {
    const res = await this.callView('get_witness_roll', [docketId]);
    if (!res) return [];
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  public async getContestations(docketId: number = 1): Promise<ContestationRecord[]> {
    return this.getAllContestations(docketId);
  }

  public async getAllContestations(docketId: number = 1): Promise<ContestationRecord[]> {
    const res = await this.callView('get_all_contestations', [docketId]);
    if (!res) return [];
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  public async getManifestExport(docketId: number = 1): Promise<string> {
    const res = await this.callView('get_manifest_export', [docketId]);
    return res || '';
  }

  // --------------------------------------------------------------------------
  // Write Transactions
  // --------------------------------------------------------------------------

  public async initializeDocket(
    organizer: string,
    admissionAuthority: string,
    proposalUrl: string,
    proposalDigest: string,
    slotCount: number,
    enrollmentDeadline: number,
    contestationDeadline: number
  ): Promise<{ hash: string }> {
    const hash = await this.sendWrite('initialize_docket', [
      organizer,
      admissionAuthority,
      proposalUrl,
      proposalDigest,
      slotCount,
      enrollmentDeadline,
      contestationDeadline,
    ]);
    return { hash };
  }

  public async enrollSubmission(
    docketId: number,
    submissionId: string,
    url: string,
    digest: string
  ): Promise<{ hash: string }> {
    const hash = await this.sendWrite('enroll_submission', [docketId, submissionId, url, digest]);
    return { hash };
  }

  public async commitAndLockManifest(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.sendWrite('commit_and_lock_manifest', [docketId]);
    return { hash };
  }

  public async lockManifest(expectedDigest?: string, docketId: number = 1): Promise<{ hash: string }> {
    return this.commitAndLockManifest(docketId);
  }

  public async clusterSubmissions(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.sendWrite('cluster_submissions', [docketId]);
    return { hash };
  }

  public async allocateHearingWitnesses(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.sendWrite('allocate_hearing_witnesses', [docketId]);
    return { hash };
  }

  public async allocateWitnesses(docketId: number = 1): Promise<{ hash: string }> {
    return this.allocateHearingWitnesses(docketId);
  }

  public async openContestation(
    challengeType: ChallengeType,
    targetIds: string[],
    evidenceUrl?: string,
    rationale?: string,
    docketId: number = 1
  ): Promise<{ hash: string }> {
    const hash = await this.sendWrite('open_contestation', [docketId, challengeType, JSON.stringify(targetIds)]);
    return { hash };
  }

  public async resolveContestation(
    challengeId: number,
    outcome: string = 'ACCEPT',
    reason: string = '',
    docketId: number = 1
  ): Promise<{ hash: string }> {
    const hash = await this.sendWrite('resolve_contestation', [docketId, challengeId]);
    return { hash };
  }

  public async ratifyDocket(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.sendWrite('ratify_docket', [docketId]);
    return { hash };
  }

  public async annulDocket(reason: string, docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.sendWrite('annul_docket', [docketId, reason]);
    return { hash };
  }

  // --------------------------------------------------------------------------
  // RPC Transport
  // --------------------------------------------------------------------------

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
    if (!accounts || accounts.length === 0) {
      const requested = await this.provider.request({ method: 'eth_requestAccounts' });
      if (!requested || requested.length === 0) {
        throw new Error('ERR_NO_ACCOUNT: Please select an active account in your wallet');
      }
    }
    const from = accounts[0] || (await this.provider.request({ method: 'eth_accounts' }))[0];

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
