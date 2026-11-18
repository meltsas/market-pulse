import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sampleDataSource } from '../test/apiFixtures.ts';
import { DemoDataNotice } from './DemoDataNotice.tsx';

describe('DemoDataNotice', () => {
  it('describes recorded market data as a historical replay', () => {
    render(
      <DemoDataNotice
        dataSource={sampleDataSource}
        marketTime="2026-11-05T15:00:00Z"
      />,
    );

    const notice = screen.getByRole('complementary', {
      name: 'About this data',
    });
    expect(notice).toHaveTextContent('Historical replay');
    expect(notice).toHaveTextContent(
      'Recorded market data from 4 – 6 Nov 2026, replayed at 300× speed',
    );
  });

  it('makes clear that synthetic prices are not real market data', () => {
    render(
      <DemoDataNotice
        dataSource={{ ...sampleDataSource, kind: 'synthetic-replay' }}
        marketTime="2026-11-05T15:00:00Z"
      />,
    );

    const notice = screen.getByRole('complementary', {
      name: 'About this data',
    });
    expect(notice).toHaveTextContent('Synthetic replay');
    expect(notice).toHaveTextContent(
      'Generated prices, not real market data, for 4 – 6 Nov 2026',
    );
  });
});
