import { describe, expect, it } from 'vitest';
import { greedyAction } from './ai';
import { applyAction, legalActions, moveAmount, newGame, resolveStorms, validate } from './engine';
import { DIFFICULTIES } from './types';
import type { Config, State, Storm } from './types';

const cfg: Config = DIFFICULTIES.normal.cfg;
const H = cfg.harborPos;

function withStorms(s: State, storms: Storm[]): State {
  return { ...s, storms };
}
function withDice(s: State, dice: number[]): State {
  return { ...s, dice, used: dice.map(() => false) };
}

describe('セットアップ', () => {
  it('同じシードなら同じ初期状態', () => {
    expect(newGame(cfg, 42)).toEqual(newGame(cfg, 42));
  });
  it('サイコロは設定数・1〜6、嵐は1枚', () => {
    const s = newGame(cfg, 1);
    expect(s.dice).toHaveLength(cfg.dice);
    expect(s.dice.every((d) => d >= 1 && d <= 6)).toBe(true);
    expect(s.storms).toHaveLength(1);
    expect(s.ships.every((x) => x.pos === 0 && x.hull === cfg.hull)).toBe(true);
  });
});

describe('アクション', () => {
  it('進む量は出目÷3（切り上げ）', () => {
    expect([1, 2, 3, 4, 5, 6].map(moveAmount)).toEqual([1, 1, 1, 2, 2, 2]);
  });
  it('港を超えて進まない', () => {
    let s = withDice(newGame(cfg, 1), [6, 6, 6, 6, 6]);
    for (let i = 0; i < 5; i++) s = applyAction(s, { t: 'move', die: i, ship: 0 });
    expect(s.ships[0].pos).toBe(cfg.harborPos);
  });
  it('錨は出目1〜3、修理は出目5〜6のみ', () => {
    const s = withDice(newGame(cfg, 1), [4, 2, 6]);
    expect(validate(s, { t: 'anchor', die: 0, ship: 0 })).not.toBeNull();
    expect(validate(s, { t: 'anchor', die: 1, ship: 0 })).toBeNull();
    const damaged = { ...s, ships: s.ships.map((x, i) => (i === 0 ? { ...x, hull: 1 } : x)) };
    expect(validate(damaged, { t: 'repair', die: 1, ship: 0 })).not.toBeNull();
    expect(validate(damaged, { t: 'repair', die: 2, ship: 0 })).toBeNull();
    expect(validate(s, { t: 'repair', die: 2, ship: 0 })).not.toBeNull(); // 満タン
  });
  it('使用済みサイコロは再利用できない', () => {
    let s = withDice(newGame(cfg, 1), [3, 3]);
    s = applyAction(s, { t: 'move', die: 0, ship: 0 });
    expect(() => applyAction(s, { t: 'move', die: 0, ship: 1 })).toThrow();
  });
  it('振り直しは1ラウンド1回、自分自身は対象にできない', () => {
    let s = withDice(newGame(cfg, 1), [1, 2, 3]);
    expect(validate(s, { t: 'reroll', die: 0, target: 0 })).not.toBeNull();
    s = applyAction(s, { t: 'reroll', die: 0, target: 1 });
    expect(s.used[0]).toBe(true);
    expect(validate(s, { t: 'reroll', die: 2, target: 1 })).not.toBeNull();
  });
  it('入力の状態を書き換えない（不変）', () => {
    const s = newGame(cfg, 5);
    const snap = JSON.stringify(s);
    applyAction(s, { t: 'move', die: 0, ship: 0 });
    expect(JSON.stringify(s)).toBe(snap);
  });
});

describe('嵐', () => {
  const base = withDice(newGame(cfg, 1), [3, 3, 3, 3, 3]);
  const at = (s: State, pos: number[]): State => ({ ...s, ships: s.ships.map((x, i) => ({ ...x, pos: pos[i] })) });

  it('強風: 全員1マス戻る（0未満にならない）', () => {
    const s = resolveStorms(withStorms(at(base, [0, 3, 5, 7]), [{ kind: 'wind' }]));
    expect(s.ships.map((x) => x.pos)).toEqual([0, 2, 4, 6]);
  });
  it('うねり: 指定の2隻だけ2マス戻る', () => {
    const s = resolveStorms(withStorms(at(base, [4, 4, 4, 4]), [{ kind: 'swell', ships: [1, 3] }]));
    expect(s.ships.map((x) => x.pos)).toEqual([4, 2, 4, 2]);
  });
  it('岩礁: n〜n+2のマスの船だけ船体-1、船体0で沈没', () => {
    let s = resolveStorms(withStorms(at(base, [3, 5, 6, 2]), [{ kind: 'reef', n: 3 }]));
    expect(s.ships.map((x) => x.hull)).toEqual([1, 1, 2, 2]);
    s = resolveStorms(withStorms(s, [{ kind: 'reef', n: 3 }]));
    expect(s.ships.map((x) => x.wrecked)).toEqual([true, true, false, false]);
  });
  it('大渦: 先頭の船（同率は全員）が3マス戻る', () => {
    const s = resolveStorms(withStorms(at(base, [5, 5, 2, 0]), [{ kind: 'whirl' }]));
    expect(s.ships.map((x) => x.pos)).toEqual([2, 2, 2, 0]);
  });
  it('錨を打った船・港の船は嵐を受けない', () => {
    const s0 = at(base, [H, 4, 4, 4]);
    const s1 = { ...s0, ships: s0.ships.map((x, i) => (i === 1 ? { ...x, anchored: true } : x)) };
    const s = resolveStorms(withStorms(s1, [{ kind: 'wind' }]));
    expect(s.ships.map((x) => x.pos)).toEqual([H, 4, 3, 3]);
  });
});

describe('終了条件', () => {
  it('3隻が港に着くと勝ち', () => {
    let s = withDice(newGame(cfg, 1), [6, 6, 6, 6, 6]);
    s = { ...s, ships: s.ships.map((x, i) => (i < 2 ? { ...x, pos: H } : { ...x, pos: H - 2 })) };
    s = applyAction(s, { t: 'move', die: 0, ship: 2 });
    expect(s.phase).toBe('won');
  });
  it('2隻沈むと負け', () => {
    let s = withStorms(newGame(cfg, 1), [{ kind: 'reef', n: 3 }]);
    s = { ...s, ships: s.ships.map((x, i) => (i < 2 ? { ...x, pos: 3, hull: 1 } : x)) };
    s = applyAction(s, { t: 'end' });
    expect(s.phase).toBe('lost');
    expect(s.loseReason).toBe('wrecks');
  });
  it('最終ラウンド終了で目標未達なら負け（夜明け）', () => {
    let s = withStorms(newGame(cfg, 1), [{ kind: 'calm' }]);
    s = { ...s, round: cfg.rounds };
    s = applyAction(s, { t: 'end' });
    expect(s.phase).toBe('lost');
    expect(s.loseReason).toBe('dawn');
  });
  it('終了後の操作は拒否される', () => {
    let s = newGame(cfg, 1);
    s = { ...s, phase: 'lost' };
    expect(() => applyAction(s, { t: 'end' })).toThrow();
  });
});

describe('山札', () => {
  it('どのシードでも必ず有限ラウンドで終わる（山札切れでも継続）', () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = newGame(cfg, seed);
      let guard = 0;
      while (s.phase === 'act' && guard++ < 1000) {
        const a = greedyAction(s);
        s = applyAction(s, a ?? { t: 'end' });
      }
      expect(s.phase).not.toBe('act');
      expect(legalActions(s)).toHaveLength(0);
    }
  });
});
