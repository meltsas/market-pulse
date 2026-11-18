import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import buttonStyles from '../components/Button.module.scss';
import { EmptyState } from '../components/EmptyState.tsx';
import { PageHeader } from '../components/PageHeader.tsx';
import { routePaths } from './routePaths.ts';

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
      />
      <EmptyState
        icon={Compass}
        title="Nothing here"
        description="Check the address, or continue from one of the main sections."
      >
        <Link to={routePaths.opportunities} className={buttonStyles.secondary}>
          Go to Opportunity Radar
        </Link>
      </EmptyState>
    </>
  );
}
