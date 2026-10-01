import { randInt, shuffle } from './rng';
import type { Action, Config, ShipId, State, Storm } from './types';
import { SHIP_IDS } from './types';

export const ANCHOR_MAX = 3; // 錨に使えるのは出目1〜3
export const REPAIR_MIN = 5; // 修理に使えるのは出目5〜6
export const REEF_WIDTH = 3; // 岩礁カードは n〜n+2 番の3マスに効く

export function moveAmount(die: number): number {
  return Math.ceil(die / 3);
}

export function isActive(s: State, id: ShipId): boolean {
  const ship = s.ships[id];
  return !ship.wrecked && ship.pos < s.cfg.harborPos;
}

export function harbored(s: State): number {
  return s.ships.filter((x) => !x.wrecked && x.pos >= s.cfg.harborPos).length;
}

export function wreckCount(s: State): number {
  return s.ships.filter((x) => x.wrecked).length;
}

/** 嵐の山札を作る（14枚：強風2・大渦2・凪1・岩礁6・うねり3）。岩礁の番号は2〜港の手前からランダム。 */
function buildDeck(cfg: Config, rng: number): [Storm[], number] {
  let r = rng;
  const cards: Storm[] = [];
  for (let i = 0; i < 2; i++) cards.push({ kind: 'wind' });
  for (let i = 0; i < 2; i++) cards.push({ kind: 'whirl' });
  cards.push({ kind: 'calm' });
  for (let i = 0; i < 6; i++) {
    let n: number;
    [n, r] = randInt(r, cfg.harborPos - 3); // 0..harborPos-4
    cards.push({ kind: 'reef', n: n + 1 }); // 1..harborPos-3
  }
  for (let i = 0; i < 3; i++) {
    let a: number;
    let b: number;
    [a, r] = randInt(r, 4);
    [b, r] = randInt(r, 3);
    if (b >= a) b += 1;
    cards.push({ kind: 'swell', ships: [a as ShipId, b as ShipId] });
  }
  return shuffle(cards, r);
}

export function stormsPerRound(round: number): number {
  return round <= 2 ? 1 : round <= 5 ? 2 : 3;
}

function startRound(s: State, round: number): State {
  let rng = s.rng;
  let deck = s.deck;
  const storms: Storm[] = [];
  for (let i = 0; i < stormsPerRound(round); i++) {
    if (deck.length === 0) [deck, rng] = buildDeck(s.cfg, rng);
    storms.push(deck[0]);
    deck = deck.slice(1);
  }
  const dice: number[] = [];
  for (let i = 0; i < s.cfg.dice; i++) {
    let v: number;
    [v, rng] = randInt(rng, 6);
    dice.push(v + 1);
  }
  return {
    ...s,
    round,
    dice,
    used: dice.map(() => false),
    rerollUsed: false,
    storms,
    deck,
    rng,
    ships: s.ships.map((x) => ({ ...x, anchored: false })),
  };
}

export function newGame(cfg: Config, seed: number): State {
  const [deck, rng] = buildDeck(cfg, seed >>> 0);
  const base: State = {
    cfg,
    round: 0,
    ships: SHIP_IDS.map(() => ({ pos: 0, hull: cfg.hull, wrecked: false, anchored: false })),
    dice: [],
    used: [],
    rerollUsed: false,
    storms: [],
    deck,
    rng,
    phase: 'act',
  };
  return startRound(base, 1);
}

/** 嵐1枚を適用（錨を打った船・港の船・沈んだ船は無視）。 */
function applyStorm(s: State, storm: Storm): State {
  const ships = s.ships.map((x) => ({ ...x }));
  const hit = (id: ShipId) => isActive({ ...s, ships }, id) && !ships[id].anchored;
  const back = (id: ShipId, n: number) => {
    ships[id].pos = Math.max(0, ships[id].pos - n);
  };
  const damage = (id: ShipId) => {
    ships[id].hull -= 1;
    if (ships[id].hull <= 0) ships[id].wrecked = true;
  };
  switch (storm.kind) {
    case 'wind':
      for (const id of SHIP_IDS) if (hit(id)) back(id, 1);
      break;
    case 'swell':
      for (const id of storm.ships) if (hit(id)) back(id, 2);
      break;
    case 'reef':
      for (const id of SHIP_IDS) if (hit(id) && ships[id].pos >= storm.n && ships[id].pos < storm.n + REEF_WIDTH) damage(id);
      break;
    case 'whirl': {
      const act = SHIP_IDS.filter((id) => isActive({ ...s, ships }, id));
      const lead = Math.max(...act.map((id) => ships[id].pos), -1);
      if (lead > 0) for (const id of act) if (ships[id].pos === lead && hit(id)) back(id, 3);
      break;
    }
    case 'calm':
      break;
  }
  return { ...s, ships };
}

/** 今ラウンドの嵐をすべて適用した結果（AIの先読みにも使う）。 */
export function resolveStorms(s: State): State {
  let cur = s;
  for (const st of s.storms) cur = applyStorm(cur, st);
  return cur;
}

function checkWin(s: State): State {
  if (s.phase === 'act' && harbored(s) >= s.cfg.winShips) return { ...s, phase: 'won' };
  return s;
}

export function validate(s: State, a: Action): string | null {
  if (s.phase !== 'act') return 'ゲームは終了しています';
  if (a.t === 'end') return null;
  if (a.die < 0 || a.die >= s.dice.length || s.used[a.die]) return 'そのサイコロは使えません';
  const v = s.dice[a.die];
  if (a.t === 'reroll') {
    if (s.rerollUsed) return '振り直しは1ラウンドに1回までです';
    if (a.target === a.die || a.target < 0 || a.target >= s.dice.length || s.used[a.target])
      return '振り直す相手のサイコロが正しくありません';
    return null;
  }
  const ship = s.ships[a.ship];
  if (!ship || ship.wrecked) return 'その船は沈んでいます';
  if (ship.pos >= s.cfg.harborPos) return 'その船はもう港に着いています';
  if (a.t === 'anchor') {
    if (v > ANCHOR_MAX) return `錨は出目1〜${ANCHOR_MAX}のときだけ使えます`;
    if (ship.anchored) return 'その船はすでに錨を打っています';
  }
  if (a.t === 'repair') {
    if (v < REPAIR_MIN) return `修理は出目${REPAIR_MIN}〜6のときだけ使えます`;
    if (ship.hull >= s.cfg.hull) return 'その船は修理の必要がありません';
  }
  return null;
}

export function legalActions(s: State): Action[] {
  const out: Action[] = [];
  if (s.phase !== 'act') return out;
  for (let d = 0; d < s.dice.length; d++) {
    if (s.used[d]) continue;
    for (const id of SHIP_IDS) {
      for (const t of ['move', 'anchor', 'repair'] as const) {
        const a: Action = { t, die: d, ship: id };
        if (validate(s, a) === null) out.push(a);
      }
    }
    for (let j = 0; j < s.dice.length; j++) {
      const a: Action = { t: 'reroll', die: d, target: j };
      if (validate(s, a) === null) out.push(a);
    }
  }
  return out;
}

/** アクション適用。不正な手は例外。 */
export function applyAction(s: State, a: Action): State {
  const err = validate(s, a);
  if (err) throw new Error(err);
  if (a.t === 'end') return endRound(s);
  const used = s.used.slice();
  used[a.die] = true;
  if (a.t === 'reroll') {
    const dice = s.dice.slice();
    used[a.die] = true;
    let v: number;
    let rng: number;
    [v, rng] = randInt(s.rng, 6);
    dice[a.target] = v + 1;
    return { ...s, dice, used, rerollUsed: true, rng };
  }
  const ships = s.ships.map((x) => ({ ...x }));
  const ship = ships[a.ship];
  if (a.t === 'move') ship.pos = Math.min(s.cfg.harborPos, ship.pos + moveAmount(s.dice[a.die]));
  else if (a.t === 'anchor') ship.anchored = true;
  else ship.hull += 1;
  return checkWin({ ...s, ships, used });
}

function endRound(s: State): State {
  const after = resolveStorms(s);
  if (wreckCount(after) >= s.cfg.loseWrecks) return { ...after, phase: 'lost', loseReason: 'wrecks' };
  const won = checkWin(after);
  if (won.phase === 'won') return won;
  if (s.round >= s.cfg.rounds) return { ...after, phase: 'lost', loseReason: 'dawn' };
  return startRound(after, s.round + 1);
}
