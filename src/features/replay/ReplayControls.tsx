import { Pause, Play, SkipBack, Zap } from 'lucide-react';
import { useState } from 'react';
import { marketPulseApi } from '../../api/marketPulseApi.ts';
import type { DataSource } from '../../contracts/market.ts';
import {
  replaySpeedMultipliers,
  type ReplayControl,
} from '../../contracts/replay.ts';
import {
  formatMarketDateTime,
  formatReplayDay,
} from '../../formatting/marketFormat.ts';
import styles from './ReplayControls.module.scss';

interface ReplayControlsProps {
  dataSource: DataSource;
  marketTime: string;
  isDisabled: boolean;
}

const POSITION_STEP_MS = 5 * 60_000;
const DAY_MS = 86_400_000;
const SECONDS_PER_MINUTE = 60;

export function ReplayControls({
  dataSource,
  marketTime,
  isDisabled,
}: ReplayControlsProps) {
  const [controlReplay, { isLoading, isError }] =
    marketPulseApi.useControlReplayMutation();
  // While the slider is dragged, it shows the chosen time instead of following the replay.
  const [draftPositionMs, setDraftPositionMs] = useState<number | null>(null);

  const { replayStart, replayEnd, isPaused, speedMultiplier, bookmarks } =
    dataSource;
  const replayStartMs = Date.parse(replayStart);
  const lastPositionMs = Date.parse(replayEnd) - POSITION_STEP_MS;
  const positionMs = draftPositionMs ?? Date.parse(marketTime);
  const replayDayStarts = Array.from(
    { length: Math.round((Date.parse(replayEnd) - replayStartMs) / DAY_MS) },
    (_, dayIndex) => new Date(replayStartMs + dayIndex * DAY_MS),
  );
  const areControlsDisabled = isDisabled || isLoading;

  function changeReplay(replayControl: ReplayControl) {
    void controlReplay(replayControl);
  }

  function commitDraftPosition() {
    if (draftPositionMs === null) {
      return;
    }
    void controlReplay({
      marketTime: new Date(draftPositionMs).toISOString(),
    }).finally(() => {
      setDraftPositionMs(null);
    });
  }

  return (
    <div className={styles.controls}>
      <div className={styles.transport}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Restart replay"
          title="Restart replay"
          disabled={areControlsDisabled}
          onClick={() => {
            changeReplay({ marketTime: replayStart });
          }}
        >
          <SkipBack size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.playButton}
          aria-label={isPaused ? 'Resume replay' : 'Pause replay'}
          title={isPaused ? 'Resume replay' : 'Pause replay'}
          disabled={areControlsDisabled}
          onClick={() => {
            changeReplay({ isPaused: !isPaused });
          }}
        >
          {isPaused ? (
            <Play size={18} aria-hidden="true" />
          ) : (
            <Pause size={18} aria-hidden="true" />
          )}
        </button>
      </div>

      <div className={styles.timeline}>
        <input
          type="range"
          className={styles.slider}
          aria-label="Replay position"
          aria-valuetext={formatMarketDateTime(
            new Date(positionMs).toISOString(),
          )}
          min={replayStartMs}
          max={lastPositionMs}
          step={POSITION_STEP_MS}
          value={positionMs}
          disabled={areControlsDisabled}
          onChange={(event) => {
            setDraftPositionMs(Number(event.target.value));
          }}
          onPointerUp={commitDraftPosition}
          onKeyUp={commitDraftPosition}
        />
        <div className={styles.days} aria-hidden="true">
          {replayDayStarts.map((dayStart) => (
            <span key={dayStart.toISOString()}>
              {formatReplayDay(dayStart)}
            </span>
          ))}
        </div>
      </div>

      <fieldset className={styles.speed} disabled={areControlsDisabled}>
        <legend className={styles.speedLegend}>Speed</legend>
        <div className={styles.speedOptions}>
          {replaySpeedMultipliers.map((speedOption) => (
            <label
              key={speedOption}
              className={styles.speedOption}
              title={`1 second covers ${String(speedOption / SECONDS_PER_MINUTE)} minutes`}
            >
              <input
                type="radio"
                name="replay-speed"
                className={styles.speedRadio}
                checked={speedOption === speedMultiplier}
                onChange={() => {
                  changeReplay({ speedMultiplier: speedOption });
                }}
              />
              {`${String(speedOption)}×`}
            </label>
          ))}
        </div>
      </fieldset>

      {bookmarks.map(({ label, marketTime: bookmarkTime }) => (
        <button
          key={bookmarkTime}
          type="button"
          className={styles.bookmarkButton}
          disabled={areControlsDisabled}
          onClick={() => {
            changeReplay({ marketTime: bookmarkTime });
          }}
        >
          <Zap size={14} aria-hidden="true" />
          {`Jump to ${label}`}
        </button>
      ))}

      {isError && (
        <p className={styles.error} role="alert">
          The replay could not be changed. Please try again.
        </p>
      )}
    </div>
  );
}
