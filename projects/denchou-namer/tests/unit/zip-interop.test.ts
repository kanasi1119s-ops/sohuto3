import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createZip } from '../../src/core/zip';

const py = spawnSync('python3', ['--version']);
it.skipIf(py.status !== 0)('Python zipfile が全エントリを検証・読込できる(日本語名・空ファイル・バイナリ)', () => {
  const bin = Uint8Array.from({ length: 70000 }, (_, i) => (i * 7) & 255);
  const z = createZip([
    { name: '20261015_株式会社サンプル_100円.pdf', data: bin },
    { name: '索引台帳.csv', data: new TextEncoder().encode('﻿a,b\r\n') },
    { name: 'empty.txt', data: new Uint8Array(0) },
  ]);
  const dir = mkdtempSync(join(tmpdir(), 'zipt-'));
  try {
    const f = join(dir, 't.zip');
    writeFileSync(f, z);
    const script = 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print("|".join(z.namelist()));print(len(z.read(z.namelist()[0])))';
    const r = spawnSync('python3', ['-I', '-c', script, f], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    const [names, size] = r.stdout.trim().split('\n');
    expect(names).toBe('20261015_株式会社サンプル_100円.pdf|索引台帳.csv|empty.txt');
    expect(size).toBe('70000');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
