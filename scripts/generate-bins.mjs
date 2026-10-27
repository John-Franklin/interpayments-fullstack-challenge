// Generates surcharge-service/conf/bins.csv.gz, a made-up BIN range table keyed
// on the first 8 digits. Ranges overlap like real ones do (narrowest wins).
// It's seeded, so running it again gives the same file.
//
//   node scripts/generate-bins.mjs

import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "surcharge-service", "conf", "bins.csv.gz");

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261027);
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = (weighted) => {
  const r = rand();
  let acc = 0;
  for (const [value, weight] of weighted) {
    acc += weight;
    if (r < acc) return value;
  }
  return weighted[weighted.length - 1][0];
};

const cardTypes = [
  ["CREDIT", 0.55],
  ["DEBIT", 0.35],
  ["PREPAID", 0.1],
];
const countries = [
  ["US", 0.82],
  ["CA", 0.06],
  ["GB", 0.05],
  ["MX", 0.04],
  ["JP", 0.03],
];

// [network, first 8-digit value, last 8-digit value, average issuer range width]
const networkSpaces = [
  ["VISA", 40000000, 49999999, 60],
  ["MASTERCARD", 51000000, 55999999, 50],
  ["MASTERCARD", 22210000, 27209999, 400],
  ["AMEX", 34000000, 34999999, 400],
  ["AMEX", 37000000, 37999999, 400],
  ["DISCOVER", 60110000, 60119999, 40],
  ["DISCOVER", 64400000, 65999999, 120],
];

// Test cards from the README. Clear the generated ranges around them so they
// resolve exactly as listed.
const curated = [
  // Broad Visa credit range with a narrower debit product carved out of it.
  [40000000, 40009999, "VISA", "CREDIT", "US"],
  [40000500, 40000599, "VISA", "DEBIT", "US"],
  [41111100, 41111199, "VISA", "CREDIT", "US"],
  [48471800, 48471899, "VISA", "PREPAID", "US"],
  [55555500, 55555599, "MASTERCARD", "CREDIT", "US"],
  [52008200, 52008299, "MASTERCARD", "DEBIT", "US"],
  [37828200, 37828299, "AMEX", "CREDIT", "US"],
  [60111100, 60111199, "DISCOVER", "CREDIT", "US"],
];
// Not in the table on purpose (the "not in the BIN table" test card).
const reservedGaps = [[63900000, 63909999]];

const overlaps = (aLo, aHi, bLo, bHi) => aLo <= bHi && bLo <= aHi;
const blocked = [...curated.map(([lo, hi]) => [lo, hi]), ...reservedGaps];
const isBlocked = (lo, hi) => blocked.some(([bLo, bHi]) => overlaps(lo, hi, bLo, bHi));

const rows = [];
for (const [network, first, last, avgWidth] of networkSpaces) {
  let cursor = first;
  while (cursor <= last) {
    // Leave some of the space unassigned.
    if (rand() < 0.15) {
      cursor += between(1, avgWidth * 3);
      continue;
    }
    const width = between(Math.ceil(avgWidth / 4), avgWidth * 2);
    const lo = cursor;
    const hi = Math.min(lo + width - 1, last);
    cursor = hi + 1;
    if (isBlocked(lo, hi)) continue;

    const cardType = pick(cardTypes);
    const country = pick(countries);
    rows.push([lo, hi, network, cardType, country]);

    // Occasionally carve a narrower product range out of this one.
    if (hi - lo >= 20 && rand() < 0.04) {
      const subLo = between(lo, hi - 10);
      const subHi = Math.min(subLo + between(5, 15), hi);
      const subType = pick(cardTypes.filter(([t]) => t !== cardType));
      rows.push([subLo, subHi, network, subType, country]);
    }
  }
}
rows.push(...curated);
rows.sort((a, b) => a[0] - b[0] || b[1] - a[1]);

const pad = (n) => String(n).padStart(8, "0");
const csv = [
  "range_start,range_end,network,card_type,country",
  ...rows.map(([lo, hi, network, cardType, country]) => `${pad(lo)},${pad(hi)},${network},${cardType},${country}`),
].join("\n");

writeFileSync(outFile, gzipSync(csv + "\n", { level: 9 }));
console.log(`Wrote ${rows.length.toLocaleString()} ranges to ${outFile}`);
