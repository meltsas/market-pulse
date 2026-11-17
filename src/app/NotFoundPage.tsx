import { Link } from 'react-router';
import { PageHeader } from '../components/PageHeader.tsx';
import { routePaths } from './routePaths.ts';

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
      />
      <Link to={routePaths.opportunities}>Go to Opportunity Radar</Link>
    </>
  );
}
