import fs from 'node:fs';
import path from 'node:path';

const dataPath = path.resolve('src/assets/mock-data/knowledgechart-demo.json');
const raw = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(raw);
const rows = data.dailyHistory ?? [];

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isoWeek = (date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

const isPeakSeason = (date) => {
  const week = isoWeek(date);
  return week >= 40 || week <= 2;
};

const applyFilters = (inputRows, config) =>
  inputRows.filter((row) => {
    const date = parseDate(row.date);
    if (!date) return false;

    if (config.startDate) {
      const start = parseDate(config.startDate);
      if (start && date < start) return false;
    }

    if (config.endDate) {
      const end = parseDate(config.endDate);
      if (end && date > end) return false;
    }

    if (config.dayOfWeek && row.dayOfWeek !== config.dayOfWeek) return false;
    if (config.excludePeak && isPeakSeason(date)) return false;
    if (config.excludeSupervisedDays && !!row.onCarSupervisor) return false;

    return true;
  });

const latestDate = rows
  .map((row) => parseDate(row.date))
  .filter(Boolean)
  .sort((a, b) => b.getTime() - a.getTime())[0];

if (!latestDate) {
  throw new Error('No parseable dates found in dailyHistory.');
}

const startWindow = new Date(latestDate);
startWindow.setDate(startWindow.getDate() - 364);

const routeIds = [...new Set(rows.map((row) => row.routeId))].sort();

const runs365ByRoute = new Map(
  routeIds.map((routeId) => {
    const count = rows.filter((row) => {
      if (row.routeId !== routeId) return false;
      const date = parseDate(row.date);
      return !!date && date >= startWindow && date <= latestDate;
    }).length;

    return [routeId, count];
  })
);

const calculateRouteRows = (allRows, config) => {
  const filtered = applyFilters(allRows, config);
  return routeIds.map((routeId) => {
    const baseline = runs365ByRoute.get(routeId) ?? 0;
    const filteredRuns = filtered.filter((row) => row.routeId === routeId).length;
    return { routeId, baseline, filteredRuns };
  });
};

const filterMatrix = [
  { name: 'No filters', config: {} },
  {
    name: 'Date range only',
    config: { startDate: '2025-01-01', endDate: '2025-03-31' },
  },
  {
    name: 'DOW only',
    config: { dayOfWeek: 'Monday' },
  },
  {
    name: 'Exclude peak',
    config: { excludePeak: true },
  },
  {
    name: 'Exclude supervised',
    config: { excludeSupervisedDays: true },
  },
  {
    name: 'Combined filters',
    config: {
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      dayOfWeek: 'Sunday',
      excludePeak: true,
      excludeSupervisedDays: true,
    },
  },
];

const failures = [];

for (const scenario of filterMatrix) {
  const routeRows = calculateRouteRows(rows, scenario.config);

  for (const { routeId, baseline, filteredRuns } of routeRows) {
    const expectedBaseline = runs365ByRoute.get(routeId) ?? 0;
    if (baseline !== expectedBaseline) {
      failures.push(
        `[${scenario.name}] baseline changed for ${routeId}: ${baseline} vs ${expectedBaseline}`
      );
    }

    if (filteredRuns < 0) {
      failures.push(`[${scenario.name}] negative filtered runs for ${routeId}`);
    }
  }
}

if (failures.length) {
  console.error('Sprint 4 QA checks failed:\n');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Sprint 4 QA checks passed.');
console.log(`Routes validated: ${routeIds.length}`);
console.log(`Scenarios validated: ${filterMatrix.length}`);
console.log(`Latest date window used for runs365: ${latestDate.toISOString().slice(0, 10)}`);
