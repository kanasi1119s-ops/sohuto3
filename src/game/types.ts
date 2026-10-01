export type ShipId = 0 | 1 | 2 | 3;
export const SHIP_IDS: readonly ShipId[] = [0, 1, 2, 3];
export const SHIP_NAMES = ['あか丸', 'あお丸', 'みどり丸', 'きいろ丸'] as const;

export interface Ship {
  pos: number; // 0〜harborPos。harborPos が港（安全）
  hull: number; // 船体。0で沈没
  wrecked: boolean;
  anchored: boolean; // このラウンドだけ嵐を無効にする
}

export interface Config {
  harborPos: number; // 港のマス番号
  rounds: number; // 夜明けまでのラウンド数
  dice: number; // 毎ラウンド振るサイコロ数
  hull: number; // 船体の最大値
  winShips: number; // 港に着けば勝ちの隻数
  loseWrecks: number; // 沈むと負けの隻数
}

export type DifficultyId = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: Record<DifficultyId, { label: string; note: string; cfg: Config }> = {
  easy: {
    label: 'やさしい',
    note: '船体3・サイコロ6個',
    cfg: { harborPos: 10, rounds: 8, dice: 6, hull: 3, winShips: 3, loseWrecks: 2 },
  },
  normal: {
    label: 'ふつう',
    note: '船体2・サイコロ5個',
    cfg: { harborPos: 10, rounds: 8, dice: 5, hull: 2, winShips: 3, loseWrecks: 2 },
  },
  hard: {
    label: 'むずかしい',
    note: '船体2・サイコロ5個・4隻全員が目標',
    cfg: { harborPos: 10, rounds: 8, dice: 5, hull: 2, winShips: 4, loseWrecks: 2 },
  },
};

export type Storm =
  | { kind: 'wind' } // 全員1マス戻る
  | { kind: 'swell'; ships: [ShipId, ShipId] } // 指定の2隻が2マス戻る
  | { kind: 'reef'; n: number } // n番のマスにいる船は船体-1
  | { kind: 'whirl' } // 先頭の船が3マス戻る
  | { kind: 'calm' }; // なにも起きない

export type Phase = 'act' | 'won' | 'lost';

export interface State {
  cfg: Config;
  round: number; // 1始まり
  ships: Ship[];
  dice: number[]; // 今ラウンドの出目
  used: boolean[]; // 使用済みの目
  rerollUsed: boolean;
  storms: Storm[]; // 今ラウンドに来る嵐（公開情報）
  deck: Storm[];
  rng: number;
  phase: Phase;
  loseReason?: 'wrecks' | 'dawn';
}

export type Action =
  | { t: 'move'; die: number; ship: ShipId }
  | { t: 'anchor'; die: number; ship: ShipId }
  | { t: 'repair'; die: number; ship: ShipId }
  | { t: 'reroll'; die: number; target: number }
  | { t: 'end' };
