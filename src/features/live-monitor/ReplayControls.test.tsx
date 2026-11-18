import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import { createAppStore } from '../../app/store.ts';
import type { DataSource } from '../../contracts/market.ts';
import { sampleDataSource } from '../../test/apiFixtures.ts';
import { ReplayControls } from './ReplayControls.tsx';

const marketTime = '2026-11-05T15:00:00.000Z';

function renderReplayControls({
  dataSource = sampleDataSource,
  isDisabled = false,
}: { dataSource?: DataSource; isDisabled?: boolean } = {}) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    Promise.resolve(Response.json({ asOf: marketTime, dataSource })),
  );
  vi.stubGlobal('fetch', fetchMock);
  render(
    <Provider store={createAppStore()}>
      <ReplayControls
        dataSource={dataSource}
        marketTime={marketTime}
        isDisabled={isDisabled}
      />
    </Provider>,
  );

  return async function readSentControls() {
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    return Promise.all(
      fetchMock.mock.calls.map(([request]) => {
        if (!(request instanceof Request)) {
          throw new Error('Expected a Request');
        }
        expect(request.method).toBe('PATCH');
        expect(request.url).toBe('http://localhost/api/replay');
        return request.json() as Promise<unknown>;
      }),
    );
  };
}

describe('ReplayControls', () => {
  it('pauses a running replay', async () => {
    const user = userEvent.setup();
    const readSentControls = renderReplayControls();

    await user.click(screen.getByRole('button', { name: 'Pause replay' }));

    expect(await readSentControls()).toEqual([{ isPaused: true }]);
  });

  it('resumes a paused replay', async () => {
    const user = userEvent.setup();
    const readSentControls = renderReplayControls({
      dataSource: { ...sampleDataSource, isPaused: true },
    });

    await user.click(screen.getByRole('button', { name: 'Resume replay' }));

    expect(await readSentControls()).toEqual([{ isPaused: false }]);
  });

  it('shows the current speed and changes it', async () => {
    const user = userEvent.setup();
    const readSentControls = renderReplayControls();

    expect(screen.getByRole('radio', { name: '300×' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '60×' }));

    expect(await readSentControls()).toEqual([{ speedMultiplier: 60 }]);
  });

  it('jumps to a bookmarked moment', async () => {
    const user = userEvent.setup();
    const readSentControls = renderReplayControls();

    await user.click(
      screen.getByRole('button', { name: 'Jump to 5 Nov sell-off' }),
    );

    expect(await readSentControls()).toEqual([
      { marketTime: '2026-11-05T14:25:00Z' },
    ]);
  });

  it('restarts the replay from the beginning', async () => {
    const user = userEvent.setup();
    const readSentControls = renderReplayControls();

    await user.click(screen.getByRole('button', { name: 'Restart replay' }));

    expect(await readSentControls()).toEqual([
      { marketTime: sampleDataSource.replayStart },
    ]);
  });

  it('moves the replay once the slider is released', async () => {
    const readSentControls = renderReplayControls();
    const slider = screen.getByRole('slider', { name: 'Replay position' });

    fireEvent.change(slider, {
      target: { value: String(Date.parse('2026-11-06T10:00:00.000Z')) },
    });
    expect(slider).toHaveAttribute(
      'aria-valuetext',
      expect.stringContaining('6 Nov 2026, 10:00') as unknown,
    );
    fireEvent.keyUp(slider);

    expect(await readSentControls()).toEqual([
      { marketTime: '2026-11-06T10:00:00.000Z' },
    ]);
  });

  it('is disabled while live updates are unavailable', () => {
    renderReplayControls({ isDisabled: true });

    expect(screen.getByRole('button', { name: 'Pause replay' })).toBeDisabled();
    expect(
      screen.getByRole('slider', { name: 'Replay position' }),
    ).toBeDisabled();
    expect(screen.getByRole('radio', { name: '60×' })).toBeDisabled();
  });
});
