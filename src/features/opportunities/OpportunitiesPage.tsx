import { Activity, Radar } from 'lucide-react';
import { Link } from 'react-router';
import { routePaths } from '../../app/routePaths.ts';
import buttonStyles from '../../components/Button.module.scss';
import { EmptyState } from '../../components/EmptyState.tsx';
import { PageHeader } from '../../components/PageHeader.tsx';

export function OpportunitiesPage() {
  return (
    <>
      <PageHeader
        title="Opportunity Radar"
        description="Companies worth a closer look, with the signals behind each result and their limitations."
      />
      <EmptyState
        icon={Radar}
        title="Screening results are on the way"
        description="Opportunity Radar will rank instruments by drawdown, revenue growth, and valuation, and explain the signals and risks behind each result. Live Monitor is ready to explore in the meantime."
      >
        <Link to={routePaths.liveMonitor} className={buttonStyles.primary}>
          <Activity size={16} aria-hidden="true" />
          Open Live Monitor
        </Link>
      </EmptyState>
    </>
  );
}
