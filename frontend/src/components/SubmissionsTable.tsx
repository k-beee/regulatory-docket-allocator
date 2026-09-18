import React, { useState, useMemo } from 'react';
import { SubmissionRecord } from '../types';
import { Search, Filter, ExternalLink, CheckCircle, AlertTriangle, UserCheck, ShieldAlert } from 'lucide-react';

interface SubmissionsTableProps {
  submissions: SubmissionRecord[];
  onSelectSubmission?: (sub: SubmissionRecord) => void;
  onContestSubmission?: (sub: SubmissionRecord) => void;
  canContest: boolean;
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  submissions,
  onSelectSubmission,
  onContestSubmission,
  canContest
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'SELECTED' | 'DUPLICATES'>('ALL');

  const filtered = useMemo(() => {
    return submissions.filter(sub => {
      const matchSearch =
        sub.submission_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.registrar.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.cluster_label.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterMode === 'SELECTED') return sub.selected;
      if (filterMode === 'DUPLICATES') return sub.is_duplicate;
      return true;
    });
  }, [submissions, searchTerm, filterMode]);

  return (
    <div className="reg-card" style={{ marginBottom: '1.5rem', padding: '1.5rem 1.75rem' }}>
      {/* Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <span className="reg-label" style={{ color: 'var(--color-accent-cyan)' }}>
            DOCKET REPOSITORY // 5 U.S.C. § 553(c)
          </span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
            Administrative Record Comment Filings ({submissions.length})
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} color="var(--color-text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search ID, author, cluster..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="reg-input"
              style={{ paddingLeft: '32px', fontSize: '0.8rem', height: '34px' }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', background: 'rgba(20, 34, 61, 0.6)', padding: '2px', borderRadius: '6px', border: '1px solid var(--color-border-subtle)' }}>
            <button
              onClick={() => setFilterMode('ALL')}
              style={{
                background: filterMode === 'ALL' ? 'var(--color-accent-cyan)' : 'transparent',
                color: filterMode === 'ALL' ? '#060d1a' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setFilterMode('SELECTED')}
              style={{
                background: filterMode === 'SELECTED' ? 'var(--color-accent-teal)' : 'transparent',
                color: filterMode === 'SELECTED' ? '#060d1a' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Witnesses ({submissions.filter(s => s.selected).length})
            </button>
            <button
              onClick={() => setFilterMode('DUPLICATES')}
              style={{
                background: filterMode === 'DUPLICATES' ? 'var(--color-accent-ruby)' : 'transparent',
                color: filterMode === 'DUPLICATES' ? '#ffffff' : 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Astroturf ({submissions.filter(s => s.is_duplicate).length})
            </button>
          </div>
        </div>
      </div>

      {/* Table Component */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>SUBMISSION ID</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>COMMENT / CITATION</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>REGISTRAR</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>CLUSTER CLASSIFICATION</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>IMPACT SCORE</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>STATUS</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No submissions match the current filter or search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((sub) => {
                const filename = sub.url.split('/').pop() || sub.url;
                return (
                  <tr
                    key={sub.submission_id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: sub.selected ? 'rgba(20, 184, 166, 0.05)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Submission ID */}
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--color-accent-teal)', fontWeight: 600 }}>
                      {sub.submission_id}
                    </td>

                    {/* Document URL */}
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <a
                        href={sub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-text-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        {filename}
                        <ExternalLink size={11} color="var(--color-text-muted)" />
                      </a>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        SHA-256: {sub.digest.slice(0, 12)}...
                      </div>
                    </td>

                    {/* Registrar */}
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                      {sub.registrar.slice(0, 8)}...{sub.registrar.slice(-4)}
                    </td>

                    {/* Cluster Classification */}
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {sub.cluster_label ? (
                        <div>
                          <span style={{ color: 'var(--color-accent-cyan)', fontWeight: 500 }}>
                            C{sub.cluster_id}: {sub.cluster_label}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>Pending Clustering</span>
                      )}
                    </td>

                    {/* Impact Score */}
                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                      {sub.relevance_score > 0 ? (
                        <span style={{ color: sub.relevance_score >= 80 ? 'var(--color-accent-teal)' : 'var(--color-accent-gold)' }}>
                          {sub.relevance_score}/100
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {sub.is_duplicate ? (
                        <span className="reg-badge reg-badge-annulled" style={{ fontSize: '0.65rem' }}>
                          ASTROTURF DUPLICATE
                        </span>
                      ) : sub.selected ? (
                        <span className="reg-badge reg-badge-active" style={{ fontSize: '0.65rem' }}>
                          ALLOCATED WITNESS #{sub.selection_rank}
                        </span>
                      ) : sub.eligible ? (
                        <span className="reg-badge reg-badge-pending" style={{ fontSize: '0.65rem' }}>
                          ENROLLED (ELIGIBLE)
                        </span>
                      ) : (
                        <span className="reg-badge reg-badge-annulled" style={{ fontSize: '0.65rem' }}>
                          EXCLUDED
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {canContest && !sub.is_duplicate && onContestSubmission && (
                          <button
                            className="reg-btn reg-btn-outline"
                            onClick={() => onContestSubmission(sub)}
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderColor: 'rgba(234, 179, 8, 0.4)', color: 'var(--color-accent-gold)' }}
                            title="Open Astroturf / Provenance Dispute"
                          >
                            <ShieldAlert size={12} /> Dispute
                          </button>
                        )}
                        {onSelectSubmission && (
                          <button
                            className="reg-btn reg-btn-outline"
                            onClick={() => onSelectSubmission(sub)}
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
