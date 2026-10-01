import { ANCHOR_MAX, REEF_WIDTH, REPAIR_MIN, moveAmount } from '../game/engine';
import type { Action, ShipId, State, Storm } from '../game/types';
import { SHIP_NAMES } from '../game/types';

export const SHIP_COLORS = ['#e5484d', '#3e7bfa', '#30a46c', '#f5b301'] as const;

export function stormTitle(st: Storm): string {
  return { wind: '強風', swell: 'うねり', reef: '岩礁', whirl: '大渦', calm: '凪' }[st.kind];
}

export function stormText(st: Storm): string {
  switch (st.kind) {
    case 'wind':
      return '錨のない船が、ぜんぶ1マスもどる';
    case 'swell':
      return `${SHIP_NAMES[st.ships[0]]}と${SHIP_NAMES[st.ships[1]]}が2マスもどる`;
    case 'reef':
      return `${st.n}〜${st.n + REEF_WIDTH - 1}番のマスにいる船は船体-1`;
    case 'whirl':
      return '先頭の船（同じ位置なら全員）が3マスもどる';
    case 'calm':
      return 'なにも起きない';
  }
}

export function actionText(a: Action, s: State): string {
  switch (a.t) {
    case 'move':
      return `出目${s.dice[a.die]}を使って、${SHIP_NAMES[a.ship]}を${moveAmount(s.dice[a.die])}マス進める`;
    case 'anchor':
      return `出目${s.dice[a.die]}を使って、${SHIP_NAMES[a.ship]}に錨を打つ（今夜の嵐を無効に）`;
    case 'repair':
      return `出目${s.dice[a.die]}を使って、${SHIP_NAMES[a.ship]}を修理する（船体+1）`;
    case 'reroll':
      return `出目${s.dice[a.die]}を使って、別のサイコロを1つ振り直す`;
    case 'end':
      return 'もうやることがありません。ラウンドを終えて嵐を迎えましょう';
  }
}

export const RULE_HINTS = {
  anchor: `出目1〜${ANCHOR_MAX}`,
  repair: `出目${REPAIR_MIN}〜6`,
};

export function shipName(id: ShipId): string {
  return SHIP_NAMES[id];
}
