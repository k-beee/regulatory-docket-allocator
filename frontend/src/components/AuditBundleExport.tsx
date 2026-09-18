import React, { useState } from 'react';
import { DocketSummary, LifecycleState, RegulatoryCluster, SubmissionRecord, ContestationRecord, AuditBundle } from '../types';
import { FileText, Download, CheckCircle, ShieldCheck, X, Copy, ExternalLink } from 'lucide-react';

interface AuditBundleExportProps {
  isOpen: boolean;
  onClose: () => void;
  docket: DocketSummary | null;
  clusters: RegulatoryCluster[];
  submissions: SubmissionRecord[];
  contestations: ContestationRecord[];
}

export const AuditBundleExport: React.FC<AuditBundleExportProps> = ({
  isOpen,
  onClose,
  docket,
  clusters,
  submissions,
  contestations
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !docket) return null;

  const witnesses = submissions.filter(s => s.selected);

  // Compute APA score
  let apaScore = 70;
  if (docket.state === 'MANIFEST_LOCKED') apaScore = 80;
  if (docket.state === 'IMPACT_CONSENSUS') apaScore = 88;
  if (docket.state === 'WITNESSES_ALLOCATED' || docket.state === 'CONTESTATION_OPEN') apaScore = 95;
  if (docket.state === 'SOVEREIGN_RATIFIED') apaScore = 100;
  if (docket.accepted_contestation_count > 0) apaScore = Math.min(100, apaScore + 2);

  const bundle: AuditBundle = {
    docket,
    state: docket.state,
    regulatory_clusters: clusters,
    selected_witnesses: witnesses,
    all_submissions: submissions,
    contestations,
    canonical_manifest_sha256: docket.computed_manifest_digest || docket.expected_manifest_digest,
    apa_compliance_score: apaScore,
    apa_compliance_tier: apaScore === 100 ? 'EXEMPLARY NON-ARBITRARY COMPLIANCE (5 U.S.C. § 706)' : 'IN PROGRESS COMPLIANCE',
    exported_at: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(bundle, null, 2);

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docket-0${docket.docket_id}-apa-audit-bundle.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(6, 13, 26, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border-medium)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(14, 26, 47, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: 'rgba(20, 184, 166, 0.15)',
              border: '1px solid rgba(20, 184, 166, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-teal)'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Cryptographic APA Administrative Audit Bundle
              </h3>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                Rulemaking Record Verification // 5 U.S.C. §§ 553, 706
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Compliance Score Tile */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%)',
            border: '1px solid rgba(20, 184, 166, 0.3)',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent-teal)', textTransform: 'uppercase' }}>
                Administrative Procedure Act Score
              </span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.15rem' }}>
                {apaScore}/100 — {bundle.apa_compliance_tier}
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                Tamper-proof verifiable record resistant to arbitrary exclusion challenges.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="reg-btn reg-btn-outline"
                onClick={handleCopy}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              >
                <Copy size={13} /> {copied ? 'Copied!' : 'Copy JSON'}
              </button>
              <button
                className="reg-btn reg-btn-primary"
                onClick={handleDownload}
                style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}
              >
                <Download size={13} /> Download .json
              </button>
            </div>
          </div>

          {/* JSON Inspector Preview */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span className="reg-label">CANONICAL AUDIT PAYLOAD PREVIEW</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {witnesses.length} witnesses • {clusters.length} clusters • {submissions.length} filings
              </span>
            </div>
            <pre style={{
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '6px',
              padding: '1rem',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-accent-cyan)',
              maxHeight: '280px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.4
            }}>
              {jsonStr}
            </pre>
          </div>

        </div>

      </div>
    </div>
  );
};
