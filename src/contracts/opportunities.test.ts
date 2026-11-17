import { describe, expect, it } from 'vitest';
import { sampleOpportunityList } from '../test/apiFixtures.ts';
import { opportunityListSchema } from './opportunities.ts';

describe('opportunityListSchema', () => {
  it('accepts a valid list with a missing metric', () => {
    expect(opportunityListSchema.safeParse(sampleOpportunityList).success).toBe(
      true,
    );
  });

  it('rejects a negative drawdown, which is expressed as a positive percentage', () => {
    const opportunityList = {
      ...sampleOpportunityList,
      opportunities: sampleOpportunityList.opportunities.map((opportunity) => ({
        ...opportunity,
        metrics: { ...opportunity.metrics, drawdownFromHighPercent: -24.5 },
      })),
    };

    expect(opportunityListSchema.safeParse(opportunityList).success).toBe(
      false,
    );
  });
});
