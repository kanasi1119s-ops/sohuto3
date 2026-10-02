export interface Card { id: number; suit: number; rank: number }
export interface Played { seat: number; card: Card; shift: number }
export type Phase = 'bid' | 'play' | 'roundEnd' | 'gameEnd';

export interface RoundResult {
  bids: number[];
  won: number[];
  delta: number[];
}

export interface GameState {
  rng: number;
  round: number; // 1始まり
  phase: Phase;
  hands: Card[][];
  trump: Card; // 「きょうの空」
  leader: number;
  turn: number;
  bids: (number | null)[];
  won: number[];
  trick: Played[];
  trickNo: number; // 完了済みトリック数
  cometLeft: boolean[];
  scores: number[];
  exact: number[];
  history: RoundResult[];
  lastTrick: { plays: Played[]; winner: number } | null;
}

export type Action =
  | { type: 'bid'; seat: number; value: number }
  | { type: 'play'; seat: number; cardId: number; shift: number }
  | { type: 'next' };
