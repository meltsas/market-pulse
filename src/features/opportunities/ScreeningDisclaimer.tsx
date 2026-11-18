import { Info } from 'lucide-react';
import styles from './ScreeningDisclaimer.module.scss';

export function ScreeningDisclaimer() {
  return (
    <p className={styles.disclaimer}>
      <Info size={16} aria-hidden="true" />
      The bias counts simple, rule-based signals from prices and company
      reports. It highlights what deserves a closer look and is not investment
      advice or a recommendation to buy or sell.
    </p>
  );
}
