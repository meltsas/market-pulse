import { PageHeader } from '../../components/PageHeader.tsx';
import styles from './SettingsPage.module.scss';
import { ThemePicker } from './ThemePicker.tsx';

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Personalize how Market Pulse looks on this device."
      />
      <section className={styles.section} aria-labelledby="appearance-heading">
        <div className={styles.sectionIntro}>
          <h2 id="appearance-heading" className={styles.sectionTitle}>
            Appearance
          </h2>
          <p className={styles.sectionDescription}>
            Your choice is saved in this browser.
          </p>
        </div>
        <ThemePicker />
      </section>
    </>
  );
}
