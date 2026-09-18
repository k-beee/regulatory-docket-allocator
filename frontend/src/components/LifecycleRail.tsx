import React from 'react';
import { LifecycleState } from '../types';
import { CheckCircle2, Circle } from 'lucide-react';

interface LifecycleRailProps {
  currentState: LifecycleState;
}

const STAGES: { state: LifecycleState; step: number; label: string; desc: string }[] = [
  { state: 'ENROLLING', step: 1, label: 'Public Enrollment', desc: 'Agency records APA comment filings' },
  { state: 'MANIFEST_LOCKED', step: 2, label: 'Manifest Freeze', desc: 'Canonical hash committed & sealed' },
  { state: 'IMPACT_CONSENSUS', step: 3, label: 'Impact Consensus', desc: 'LLM validators classify substance' },
  { state: 'WITNESSES_ALLOCATED', step: 4, label: 'Balanced Sortition', desc: 'Deterministic multi-cluster selection' },
  { state: 'CONTESTATION_OPEN', step: 5, label: 'Arbitration Window', desc: 'Astroturf & provenance challenges' },
  { state: 'SOVEREIGN_RATIFIED', step: 6, label: 'Sovereign Ratification', desc: 'Binding record published to register' },
];

export const LifecycleRail: React.FC<LifecycleRailProps> = ({ currentState }) => {
  const isAnnulled = currentState === 'ANNULLED_PRELOCK';
  
  const getStageIndex = (st: LifecycleState) => {
    switch (st) {
      case 'ENROLLING': return 0;
      case 'MANIFEST_LOCKED': return 1;
      case 'IMPACT_CONSENSUS': return 2;
      case 'WITNESSES_ALLOCATED': return 3;
      case 'CONTESTATION_OPEN': return 4;
      case 'SOVEREIGN_RATIFIED': return 5;
      default: return -1;
    }
  };

  const currentIndex = getStageIndex(currentState);

  return (
    <div className="reg-card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <span className="reg-label" style={{ letterSpacing: '0.08em', color: 'var(--color-accent-teal)' }}>
            PROCEDURAL AUDIT TRAIL // 5 U.S.C. § 553
          </span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>
            Administrative Lifecycle State Machine
          </h3>
        </div>
        <div>
          <span className={`reg-badge ${isAnnulled ? 'reg-badge-annulled' : 'reg-badge-active'}`} style={{ padding: '0.35rem 0.85rem' }}>
            {isAnnulled ? 'DOCKET ANNULLED' : currentState.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
        alignItems: 'stretch'
      }}>
        {STAGES.map((s, idx) => {
          const isPassed = !isAnnulled && idx < currentIndex;
          const isCurrent = !isAnnulled && idx === currentIndex;
          const isUpcoming = !isAnnulled && idx > currentIndex;

          let borderColor = 'var(--color-border-subtle)';
          let bg = 'rgba(20, 34, 61, 0.4)';
          let iconColor = 'var(--color-text-muted)';
          let titleColor = 'var(--color-text-secondary)';

          if (isPassed) {
            borderColor = 'rgba(20, 184, 166, 0.4)';
            bg = 'rgba(20, 184, 166, 0.08)';
            iconColor = 'var(--color-accent-teal)';
            titleColor = 'var(--color-text-primary)';
          } else if (isCurrent) {
            borderColor = 'rgba(14, 165, 233, 0.6)';
            bg = 'rgba(14, 165, 233, 0.12)';
            iconColor = 'var(--color-accent-cyan)';
            titleColor = 'var(--color-text-primary)';
          }

          return (
            <div
              key={s.state}
              style={{
                borderRadius: '8px',
                border: `1px solid ${borderColor}`,
                background: bg,
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: isCurrent ? 'var(--color-accent-cyan)' : 'var(--color-text-muted)' }}>
                  STAGE 0{s.step}
                </span>
                {isPassed && <CheckCircle2 size={16} color={iconColor} />}
                {isCurrent && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-accent-cyan)', boxShadow: '0 0 8px var(--color-accent-cyan)' }} />}
                {isUpcoming && <Circle size={14} color="var(--color-border-subtle)" />}
              </div>

              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: titleColor, marginBottom: '0.2rem' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                  {s.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
