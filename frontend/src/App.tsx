import React, { useState, useEffect, useCallback } from 'react';
import { Masthead } from './components/Masthead';
import { LifecycleRail } from './components/LifecycleRail';
import { DocketHero } from './components/DocketHero';
import { RegulatoryTopologyMap } from './components/RegulatoryTopologyMap';
import { WitnessRollLedger } from './components/WitnessRollLedger';
import { SubmissionsTable } from './components/SubmissionsTable';
import { ContestationDrawer } from './components/ContestationDrawer';
import { AuditBundleExport } from './components/AuditBundleExport';
import { TransactionDrawer, TxLogEntry } from './components/TransactionDrawer';
import { GenLayerContractClient } from './client';
import { DEFAULT_CONTRACT_ADDRESS, NETWORK_CONFIG } from './config';
import { DocketSummary, RegulatoryCluster, SubmissionRecord, ContestationRecord, ChallengeType } from './types';
import { Terminal, ShieldAlert, Sparkles, BookOpen, ExternalLink, HelpCircle } from 'lucide-react';

// Authentic EPA Rulemaking Initial Dataset
const INITIAL_SIMULATED_DOCKET: DocketSummary = {
  docket_id: 1,
  organizer: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  admission_authority: '0x14223D89A50aE62908f9Ac12F6C7c0507f35A429',
  proposal_url: 'https://federalregister.gov/dockets/EPA-HQ-OAR-2026-0188',
  proposal_digest: '4a6b2c89f1092e038827419efcd51804c81e9b28a7e02518e3290bca7140f9aa',
  expected_manifest_digest: '3bf1e0dc12003c267232230a103cfd39c09c323f99066601ea319a2786a51d8b',
  computed_manifest_digest: '',
  slot_count: 3,
  enrollment_deadline: Math.floor(Date.now() / 1000) + 86400,
  contestation_deadline: Math.floor(Date.now() / 1000) + 172800,
  state: 'ENROLLING',
  submission_count: 5,
  revision: 1,
  accepted_contestation_count: 0,
  pending_contestation_count: 0,
  total_contestation_count: 0,
  annulment_reason: ''
};

const INITIAL_SIMULATED_SUBMISSIONS: SubmissionRecord[] = [
  {
    index: 0,
    submission_id: 'EPA-SUB-001',
    url: '/fixtures/sub1-industry.txt',
    digest: '1111111111111111111111111111111111111111111111111111111111111111',
    registrar: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    admission_authority: '0x14223D89A50aE62908f9Ac12F6C7c0507f35A429',
    enrollment_receipt: 'REC-001-APA-2026',
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
    rationale: ''
  },
  {
    index: 1,
    submission_id: 'EPA-SUB-002',
    url: '/fixtures/sub2-epidemiology.txt',
    digest: '2222222222222222222222222222222222222222222222222222222222222222',
    registrar: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    admission_authority: '0x14223D89A50aE62908f9Ac12F6C7c0507f35A429',
    enrollment_receipt: 'REC-002-APA-2026',
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
    rationale: ''
  },
  {
    index: 2,
    submission_id: 'EPA-SUB-003',
    url: '/fixtures/sub3-small-biz.txt',
    digest: '3333333333333333333333333333333333333333333333333333333333333333',
    registrar: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    admission_authority: '0x14223D89A50aE62908f9Ac12F6C7c0507f35A429',
    enrollment_receipt: 'REC-003-APA-2026',
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
    rationale: ''
  },
  {
    index: 3,
    submission_id: 'EPA-SUB-004',
    url: '/fixtures/sub4-clean-tech.txt',
    digest: '4444444444444444444444444444444444444444444444444444444444444444',
    registrar: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    admission_authority: '0x14223D89A50aE62908f9Ac12F6C7c0507f35A429',
    enrollment_receipt: 'REC-004-APA-2026',
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
    rationale: ''
  },
  {
    index: 4,
    submission_id: 'EPA-SUB-005',
    url: '/fixtures/sub5-tampered-sample.txt',
    digest: '5555555555555555555555555555555555555555555555555555555555555555',
    registrar: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
    admission_authority: '0x14223D89A50aE62908f9Ac12F6C7c0507f35A429',
    enrollment_receipt: 'REC-005-APA-2026',
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
    rationale: ''
  }
];

export const App: React.FC = () => {
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_CONTRACT_ADDRESS);
  const [isSimulation, setIsSimulation] = useState<boolean>(true);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [client, setClient] = useState<GenLayerContractClient | null>(null);

  // Core Docket State
  const [docket, setDocket] = useState<DocketSummary | null>(INITIAL_SIMULATED_DOCKET);
  const [clusters, setClusters] = useState<RegulatoryCluster[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(INITIAL_SIMULATED_SUBMISSIONS);
  const [contestations, setContestations] = useState<ContestationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals and Drawers
  const [showContestationDrawer, setShowContestationDrawer] = useState<boolean>(false);
  const [showAuditBundle, setShowAuditBundle] = useState<boolean>(false);
  const [showTxDrawer, setShowTxDrawer] = useState<boolean>(false);
  const [preselectedSub, setPreselectedSub] = useState<SubmissionRecord | null>(null);
  const [txLogs, setTxLogs] = useState<TxLogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      method: 'initialize_docket',
      status: 'SUCCESS',
      hash: '0x8db8a0c7104b4c73b06e89f81ad',
      detail: 'Docket #1 initialized with 3 oral witness slots.',
      executionMode: 'SIMULATION_VM'
    }
  ]);

  // Add Log helper
  const addLog = useCallback((method: string, status: 'PENDING' | 'SUCCESS' | 'ERROR', hash?: string, detail?: string) => {
    const entry: TxLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method,
      status,
      hash,
      detail,
      executionMode: isSimulation ? 'SIMULATION_VM' : 'STUDIONET_RPC'
    };
    setTxLogs(prev => [entry, ...prev]);
  }, [isSimulation]);

  // Initialize Client
  useEffect(() => {
    const cl = new GenLayerContractClient(contractAddress, activeProvider);
    setClient(cl);
  }, [contractAddress, activeProvider]);

  // Load Real or Simulated Data
  const refreshDocket = useCallback(async () => {
    if (isSimulation || !client) return;
    try {
      setIsLoading(true);
      const summary = await client.getDocketSummary();
      setDocket(summary);
      const cls = await client.getRegulatoryClusters();
      setClusters(cls);
      const subs = await client.getAllSubmissions();
      setSubmissions(subs);
      const conts = await client.getContestations();
      setContestations(conts);
    } catch (err: any) {
      console.error('Failed to load on-chain state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isSimulation, client]);

  useEffect(() => {
    if (!isSimulation) {
      refreshDocket();
    }
  }, [isSimulation, refreshDocket]);

  // Action Handlers
  const handleLockManifest = async () => {
    if (!docket) return;
    try {
      setIsLoading(true);
      addLog('lock_manifest', 'PENDING', undefined, 'Sealing administrative docket manifest hash');
      
      if (isSimulation) {
        await new Promise(r => setTimeout(r, 600));
        setDocket(prev => prev ? {
          ...prev,
          state: 'MANIFEST_LOCKED',
          computed_manifest_digest: prev.expected_manifest_digest,
          revision: prev.revision + 1
        } : null);
        addLog('lock_manifest', 'SUCCESS', '0x16fa264e83c27189b2', 'Manifest locked. Canonical SHA-256 committed.');
      } else if (client) {
        const tx = await client.lockManifest(docket.expected_manifest_digest);
        addLog('lock_manifest', 'SUCCESS', tx.hash, 'On-chain manifest lock ratified.');
        await refreshDocket();
      }
    } catch (err: any) {
      addLog('lock_manifest', 'ERROR', undefined, err.message);
      alert(`Lock failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClusterSubmissions = async () => {
    if (!docket) return;
    try {
      setIsLoading(true);
      addLog('cluster_submissions', 'PENDING', undefined, 'Invoking GenLayer Dragon Consensus LLM equivalence clustering');

      if (isSimulation) {
        await new Promise(r => setTimeout(r, 1200));
        const simClusters: RegulatoryCluster[] = [
          {
            cluster_id: 0,
            label: 'Economic Burden & Fleet Compliance Costs',
            summary: 'Industry economic modeling of fleet replacement costs and engine transition timelines under EPA NAAQS.',
            submission_ids: ['EPA-SUB-001']
          },
          {
            cluster_id: 1,
            label: 'Public Health & Pediatric Epidemiology',
            summary: 'Peer-reviewed clinical findings on PM2.5 respiratory morbidity and urban ozone attainment co-benefits.',
            submission_ids: ['EPA-SUB-002']
          },
          {
            cluster_id: 2,
            label: 'Small Business Logistics & Charging Infrastructure',
            summary: 'Operational challenges regarding grid transformer availability and rural freight depot power capacity.',
            submission_ids: ['EPA-SUB-003', 'EPA-SUB-005']
          },
          {
            cluster_id: 3,
            label: 'Zero-Emission Powertrain & Abatement Technology',
            summary: 'Manufacturing scalability curves and dual-fuel hydrogen-combustion particulate reduction data.',
            submission_ids: ['EPA-SUB-004']
          }
        ];

        const updatedSubs = submissions.map(s => {
          if (s.submission_id === 'EPA-SUB-001') {
            return { ...s, cluster_id: 0, cluster_label: 'Economic Burden & Fleet Compliance Costs', relevance_score: 94 };
          }
          if (s.submission_id === 'EPA-SUB-002') {
            return { ...s, cluster_id: 1, cluster_label: 'Public Health & Pediatric Epidemiology', relevance_score: 98 };
          }
          if (s.submission_id === 'EPA-SUB-003') {
            return { ...s, cluster_id: 2, cluster_label: 'Small Business Logistics & Infrastructure', relevance_score: 87 };
          }
          if (s.submission_id === 'EPA-SUB-004') {
            return { ...s, cluster_id: 3, cluster_label: 'Zero-Emission Powertrain Technology', relevance_score: 92 };
          }
          if (s.submission_id === 'EPA-SUB-005') {
            return { ...s, cluster_id: 2, cluster_label: 'Small Business Logistics & Infrastructure', relevance_score: 65, is_duplicate: true };
          }
          return s;
        });

        setClusters(simClusters);
        setSubmissions(updatedSubs);
        setDocket(prev => prev ? { ...prev, state: 'IMPACT_CONSENSUS', revision: prev.revision + 1 } : null);
        addLog('cluster_submissions', 'SUCCESS', '0xf622ab08912c4ea57', 'Consensus achieved across 4 distinct regulatory perspectives.');
      } else if (client) {
        const tx = await client.clusterSubmissions();
        addLog('cluster_submissions', 'SUCCESS', tx.hash, 'On-chain non-deterministic clustering complete.');
        await refreshDocket();
      }
    } catch (err: any) {
      addLog('cluster_submissions', 'ERROR', undefined, err.message);
      alert(`Clustering failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllocateWitnesses = async () => {
    if (!docket) return;
    try {
      setIsLoading(true);
      addLog('allocate_hearing_witnesses', 'PENDING', undefined, 'Executing deterministic balanced sortition algorithm');

      if (isSimulation) {
        await new Promise(r => setTimeout(r, 800));
        // Allocate top witnesses across distinct clusters
        const updatedSubs = submissions.map(s => {
          if (s.submission_id === 'EPA-SUB-002') {
            return {
              ...s,
              selected: true,
              selection_rank: 1,
              reason_code: 'TOP_IMPACT_PUBLIC_HEALTH',
              rationale: 'Highest substantive epidemiological impact score in Cluster 1 (Pediatric Epidemiology).'
            };
          }
          if (s.submission_id === 'EPA-SUB-001') {
            return {
              ...s,
              selected: true,
              selection_rank: 2,
              reason_code: 'TOP_IMPACT_INDUSTRY_BURDEN',
              rationale: 'Primary representative for heavy vehicle commercial trucking economic modeling in Cluster 0.'
            };
          }
          if (s.submission_id === 'EPA-SUB-004') {
            return {
              ...s,
              selected: true,
              selection_rank: 3,
              reason_code: 'BALANCED_QUOTA_CLEAN_TECH',
              rationale: 'Representative of technological feasibility & abatement engineering in Cluster 3.'
            };
          }
          return { ...s, selected: false, selection_rank: 0 };
        });

        setSubmissions(updatedSubs);
        setDocket(prev => prev ? { ...prev, state: 'CONTESTATION_OPEN', revision: prev.revision + 1 } : null);
        addLog('allocate_hearing_witnesses', 'SUCCESS', '0x8be0f55c812a0f8e9', '3 witness seats allocated under APA balanced hearing doctrine.');
      } else if (client) {
        const tx = await client.allocateWitnesses();
        addLog('allocate_hearing_witnesses', 'SUCCESS', tx.hash, 'Witness sortition finalized on-chain.');
        await refreshDocket();
      }
    } catch (err: any) {
      addLog('allocate_hearing_witnesses', 'ERROR', undefined, err.message);
      alert(`Sortition failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenContestation = async (type: ChallengeType, targetIds: string[], evidenceUrl: string, rat: string) => {
    addLog('open_contestation', 'PENDING', undefined, `Filing ${type} challenge against ${targetIds.join(', ')}`);
    if (isSimulation) {
      await new Promise(r => setTimeout(r, 700));
      const newCont: ContestationRecord = {
        id: contestations.length + 1,
        challenge_type: type,
        target_ids: targetIds,
        challenger: connectedAccount || '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
        status: 'PENDING',
        resolution_reason: '',
        resolved_at_revision: 0
      };
      setContestations(prev => [...prev, newCont]);
      setDocket(prev => prev ? {
        ...prev,
        pending_contestation_count: prev.pending_contestation_count + 1,
        total_contestation_count: prev.total_contestation_count + 1
      } : null);
      addLog('open_contestation', 'SUCCESS', '0x29c8fcb71829da482', `Dispute #${newCont.id} opened for consensus arbitration.`);
    } else if (client) {
      const tx = await client.openContestation(type, targetIds, evidenceUrl, rat);
      addLog('open_contestation', 'SUCCESS', tx.hash, 'On-chain challenge registered.');
      await refreshDocket();
    }
  };

  const handleResolveContestation = async (id: number, outcome: string, reason: string) => {
    addLog('resolve_contestation', 'PENDING', undefined, `Arbitrating dispute #${id} with GenLayer consensus`);
    if (isSimulation) {
      await new Promise(r => setTimeout(r, 900));
      setContestations(prev => prev.map(c => c.id === id ? {
        ...c,
        status: outcome === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
        resolution_reason: reason,
        resolved_at_revision: (docket?.revision || 1) + 1
      } : c));
      setDocket(prev => prev ? {
        ...prev,
        pending_contestation_count: Math.max(0, prev.pending_contestation_count - 1),
        accepted_contestation_count: outcome === 'ACCEPT' ? prev.accepted_contestation_count + 1 : prev.accepted_contestation_count,
        revision: prev.revision + 1
      } : null);
      addLog('resolve_contestation', 'SUCCESS', '0x8d6124e93012f91bc', `Dispute #${id} resolved. Re-sortition verified.`);
    } else if (client) {
      const tx = await client.resolveContestation(id, outcome, reason);
      addLog('resolve_contestation', 'SUCCESS', tx.hash, `Dispute #${id} resolved on-chain.`);
      await refreshDocket();
    }
  };

  const handleRatifyDocket = async () => {
    if (!docket) return;
    try {
      setIsLoading(true);
      addLog('ratify_docket', 'PENDING', undefined, 'Publishing sovereign ratification to Federal Register');
      if (isSimulation) {
        await new Promise(r => setTimeout(r, 800));
        setDocket(prev => prev ? { ...prev, state: 'SOVEREIGN_RATIFIED', revision: prev.revision + 1 } : null);
        addLog('ratify_docket', 'SUCCESS', '0x6afbc49281a7092bb', 'Sovereign APA ratification complete. Record sealed.');
      } else if (client) {
        const tx = await client.ratifyDocket();
        addLog('ratify_docket', 'SUCCESS', tx.hash, 'Docket ratified on GenLayer blockchain.');
        await refreshDocket();
      }
    } catch (err: any) {
      addLog('ratify_docket', 'ERROR', undefined, err.message);
      alert(`Ratification failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnnulDocket = async () => {
    const reason = prompt('Specify administrative justification for pre-lock docket annulment:');
    if (!reason) return;
    try {
      setIsLoading(true);
      addLog('annul_docket_prelock', 'PENDING', undefined, 'Pre-lock docket annulment initiated');
      if (isSimulation) {
        setDocket(prev => prev ? { ...prev, state: 'ANNULLED_PRELOCK', annulment_reason: reason } : null);
        addLog('annul_docket_prelock', 'SUCCESS', '0x99182a472910ba', 'Docket successfully annulled pre-lock.');
      } else if (client) {
        const tx = await client.annulDocket(reason);
        addLog('annul_docket_prelock', 'SUCCESS', tx.hash, 'Docket annulled on-chain.');
        await refreshDocket();
      }
    } catch (err: any) {
      addLog('annul_docket_prelock', 'ERROR', undefined, err.message);
      alert(`Annulment failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const witnesses = submissions.filter(s => s.selected);
  const canContest = docket?.state === 'WITNESSES_ALLOCATED' || docket?.state === 'CONTESTATION_OPEN';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Masthead */}
      <Masthead
        contractAddress={contractAddress}
        isSimulation={isSimulation}
        onToggleSimulation={setIsSimulation}
        connectedAccount={connectedAccount}
        onConnectAccount={(acc, prov) => {
          setConnectedAccount(acc);
          setActiveProvider(prov);
        }}
        onDisconnectAccount={() => {
          setConnectedAccount(null);
          setActiveProvider(null);
        }}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '1.5rem 2rem 5rem' }}>
        
        {/* Procedural Lifecycle Bar */}
        <LifecycleRail currentState={docket?.state || 'ENROLLING'} />

        {/* Hero Banner with Actions */}
        <DocketHero
          docket={docket}
          isLoading={isLoading}
          onRefresh={refreshDocket}
          onLockManifest={handleLockManifest}
          onClusterSubmissions={handleClusterSubmissions}
          onAllocateWitnesses={handleAllocateWitnesses}
          onRatifyDocket={handleRatifyDocket}
          onAnnulDocket={handleAnnulDocket}
          onOpenContestationDrawer={() => setShowContestationDrawer(true)}
          onOpenAuditBundle={() => setShowAuditBundle(true)}
          isSimulated={isSimulation}
        />

        {/* 2-Column Grid: Topology Map & Witness Roll */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <RegulatoryTopologyMap
            clusters={clusters}
            submissions={submissions}
            onSelectSubmission={(sub) => {
              setPreselectedSub(sub);
              setShowContestationDrawer(true);
            }}
          />

          <WitnessRollLedger
            witnesses={witnesses}
            canContest={canContest}
            onContestWitness={(witness) => {
              setPreselectedSub(witness);
              setShowContestationDrawer(true);
            }}
          />
        </div>

        {/* Enrolled Submissions Table */}
        <SubmissionsTable
          submissions={submissions}
          canContest={canContest}
          onSelectSubmission={(sub) => {
            setPreselectedSub(sub);
            setShowContestationDrawer(true);
          }}
          onContestSubmission={(sub) => {
            setPreselectedSub(sub);
            setShowContestationDrawer(true);
          }}
        />

      </main>

      {/* Drawers and Modals */}
      <ContestationDrawer
        isOpen={showContestationDrawer}
        onClose={() => {
          setShowContestationDrawer(false);
          setPreselectedSub(null);
        }}
        contestations={contestations}
        submissions={submissions}
        onOpenContestation={handleOpenContestation}
        onResolveContestation={handleResolveContestation}
        preselectedSubmission={preselectedSub}
        isLoading={isLoading}
      />

      <AuditBundleExport
        isOpen={showAuditBundle}
        onClose={() => setShowAuditBundle(false)}
        docket={docket}
        clusters={clusters}
        submissions={submissions}
        contestations={contestations}
      />

      <TransactionDrawer
        isOpen={showTxDrawer}
        onClose={() => setShowTxDrawer(false)}
        logs={txLogs}
        onClearLogs={() => setTxLogs([])}
      />

      {/* Bottom Sticky Status Bar */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(6, 13, 26, 0.95)',
        borderTop: '1px solid var(--color-border-subtle)',
        backdropFilter: 'blur(8px)',
        padding: '0.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        zIndex: 800
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>
            GenLayer Intelligent Contract: <code style={{ color: 'var(--color-accent-teal)' }}>{contractAddress.slice(0, 10)}...{contractAddress.slice(-6)}</code>
          </span>
          <span style={{ color: 'var(--color-border-subtle)' }}>•</span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            Network: <strong style={{ color: 'var(--color-text-primary)' }}>{NETWORK_CONFIG.chainName}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setShowTxDrawer(!showTxDrawer)}
            className="reg-btn reg-btn-outline"
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}
          >
            <Terminal size={12} />
            Consensus Logs ({txLogs.length})
          </button>
          <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            APA Notice & Comment Verifier v1.0.0
          </span>
        </div>
      </footer>
    </div>
  );
};
