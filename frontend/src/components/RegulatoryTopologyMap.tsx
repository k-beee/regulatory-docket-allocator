import React, { useState } from 'react';
import { RegulatoryCluster, SubmissionRecord } from '../types';
import { Layers, Users, Award, FileSearch, Sparkles } from 'lucide-react';

interface RegulatoryTopologyMapProps {
  clusters: RegulatoryCluster[];
  submissions: SubmissionRecord[];
  onSelectSubmission?: (sub: SubmissionRecord) => void;
}

const CLUSTER_ACCENTS = [
  { border: 'rgba(14, 165, 233, 0.5)', bg: 'rgba(14, 165, 233, 0.08)', text: 'var(--color-accent-cyan)' },
  { border: 'rgba(20, 184, 166, 0.5)', bg: 'rgba(20, 184, 166, 0.08)', text: 'var(--color-accent-teal)' },
  { border: 'rgba(234, 179, 8, 0.5)', bg: 'rgba(234, 179, 8, 0.08)', text: 'var(--color-accent-gold)' },
  { border: 'rgba(168, 85, 247, 0.5)', bg: 'rgba(168, 85, 247, 0.08)', text: '#c084fc' },
  { border: 'rgba(244, 63, 94, 0.5)', bg: 'rgba(244, 63, 94, 0.08)', text: '#fb7185' },
];

export const RegulatoryTopologyMap: React.FC<RegulatoryTopologyMapProps> = ({
  clusters,
  submissions,
  onSelectSubmission
}) => {
  const [activeClusterId, setActiveClusterId] = useState<number | null>(null);

  if (!clusters || clusters.length === 0) {
    return (
      <div className="reg-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
        <Layers size={36} color="var(--color-text-muted)" style={{ margin: '0 auto 0.75rem' }} />
        <h4 style={{ color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>Impact Consensus Topology Pending</h4>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
          Lock the manifest and run GenLayer Dragon Consensus impact clustering to classify substantive comments into distinct APA regulatory perspectives.
        </p>
      </div>
    );
  }

  const totalSubs = submissions.length || 1;

  return (
    <div className="reg-card" style={{ marginBottom: '1.5rem', padding: '1.5rem 1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <span className="reg-label" style={{ color: 'var(--color-accent-cyan)' }}>
            SUBSTANTIVE EQUIVALENCE TOPOLOGY // APA § 553(c)
          </span>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
            Consensus Impact Clusters & Stratification
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          <Sparkles size={14} color="var(--color-accent-cyan)" />
          <span>Equivalence Principle: Similar Submissions Clustered</span>
        </div>
      </div>

      {/* Cluster Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {clusters.map((cluster, idx) => {
          const accent = CLUSTER_ACCENTS[idx % CLUSTER_ACCENTS.length];
          const clusterSubs = submissions.filter(s => s.cluster_id === cluster.cluster_id);
          const witnesses = clusterSubs.filter(s => s.selected);
          const proportion = Math.round((clusterSubs.length / totalSubs) * 100);
          const isSelected = activeClusterId === cluster.cluster_id;

          return (
            <div
              key={cluster.cluster_id}
              onClick={() => setActiveClusterId(isSelected ? null : cluster.cluster_id)}
              style={{
                borderRadius: '8px',
                border: `1px solid ${isSelected ? accent.text : accent.border}`,
                background: accent.bg,
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 0 16px ${accent.bg}` : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: accent.text, fontWeight: 600 }}>
                  CLUSTER 0{cluster.cluster_id}
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {proportion}% Docket Share ({clusterSubs.length} comments)
                </span>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
                {cluster.label}
              </h4>

              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', lineHeight: 1.4, marginBottom: '0.85rem' }}>
                {cluster.summary}
              </p>

              {/* Witnesses in this cluster */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <Users size={13} />
                  <span>Witness Quota:</span>
                  <strong style={{ color: witnesses.length > 0 ? 'var(--color-accent-teal)' : 'var(--color-text-muted)' }}>
                    {witnesses.length} Allocated
                  </strong>
                </div>

                {witnesses.length > 0 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-accent-gold)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    <Award size={12} /> Testifying
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Cluster Expanded Inspector */}
      {activeClusterId !== null && (
        <div style={{
          background: 'rgba(10, 18, 33, 0.7)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: '8px',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Submissions in Cluster 0{activeClusterId}:
            </h5>
            <button
              onClick={() => setActiveClusterId(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Close inspector
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {submissions.filter(s => s.cluster_id === activeClusterId).map((sub) => (
              <div
                key={sub.submission_id}
                onClick={() => onSelectSubmission && onSelectSubmission(sub)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(20, 34, 61, 0.5)',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '6px',
                  border: sub.selected ? '1px solid var(--color-accent-cyan)' : '1px solid var(--color-border-subtle)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-accent-teal)', fontWeight: 600 }}>
                    {sub.submission_id}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>
                    {sub.url.split('/').pop() || sub.url}
                  </span>
                  {sub.selected && (
                    <span className="reg-badge reg-badge-active" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                      ALLOCATED WITNESS #{sub.selection_rank}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  <span>Score: {sub.relevance_score}/100</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{sub.digest.slice(0, 10)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
