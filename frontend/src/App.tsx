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

export const App: React.FC = () => {
  const [contractAddress, setContractAddress] = useState<string>(DEFAULT_CONTRACT_ADDRESS);
  const [connectedAccount, setConnectedAccount] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [client, setClient] = useState<GenLayerContractClient | null>(null);

  // Core On-Chain Docket State
  const [docket, setDocket] = useState<DocketSummary | null>(null);
  const [clusters, setClusters] = useState<RegulatoryCluster[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [contestations, setContestations] = useState<ContestationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals and Drawers
  const [showContestationDrawer, setShowContestationDrawer] = useState<boolean>(false);
  const [showAuditBundle, setShowAuditBundle] = useState<boolean>(false);
  const [showTxDrawer, setShowTxDrawer] = useState<boolean>(false);
  const [preselectedSub, setPreselectedSub] = useState<SubmissionRecord | null>(null);
  const [txLogs, setTxLogs] = useState<TxLogEntry[]>([]);

  // Add Log helper
  const addLog = useCallback((method: string, status: 'PENDING' | 'SUCCESS' | 'ERROR', hash?: string, detail?: string) => {
    const entry: TxLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      method,
      status,
      hash,
      detail,
      executionMode: 'STUDIONET_RPC'
    };
    setTxLogs(prev => [entry, ...prev]);
  }, []);

  // Initialize Client
  useEffect(() => {
    const cl = new GenLayerContractClient(contractAddress, activeProvider);
    setClient(cl);
  }, [contractAddress, activeProvider]);

  // Load Real On-Chain Data
  const refreshDocket = useCallback(async () => {
    if (!client) return;
    try {
      setIsLoading(true);
      const summary = await client.getDocketSummary(1);
      if (!summary) {
        setDocket(null);
        setClusters([]);
        setSubmissions([]);
        setContestations([]);
        return;
      }
      setDocket(summary);
      const cls = await client.getRegulatoryClusters(1);
      setClusters(cls);
      const subs = await client.getAllSubmissions(1);
      setSubmissions(subs);
      const conts = await client.getContestations(1);
      setContestations(conts);
    } catch (err: any) {
      console.error('Failed to load on-chain state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      refreshDocket();
    }
  }, [client, refreshDocket]);

  // Initialize Docket Action (when docket_count === 0)
  const handleInitializeDocket = async () => {
    if (!client || !connectedAccount) {
      alert('Please connect your Web3 wallet (MetaMask or Studionet) to initialize the docket.');
      return;
    }
    try {
      setIsLoading(true);
      addLog('initialize_docket', 'PENDING', undefined, 'Submitting initialize_docket transaction to Studionet...');
      const tx = await client!.initializeDocket(
        'https://federalregister.gov/dockets/EPA-HQ-OAR-2026-0188',
        '4a6b2c89f1092e038827419efcd51804c81e9b28a7e02518e3290bca7140f9aa',
        '3bf1e0dc12003c267232230a103cfd39c09c323f99066601ea319a2786a51d8b',
        3,
        Math.floor(Date.now() / 1000) + 86400,
        Math.floor(Date.now() / 1000) + 172800
      );
      addLog('initialize_docket', 'SUCCESS', tx.hash, 'Rulemaking Docket #1 initialized on GenLayer blockchain!');
      await refreshDocket();
    } catch (err: any) {
      addLog('initialize_docket', 'ERROR', undefined, err.message);
      alert(`Initialization failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Action Handlers (100% Live On-Chain)
  const handleLockManifest = async () => {
    if (!docket || !client) return;
    try {
      setIsLoading(true);
      addLog('lock_manifest', 'PENDING', undefined, 'Sealing administrative docket manifest hash on Studionet');
      const tx = await client.lockManifest(docket.expected_manifest_digest);
      addLog('lock_manifest', 'SUCCESS', tx.hash, 'On-chain manifest lock ratified.');
      await refreshDocket();
    } catch (err: any) {
      addLog('lock_manifest', 'ERROR', undefined, err.message);
      alert(`Lock failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClusterSubmissions = async () => {
    if (!docket || !client) return;
    try {
      setIsLoading(true);
      addLog('cluster_submissions', 'PENDING', undefined, 'Invoking GenLayer Dragon Consensus LLM equivalence clustering');
      const tx = await client.clusterSubmissions();
      addLog('cluster_submissions', 'SUCCESS', tx.hash, 'On-chain non-deterministic clustering complete.');
      await refreshDocket();
    } catch (err: any) {
      addLog('cluster_submissions', 'ERROR', undefined, err.message);
      alert(`Clustering failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAllocateWitnesses = async () => {
    if (!docket || !client) return;
    try {
      setIsLoading(true);
      addLog('allocate_hearing_witnesses', 'PENDING', undefined, 'Executing deterministic balanced sortition algorithm on-chain');
      const tx = await client.allocateWitnesses();
      addLog('allocate_hearing_witnesses', 'SUCCESS', tx.hash, 'Witness sortition finalized on-chain.');
      await refreshDocket();
    } catch (err: any) {
      addLog('allocate_hearing_witnesses', 'ERROR', undefined, err.message);
      alert(`Sortition failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenContestation = async (type: ChallengeType, targetIds: string[], evidenceUrl: string, rat: string) => {
    if (!client) return;
    addLog('open_contestation', 'PENDING', undefined, `Filing ${type} challenge against ${targetIds.join(', ')}`);
    try {
      const tx = await client.openContestation(type, targetIds, evidenceUrl, rat);
      addLog('open_contestation', 'SUCCESS', tx.hash, 'On-chain challenge registered.');
      await refreshDocket();
    } catch (err: any) {
      addLog('open_contestation', 'ERROR', undefined, err.message);
      alert(`Dispute submission failed: ${err.message}`);
    }
  };

  const handleResolveContestation = async (id: number, outcome: string, reason: string) => {
    if (!client) return;
    addLog('resolve_contestation', 'PENDING', undefined, `Arbitrating dispute #${id} with GenLayer consensus`);
    try {
      const tx = await client.resolveContestation(id, outcome, reason);
      addLog('resolve_contestation', 'SUCCESS', tx.hash, `Dispute #${id} resolved on-chain.`);
      await refreshDocket();
    } catch (err: any) {
      addLog('resolve_contestation', 'ERROR', undefined, err.message);
      alert(`Arbitration failed: ${err.message}`);
    }
  };

  const handleRatifyDocket = async () => {
    if (!docket || !client) return;
    try {
      setIsLoading(true);
      addLog('ratify_docket', 'PENDING', undefined, 'Publishing sovereign ratification to Federal Register');
      const tx = await client.ratifyDocket();
      addLog('ratify_docket', 'SUCCESS', tx.hash, 'Docket ratified on GenLayer blockchain.');
      await refreshDocket();
    } catch (err: any) {
      addLog('ratify_docket', 'ERROR', undefined, err.message);
      alert(`Ratification failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnnulDocket = async () => {
    if (!client) return;
    const reason = prompt('Specify administrative justification for pre-lock docket annulment:');
    if (!reason) return;
    try {
      setIsLoading(true);
      addLog('annul_docket_prelock', 'PENDING', undefined, 'Pre-lock docket annulment initiated');
      const tx = await client.annulDocket(reason);
      addLog('annul_docket_prelock', 'SUCCESS', tx.hash, 'Docket annulled on-chain.');
      await refreshDocket();
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
          onInitializeDocket={handleInitializeDocket}
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
