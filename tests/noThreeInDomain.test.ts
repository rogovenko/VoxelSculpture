import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

function collectTsFiles(dir: string): string[] {
  const result: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      result.push(...collectTsFiles(full));
    } else if (name.endsWith('.ts')) {
      result.push(full);
    }
  }
  return result;
}

test('domain layer does not import three', () => {
  const domainDir = fileURLToPath(new URL('../src/domain', import.meta.url));
  const files = collectTsFiles(domainDir);
  expect(files.length).toBeGreaterThan(0);

  const offenders: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (source.includes("from 'three'") || source.includes("require('three')")) {
      offenders.push(file);
    }
  }

  expect(offenders, `three imported in: ${offenders.join(', ')}`).toEqual([]);
});
