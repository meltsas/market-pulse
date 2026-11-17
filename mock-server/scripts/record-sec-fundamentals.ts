import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { demoInstruments } from '../src/instruments.ts';
import {
  secFundamentalsFile,
  secFundamentalsSchema,
  type ReportedValue,
  type SecFundamentals,
} from '../src/recordedData.ts';

const SEC_COMPANY_FACTS_URL = 'https://data.sec.gov/api/xbrl/companyfacts/';
const PROVIDER = 'SEC EDGAR';
// The SEC allows at most 10 requests per second.
const REQUEST_DELAY_MS = 200;
const DAY_MS = 86_400_000;
const REVENUE_TAGS = [
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'Revenues',
];
const QUARTER_DAYS = { min: 80, max: 100 };
const FISCAL_YEAR_DAYS = { min: 350, max: 380 };
const REVENUE_HISTORY_START = '2023-01-01';
const EPS_HISTORY_START = '2022-01-01';

const factSchema = z.object({
  start: z.iso.date().optional(),
  end: z.iso.date(),
  val: z.number(),
  form: z.string(),
  filed: z.iso.date(),
});
type Fact = z.infer<typeof factSchema>;

const companyFactsSchema = z.object({
  entityName: z.string(),
  facts: z.object({
    'us-gaap': z.record(
      z.string(),
      z.object({ units: z.record(z.string(), z.array(factSchema)) }),
    ),
  }),
});

interface PeriodFilter {
  minDays: number;
  maxDays: number;
  forms: readonly string[];
  since: string;
}

// Keeps the first-filed value per period, so later restatements do not leak into earlier dates.
function selectReportedValues(
  facts: readonly Fact[],
  { minDays, maxDays, forms, since }: PeriodFilter,
): ReportedValue[] {
  const valuesByPeriod = new Map<string, ReportedValue>();
  for (const { start, end, val, form, filed } of facts) {
    if (!start || !forms.includes(form) || end < since) {
      continue;
    }
    const durationDays = (Date.parse(end) - Date.parse(start)) / DAY_MS;
    if (durationDays < minDays || durationDays > maxDays) {
      continue;
    }
    const periodKey = `${start}/${end}`;
    const existing = valuesByPeriod.get(periodKey);
    if (!existing || filed < existing.filed) {
      valuesByPeriod.set(periodKey, { start, end, filed, value: val });
    }
  }
  return [...valuesByPeriod.values()].sort((first, second) =>
    first.end.localeCompare(second.end),
  );
}

function selectQuarterlyRevenue(
  gaapFacts: z.infer<typeof companyFactsSchema>['facts']['us-gaap'],
) {
  const candidates = REVENUE_TAGS.map((tag) =>
    selectReportedValues(gaapFacts[tag]?.units.USD ?? [], {
      minDays: QUARTER_DAYS.min,
      maxDays: QUARTER_DAYS.max,
      forms: ['10-Q', '10-K'],
      since: REVENUE_HISTORY_START,
    }),
  );
  const latestEnd = (values: ReportedValue[]) => values.at(-1)?.end ?? '';
  return candidates.reduce((best, candidate) =>
    latestEnd(candidate) > latestEnd(best) ? candidate : best,
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const userAgent = process.env.SEC_USER_AGENT;
if (!userAgent) {
  console.error(
    'Set SEC_USER_AGENT in .env to a name and contact email; the SEC requires it for automated requests.',
  );
  process.exit(1);
}

const companies: SecFundamentals['companies'] = [];
for (const { symbol, secCik } of demoInstruments) {
  if (!secCik) {
    continue;
  }
  const response = await fetch(`${SEC_COMPANY_FACTS_URL}CIK${secCik}.json`, {
    headers: { 'User-Agent': userAgent },
  });
  if (!response.ok) {
    throw new Error(
      `${PROVIDER} request for ${symbol} failed with HTTP ${String(response.status)}`,
    );
  }
  const companyFacts = companyFactsSchema.parse(await response.json());
  const gaapFacts = companyFacts.facts['us-gaap'];

  companies.push({
    symbol,
    cik: secCik,
    entityName: companyFacts.entityName,
    quarterlyRevenue: selectQuarterlyRevenue(gaapFacts),
    annualDilutedEps: selectReportedValues(
      gaapFacts.EarningsPerShareDiluted?.units['USD/shares'] ?? [],
      {
        minDays: FISCAL_YEAR_DAYS.min,
        maxDays: FISCAL_YEAR_DAYS.max,
        forms: ['10-K'],
        since: EPS_HISTORY_START,
      },
    ),
  });
  console.info(`${symbol}: ${companyFacts.entityName}`);
  await wait(REQUEST_DELAY_MS);
}

const secFundamentals = secFundamentalsSchema.parse({
  provider: PROVIDER,
  recordedAt: new Date().toISOString(),
  companies,
});
await mkdir(new URL('.', secFundamentalsFile), { recursive: true });
await writeFile(
  secFundamentalsFile,
  `${JSON.stringify(secFundamentals, null, 2)}\n`,
);
console.info(`Saved ${secFundamentalsFile.pathname}`);
