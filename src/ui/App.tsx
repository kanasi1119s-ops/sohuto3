import { useEffect, useState } from 'react';
import rulesSource from '../../docs/rules.md?raw';
import type { DifficultyId } from '../game/types';
import { DIFFICULTIES } from '../game/types';
import { Game } from './Game';
import { Markdown } from './Markdown';

function parseHash(): { page: 'title' | 'play' | 'rules'; diff: DifficultyId; seed?: number } {
  const [path, query = ''] = window.location.hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  const d = params.get('d') as DifficultyId;
  const diff: DifficultyId = d in DIFFICULTIES ? d : 'normal';
  const seed = params.get('seed') ? Number(params.get('seed')) : undefined;
  if (path === '/play') return { page: 'play', diff, seed };
  if (path === '/rules') return { page: 'rules', diff };
  return { page: 'title', diff };
}

export function App() {
  const [route, setRoute] = useState(parseHash);
  const [diff, setDiff] = useState<DifficultyId>(route.diff);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (h: string) => {
    window.location.hash = h;
    window.scrollTo(0, 0);
  };

  if (route.page === 'play')
    return <Game key={`${route.diff}-${route.seed ?? "r"}`} diff={route.diff} seed={route.seed} onTitle={() => go('/')} onRules={() => go('/rules')} />;

  if (route.page === 'rules')
    return (
      <main className="page">
        <button className="btn ghost" onClick={() => history.length > 1 ? history.back() : go('/')}>← もどる</button>
        <Markdown source={rulesSource} />
        <button className="btn ghost" onClick={() => go('/')}>タイトルへ</button>
      </main>
    );

  return (
    <main className="page title">
      <div className="lighthouse" aria-hidden="true">
        <svg viewBox="0 0 120 150" width="120" height="150">
          <polygon points="0,60 60,40 0,20" fill="rgba(255,236,150,.35)" transform="translate(60,0) scale(1,1)" />
          <polygon points="60,40 120,20 120,60" fill="rgba(255,236,150,.35)" />
          <rect x="48" y="30" width="24" height="16" fill="#ffe27a" />
          <polygon points="44,30 76,30 60,16" fill="#c0392b" />
          <polygon points="46,46 74,46 82,140 38,140" fill="#f4f1ea" />
          <rect x="42" y="70" width="36" height="10" fill="#c0392b" />
          <rect x="40" y="100" width="40" height="10" fill="#c0392b" />
        </svg>
      </div>
      <h1>灯台守のよあけ</h1>
      <p className="lead">嵐の夜、灯台のあかりで4そうの船を港へ。夜明けまでに3そうを届けよう。</p>
      <p className="meta">1〜4人（みんなで相談）／ 約15分 ／ 8さい以上 ／ 協力ゲーム</p>
      <div className="diffs" role="radiogroup" aria-label="むずかしさ">
        {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) => (
          <button key={id} role="radio" aria-checked={diff === id} className={`diff ${diff === id ? 'on' : ''}`} onClick={() => setDiff(id)}>
            <strong>{DIFFICULTIES[id].label}</strong>
            <small>{DIFFICULTIES[id].note}</small>
          </button>
        ))}
      </div>
      <button className="btn primary big" onClick={() => go(`/play?d=${diff}`)}>ゲームをはじめる</button>
      <button className="btn" onClick={() => go('/rules')}>遊び方（ルールブック）</button>
      <p className="fine">サンシャインソフトウェアの試作ゲームです。お金や景品をかける遊び方はできません。遊んだ内容はどこにも送信されません。</p>
    </main>
  );
}
