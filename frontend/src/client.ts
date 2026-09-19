/**
 * GenLayer Intelligent Contract Client
 * Regulatory Docket Allocator (k-beee)
 * 100% Live Studionet Client powered by genlayer-js
 */

import { createClient, chains } from 'genlayer-js';
import {
  DocketSummary,
  SubmissionRecord,
  RegulatoryCluster,
  ContestationRecord,
  ChallengeType,
} from './types';

export class RegulatoryContractClient {
  private contractAddress: `0x${string}`;
  private provider: any | null = null;
  private publicClient: any;

  constructor(contractAddress: string, provider?: any) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.provider = provider || null;
    this.publicClient = createClient({ chain: chains.studionet });
  }

  // --------------------------------------------------------------------------
  // Public Views (No Wallet Required)
  // --------------------------------------------------------------------------

  public async getDocket(docketId: number = 1): Promise<DocketSummary | null> {
    try {
      const res = await this.publicClient.readContract({
        address: this.contractAddress,
        functionName: 'get_docket',
        args: [docketId],
      });
      return typeof res === 'string' ? JSON.parse(res) : res;
    } catch (err: any) {
      console.warn('Docket view failed (uninitialized or reverted):', err.message);
      return null;
    }
  }

  public async getDocketSummary(docketId: number = 1): Promise<DocketSummary | null> {
    return this.getDocket(docketId);
  }

  public async getAllSubmissions(docketId: number = 1): Promise<SubmissionRecord[]> {
    try {
      const res = await this.publicClient.readContract({
        address: this.contractAddress,
        functionName: 'get_all_submissions',
        args: [docketId],
      });
      if (!res) return [];
      return typeof res === 'string' ? JSON.parse(res) : res;
    } catch {
      return [];
    }
  }

  public async getRegulatoryClusters(docketId: number = 1): Promise<RegulatoryCluster[]> {
    try {
      const res = await this.publicClient.readContract({
        address: this.contractAddress,
        functionName: 'get_regulatory_clusters',
        args: [docketId],
      });
      if (!res) return [];
      return typeof res === 'string' ? JSON.parse(res) : res;
    } catch {
      return [];
    }
  }

  public async getWitnessRoll(docketId: number = 1): Promise<SubmissionRecord[]> {
    try {
      const res = await this.publicClient.readContract({
        address: this.contractAddress,
        functionName: 'get_witness_roll',
        args: [docketId],
      });
      if (!res) return [];
      return typeof res === 'string' ? JSON.parse(res) : res;
    } catch {
      return [];
    }
  }

  public async getContestations(docketId: number = 1): Promise<ContestationRecord[]> {
    return this.getAllContestations(docketId);
  }

  public async getAllContestations(docketId: number = 1): Promise<ContestationRecord[]> {
    try {
      const res = await this.publicClient.readContract({
        address: this.contractAddress,
        functionName: 'get_all_contestations',
        args: [docketId],
      });
      if (!res) return [];
      return typeof res === 'string' ? JSON.parse(res) : res;
    } catch {
      return [];
    }
  }

  public async getManifestExport(docketId: number = 1): Promise<string> {
    try {
      const res = await this.publicClient.readContract({
        address: this.contractAddress,
        functionName: 'get_manifest_export',
        args: [docketId],
      });
      return res || '';
    } catch {
      return '';
    }
  }

  // --------------------------------------------------------------------------
  // Write Transactions (Injected Wallet Required)
  // --------------------------------------------------------------------------

  public async initializeDocket(
    proposalUrl: string,
    proposalDigest: string,
    expectedManifestDigest: string,
    slotCount: number,
    enrollmentDeadline: number,
    contestationDeadline: number
  ): Promise<{ hash: string }> {
    const hash = await this.writeMethod('initialize_docket', [
      proposalUrl,
      proposalDigest,
      expectedManifestDigest,
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
    const hash = await this.writeMethod('enroll_submission', [docketId, submissionId, url, digest]);
    return { hash };
  }

  public async commitAndLockManifest(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.writeMethod('commit_and_lock_manifest', [docketId]);
    return { hash };
  }

  public async lockManifest(expectedDigest?: string, docketId: number = 1): Promise<{ hash: string }> {
    return this.commitAndLockManifest(docketId);
  }

  public async clusterSubmissions(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.writeMethod('cluster_submissions', [docketId]);
    return { hash };
  }

  public async allocateHearingWitnesses(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.writeMethod('allocate_hearing_witnesses', [docketId]);
    return { hash };
  }

  public async allocateWitnesses(docketId: number = 1): Promise<{ hash: string }> {
    return this.allocateHearingWitnesses(docketId);
  }

  public async openContestation(
    challengeType: ChallengeType,
    targetIds: string[],
    docketId: number = 1
  ): Promise<{ hash: string }> {
    const hash = await this.writeMethod('open_contestation', [docketId, challengeType, JSON.stringify(targetIds)]);
    return { hash };
  }

  public async resolveContestation(
    challengeId: number,
    outcome: string = 'ACCEPT',
    reason: string = '',
    docketId: number = 1
  ): Promise<{ hash: string }> {
    const hash = await this.writeMethod('resolve_contestation', [docketId, challengeId]);
    return { hash };
  }

  public async ratifyDocket(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.writeMethod('ratify_docket', [docketId]);
    return { hash };
  }

  public async annulDocket(docketId: number = 1): Promise<{ hash: string }> {
    const hash = await this.writeMethod('annul_docket', [docketId]);
    return { hash };
  }

  private async writeMethod(functionName: string, args: any[]): Promise<string> {
    if (!this.provider) throw new Error('ERR_NO_WALLET: Connect wallet to submit transactions');

    const client = createClient({
      chain: chains.studionet,
      provider: this.provider,
    });

    const hash = await client.writeContract({
      address: this.contractAddress,
      functionName,
      args,
      value: 0n,
    });

    return hash;
  }
}

export { RegulatoryContractClient as GenLayerContractClient };
