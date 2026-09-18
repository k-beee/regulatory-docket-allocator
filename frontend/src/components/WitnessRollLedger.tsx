import React from 'react';
import { SubmissionRecord } from '../types';
import { UserCheck, ShieldAlert, Award, ExternalLink, Hash, CheckCircle } from 'lucide-react';

interface WitnessRollLedgerProps {
  witnesses: SubmissionRecord[];
  onContestWitness?: (witness: SubmissionRecord) => void;
  canContest: boolean;
}

export const WitnessRollLedger: React.FC<WitnessRollLedgerProps> = ({
  witnesses,
  onContestWitness,
  canContest
}) => {
  if (!witnesses || witnesses.length === 0) {
    return (
      <div className="reg-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <UserCheck size={36} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem' }} />
        <h4 style={{ color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Witness Roll Empty</h4>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
          Execute sortition after impact clustering to populate the official oral testimony roll.
        </p>
      </div>
    );
  }

  return (
    <div className="reg-card" style={{ marginBottom: '1.5rem', padding: '1.5rem 1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span className="reg-label" style={{ color: 'var(--color-accent-teal)' }}>
            HEARING DOCKET RECORD // 5 U.S.C. § 553(c)
          </span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
            Official Witness Sortition Roll
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--color-accent-teal)' }}>
          <CheckCircle size={15} />
          <span>Balanced Cluster Quota Applied ({witnesses.length} Testifiers)</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {witnesses.map((w) => (
          <div
            key={w.submission_id}
            style={{
              background: 'rgba(20, 34, 61, 0.4)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '8px',
              padding: '1.1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              transition: 'border-color 0.2s ease'
            }}
          >
            {/* Witness Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'rgba(20, 184, 166, 0.15)',
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--color-accent-teal)'
                }}>
                  #{w.selection_rank}
                </div>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                    {w.submission_id}
                  </span>
                  <span style={{ margin: '0 0.5rem', color: 'var(--color-border-subtle)' }}>•</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                    Cluster {w.cluster_id}: {w.cluster_label}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="reg-badge reg-badge-active" style={{ fontSize: '0.7rem' }}>
                  Impact Score: {w.relevance_score}/100
                </span>
                {canContest && onContestWitness && (
                  <button
                    className="reg-btn reg-btn-outline"
                    onClick={() => onContestWitness(w)}
                    style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderColor: 'rgba(234, 179, 8, 0.4)', color: 'var(--color-accent-gold)' }}
                  >
                    <ShieldAlert size={12} /> Challenge
                  </button>
                )}
              </div>
            </div>

            {/* Substantive Rationale */}
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', background: 'rgba(6, 13, 26, 0.5)', padding: '0.65rem 0.85rem', borderRadius: '6px', borderLeft: '3px solid var(--color-accent-teal)' }}>
              <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent-teal)', marginBottom: '0.2rem' }}>
                SORTITION RATIONALE [{w.reason_code}]
              </div>
              {w.rationale}
            </div>

            {/* Technical Verification Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>Registrar: <code>{w.registrar.slice(0, 12)}...</code></span>
                <span>•</span>
                <span>SHA-256 Digest: <code>{w.digest.slice(0, 16)}...</code></span>
              </div>
              <a
                href={w.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}
              >
                View Comment Filing <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
