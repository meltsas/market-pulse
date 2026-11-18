import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './EmptyState.module.scss';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'neutral' | 'warning';
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
  children,
}: EmptyStateProps) {
  return (
    <section className={styles.emptyState} data-tone={tone}>
      <span className={styles.icon}>
        <Icon size={24} aria-hidden="true" />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </section>
  );
}
