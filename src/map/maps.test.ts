import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const MAP_DIR = __dirname;
const EXPECTED = [
  'china',
  'china-en',
  'world',
  'usa',
  'germany',
  'france',
  'united-kingdom',
  'italy',
  'spain',
  'brazil',
  'india',
  'japan',
];
const ENGLISH_MAPS = EXPECTED.filter((n) => n !== 'china');
const TOTAL_BUDGET_BYTES = 5 * 1024 * 1024;
const PER_FILE_BUDGET_BYTES = 900 * 1024;

interface Feature {
  type: string;
  properties?: { name?: unknown; nameAscii?: unknown };
  geometry?: { type?: string };
}

interface FeatureCollection {
  type: string;
  features: Feature[];
}

function readMap(name: string): FeatureCollection {
  const raw = readFileSync(path.join(MAP_DIR, `${name}.json`), 'utf8');
  return JSON.parse(raw.replace(/^﻿/, ''));
}

const CJK_RE = /[一-鿿㐀-䶿぀-ヿ]/;
const ASCII_RE = /^[\x00-\x7F]+$/;

describe('bundled maps', () => {
  test('every documented map ships with the plugin', () => {
    const present = readdirSync(MAP_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
    for (const name of EXPECTED) {
      expect(present).toContain(name);
    }
  });

  test.each(EXPECTED)('%s parses as a non-empty feature collection', (name) => {
    const json = readMap(name);
    // The inherited china.json predates the FeatureCollection-type convention;
    // newer maps assert it explicitly. Either shape is accepted by ECharts.
    if (json.type !== undefined) {
      expect(json.type).toBe('FeatureCollection');
    }
    expect(Array.isArray(json.features)).toBe(true);
    expect(json.features.length).toBeGreaterThan(0);
    for (const feature of json.features) {
      expect(typeof feature.properties?.name).toBe('string');
      expect((feature.properties!.name as string).length).toBeGreaterThan(0);
    }
  });

  test.each(ENGLISH_MAPS)(
    '%s features have no CJK characters in the primary name',
    (name) => {
      const json = readMap(name);
      for (const feature of json.features) {
        const label = feature.properties!.name as string;
        expect(label).not.toMatch(CJK_RE);
      }
    }
  );

  test.each(ENGLISH_MAPS)(
    '%s features all have a fully ASCII nameAscii companion',
    (name) => {
      const json = readMap(name);
      for (const feature of json.features) {
        const ascii = feature.properties!.nameAscii as string;
        expect(typeof ascii).toBe('string');
        expect(ascii).toMatch(ASCII_RE);
      }
    }
  );

  test('china.json still uses Chinese labels (backwards compat)', () => {
    const json = readMap('china');
    const hasChinese = json.features.some((f) =>
      /[一-鿿]/.test((f.properties?.name as string) ?? '')
    );
    expect(hasChinese).toBe(true);
  });

  test('china-en.json uses English labels (the readable sibling)', () => {
    const json = readMap('china-en');
    for (const feature of json.features) {
      expect(feature.properties!.name as string).toMatch(ASCII_RE);
    }
    const names = json.features.map((f) => f.properties?.name as string);
    expect(names).toContain('Beijing');
    expect(names).toContain('Heilongjiang');
  });

  test('each map file stays within the per-file size budget', () => {
    const oversized: Array<{ name: string; bytes: number }> = [];
    for (const name of EXPECTED) {
      const bytes = statSync(path.join(MAP_DIR, `${name}.json`)).size;
      if (bytes > PER_FILE_BUDGET_BYTES) {
        oversized.push({ name, bytes });
      }
    }
    expect(oversized).toEqual([]);
  });

  test('total bundled-map size stays within the directory budget', () => {
    const total = EXPECTED.reduce(
      (sum, name) => sum + statSync(path.join(MAP_DIR, `${name}.json`)).size,
      0
    );
    expect(total).toBeLessThan(TOTAL_BUDGET_BYTES);
  });
});
