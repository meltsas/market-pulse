import styles from './SegmentedControl.module.scss';

interface SegmentedControlProps<Option extends string> {
  name: string;
  legend: string;
  options: readonly Option[];
  value: Option;
  getLabel: (option: Option) => string;
  onChange: (option: Option) => void;
}

export function SegmentedControl<Option extends string>({
  name,
  legend,
  options,
  value,
  getLabel,
  onChange,
}: SegmentedControlProps<Option>) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option} className={styles.option}>
            <input
              type="radio"
              name={name}
              className={styles.radio}
              checked={option === value}
              onChange={() => {
                onChange(option);
              }}
            />
            {getLabel(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
