import { useState, useEffect, useRef, useCallback } from 'react';
import type { MatchResult, MatchEvent, MatchEventType } from '@/lib/matchEngine';
import type { Team, Player } from '@/lib/teams';
import type { TacticalSettings } from '@/lib/matchEngine';
import { teamLogos } from '@/lib/teamLogos';
import { TeamLogo } from "@/components/TeamLogo";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type Speed = 1 | 2 | 4;
type Phase = 'first_half' | 'halftime_pause' | 'second_half' | 'fulltime';

export interface SubstitutionRecord {
  outId: number;
  inId: number;
  minute: number;
}

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  result: MatchResult;
  playerStates?: Record<number, {fatigue:number;morale:number;happiness:number;injuryWeeks:number}>;
  currentTactics?: TacticalSettings;
  onTacticsChange?: (t: TacticalSettings) => void;
  onClose: (subs: SubstitutionRecord[]) => void;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const BALL_X = [9, 26, 50, 74, 91];

function getBallZone(event: MatchEvent | null): number {
  if (!event || event.team === 'neutral') return 2;
  const atk = event.team === 'home';
  switch (event.type) {
    case 'goal': case 'shot_saved': case 'shot_missed': case 'corner':
      return atk ? 4 : 0;
    case 'danger': case 'offside':
      return atk ? 3 : 1;
    default: return 2;
  }
}

function eventIcon(type: MatchEventType): string {
  const m: Record<MatchEventType, string> = {
    kickoff:'🏟️', halftime:'⏱️', fulltime:'🏁', goal:'⚽',
    shot_saved:'🧤', shot_missed:'🎯', foul:'🤚', yellow_card:'🟨',
    red_card:'🟥', corner:'🚩', danger:'⚡', offside:'🚩',
  };
  return m[type] ?? '•';
}

function isStructural(type: MatchEventType) {
  return ['kickoff','halftime','fulltime'].includes(type);
}

// ─── PAINEL DE TÁTICAS IN-MATCH ───────────────────────────────────────────────

function InMatchTactics({ tactics, onChange }: { tactics: TacticalSettings; onChange: (t: TacticalSettings) => void }) {
  const btn = (active: boolean) =>
    `px-2.5 py-1.5 rounded text-xs font-bold ${active ? 'bg-white text-black' : 'bg-gray-700 text-gray-300'}`;

  function row(label: string, node: React.ReactNode) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
        <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
        <div className="flex gap-1 flex-wrap justify-end">{node}</div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl mx-3 mb-2">
      <p className="text-xs font-bold text-green-400 mb-2">⚙️ Táticas em jogo</p>
      {row("Mentalidade", <>
        {(["defensive","balanced","attacking"] as const).map(v => (
          <button key={v} className={btn(tactics.mentality===v)} onClick={()=>onChange({...tactics,mentality:v})}>
            {v==="defensive"?"Def":v==="balanced"?"Equil":"Ataq"}
          </button>
        ))}
      </>)}
      {row("Pressão", <>
        {(["low","medium","high"] as const).map(v => (
          <button key={v} className={btn(tactics.pressingIntensity===v)} onClick={()=>onChange({...tactics,pressingIntensity:v})}>
            {v==="low"?"Baixa":v==="medium"?"Média":"Alta"}
          </button>
        ))}
      </>)}
      {row("Linha def.", <>
        {(["deep","medium","high"] as const).map(v => (
          <button key={v} className={btn(tactics.defensiveLine===v)} onClick={()=>onChange({...tactics,defensiveLine:v})}>
            {v==="deep"?"Baixa":v==="medium"?"Média":"Alta"}
          </button>
        ))}
      </>)}
      {row("Estilo", <>
        {(["direct","balanced","possession"] as const).map(v => (
          <button key={v} className={btn(tactics.playStyle===v)} onClick={()=>onChange({...tactics,playStyle:v})}>
            {v==="direct"?"Direto":v==="balanced"?"Equil":"Posse"}
          </button>
        ))}
      </>)}
      {row("Contra-ataque", <>
        <button className={btn(tactics.counterAttack)} onClick={()=>onChange({...tactics,counterAttack:true})}>Sim</button>
        <button className={btn(!tactics.counterAttack)} onClick={()=>onChange({...tactics,counterAttack:false})}>Não</button>
      </>)}
    </div>
  );
}

// ─── PAINEL DE SUBSTITUIÇÕES ──────────────────────────────────────────────────

function SubPanel({
  starters, bench, currentStarters, substitutions, subInIds, subOutIds,
  selectingSubFor, setSelectingSubFor, makeSub, playerStates,
}: {
  starters: Player[]; bench: Player[];
  currentStarters: Player[];
  substitutions: SubstitutionRecord[];
  subInIds: number[]; subOutIds: number[];
  selectingSubFor: Player | null;
  setSelectingSubFor: (p: Player | null) => void;
  makeSub: (p: Player) => void;
  playerStates?: Record<number, any>;
}) {
  const fatBar = (id: number) => {
    const fat = playerStates?.[id]?.fatigue ?? 100;
    return (
      <div className="flex items-center gap-1">
        <div className="w-10 h-1.5 rounded-full bg-gray-600">
          <div className={`h-1.5 rounded-full ${fat>=70?"bg-green-500":fat>=40?"bg-yellow-500":"bg-red-500"}`} style={{width:`${fat}%`}}/>
        </div>
        <span className="text-xs text-gray-400">{fat}%</span>
      </div>
    );
  };

  return (
    <div className="px-3 mb-2">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
        <p className="text-xs font-bold text-gray-300 mb-2">⇄ Substituições ({substitutions.length}/5)</p>

        {/* Subs realizadas */}
        {substitutions.length > 0 && (
          <div className="mb-2 space-y-0.5">
            {substitutions.map((s,i) => {
              const out = starters.find(p=>p.id===s.outId);
              const inp = bench.find(p=>p.id===s.inId);
              return (
                <p key={i} className="text-xs text-gray-400">
                  ⬆️ {inp?.name} ⬇️ {out?.name} ({s.minute}')
                </p>
              );
            })}
          </div>
        )}

        {selectingSubFor ? (
          <>
            <p className="text-xs text-gray-400 mb-2">Entra por <span className="text-white font-bold">{selectingSubFor.name}</span>:</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {bench.filter(p => !subInIds.includes(p.id) && !subOutIds.includes(p.id)).map(p => (
                <button key={p.id} onClick={() => makeSub(p)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-700 active:bg-gray-600">
                  <span className="text-xs font-semibold text-white"><span className="text-gray-400 font-mono mr-1">{p.jerseyNumber}</span> {p.name}</span>
                  <div className="flex items-center gap-2">
                    {fatBar(p.id)}
                    <span className="text-xs text-gray-400">{p.position} {p.overall}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setSelectingSubFor(null)} className="mt-2 text-xs text-gray-500">Cancelar</button>
          </>
        ) : (
          <>
            {substitutions.length < 5 && (
              <>
                <p className="text-xs text-gray-400 mb-2">Quem sai:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {currentStarters.map((p, i) => {
                    const original = starters[i];
                    const wasSub = subInIds.includes(p.id);
                    const available = !wasSub;
                    return (
                      <button key={p.id}
                        onClick={() => { if (available) setSelectingSubFor(original); }}
                        disabled={!available}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${available ? 'bg-gray-700 active:bg-gray-600' : 'bg-gray-800 opacity-40'}`}>
                        <span className="text-xs font-semibold text-white"><span className="text-gray-400 font-mono mr-1">{p.jerseyNumber}</span> {p.name}{wasSub ? ' ★' : ''}</span>
                        <div className="flex items-center gap-2">
                          {fatBar(p.id)}
                          <span className="text-xs text-gray-400">{p.position}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function MatchScreen({ homeTeam, awayTeam, result, playerStates, currentTactics, onTacticsChange, onClose }: Props) {
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const [phase, setPhase] = useState<Phase>('first_half');
  const [paused, setPaused] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);
  const [displayedEvents, setDisplayedEvents] = useState<MatchEvent[]>([]);
  const [goalFlash, setGoalFlash] = useState<'home'|'away'|null>(null);
  const [showStats, setShowStats] = useState(false);
  const [activePanel, setActivePanel] = useState<'subs'|'tactics'|null>(null);
  const [substitutions, setSubstitutions] = useState<SubstitutionRecord[]>([]);
  const [selectingSubFor, setSelectingSubFor] = useState<Player|null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const [localTactics, setLocalTactics] = useState<TacticalSettings>(currentTactics ?? {
    mentality:'balanced', defensiveLine:'medium', pressingIntensity:'medium',
    playStyle:'balanced', counterAttack:false, offensiveWidth:'balanced',
    fullbackSupport:true, compactDefense:true,
  });

  function handleTacticsChange(t: TacticalSettings) {
    setLocalTactics(t);
    onTacticsChange?.(t);
  }

  const starters = [...homeTeam.players].sort((a,b) => b.overall - a.overall).slice(0, 11);
  const bench    = homeTeam.players.filter(p => !starters.find(s => s.id === p.id));
  const subOutIds = substitutions.map(s => s.outId);
  const subInIds  = substitutions.map(s => s.inId);

  const currentStarters = starters.map(p => {
    const sub = substitutions.find(s => s.outId === p.id);
    if (sub) return homeTeam.players.find(pl => pl.id === sub.inId) ?? p;
    return p;
  });

  // ── TICK ──────────────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    setMinute(prev => Math.min(prev + speed, 90));
  }, [speed]);

  useEffect(() => {
    const shouldPause = paused || phase === 'halftime_pause' || phase === 'fulltime';
    if (shouldPause) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 180);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tick, phase, paused]);

  // ── PROCESSAR EVENTOS ────────────────────────────────────────────────────
  useEffect(() => {
    let idx = eventIndex;
    const toAdd: MatchEvent[] = [];
    while (idx < result.events.length && result.events[idx].minute <= minute) {
      toAdd.push(result.events[idx]);
      idx++;
    }
    if (!toAdd.length) return;
    setDisplayedEvents(prev => [...prev, ...toAdd]);
    setEventIndex(idx);
    const goal = toAdd.find(e => e.isGoal);
    if (goal) {
      setGoalFlash(goal.team as 'home'|'away');
      setTimeout(() => setGoalFlash(null), 1400);
    }
    if (toAdd.some(e => e.type === 'halftime') && phase === 'first_half') {
      setPhase('halftime_pause');
      setPaused(false);
    }
    if (toAdd.some(e => e.type === 'fulltime')) {
      setPhase('fulltime');
      setPaused(false);
    }
  }, [minute, result.events, eventIndex, phase]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [displayedEvents]);

  function makeSub(inPlayer: Player) {
    if (!selectingSubFor || substitutions.length >= 5) return;
    if (subInIds.includes(inPlayer.id)) return;
    setSubstitutions(prev => [...prev, { outId: selectingSubFor.id, inId: inPlayer.id, minute: Math.min(minute, 90) }]);
    setSelectingSubFor(null);
  }

  function startSecondHalf() {
    setPhase('second_half');
    setActivePanel(null);
    setSelectingSubFor(null);
  }

  const lastEvent = displayedEvents[displayedEvents.length - 1];
  const homeGoals = lastEvent?.homeScore ?? 0;
  const awayGoals = lastEvent?.awayScore ?? 0;
  const lastAction = [...displayedEvents].reverse().find(e => e.team !== 'neutral');
  const ballX = BALL_X[getBallZone(lastAction ?? null)];
  const headerBg = goalFlash==='home' ? 'bg-blue-800' : goalFlash==='away' ? 'bg-red-800' : 'bg-gray-900';

  const minuteDisplay = phase === 'fulltime' ? 'FIM'
    : phase === 'halftime_pause' ? 'INT'
    : paused ? `${Math.min(minute,90)}' ⏸`
    : `${Math.min(minute,90)}'`;

  function logoFallback(id: number) {
    return <TeamLogo teamId={id} />;
  }

  const isPlaying = phase !== 'fulltime' && phase !== 'halftime_pause';

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col text-white select-none">

      {/* ── PLACAR ────────────────────────────────────────────────────── */}
      <div className={`px-4 py-3 flex items-center justify-between transition-colors duration-500 ${headerBg}`}>
        <div className="flex flex-col items-center w-20">
          <div className="w-10 h-10 mb-1">{logoFallback(homeTeam.id)}</div>
          <span className="text-xs font-bold text-center">{homeTeam.abbreviation}</span>
        </div>
        <div className="text-center flex-1">
          <div className={`text-5xl font-black tracking-widest transition-all ${goalFlash?'scale-110 text-yellow-300':''}`}>
            {homeGoals} – {awayGoals}
          </div>
          <div className="text-sm text-gray-400 mt-1 font-mono">{minuteDisplay}</div>
          {substitutions.length > 0 && (
            <div className="text-xs text-green-400">{substitutions.length} sub(s)</div>
          )}
        </div>
        <div className="flex flex-col items-center w-20">
          <div className="w-10 h-10 mb-1">{logoFallback(awayTeam.id)}</div>
          <span className="text-xs font-bold text-center">{awayTeam.abbreviation}</span>
        </div>
      </div>

      {/* ── CONTROLES ─────────────────────────────────────────────────── */}
      {isPlaying && (
        <div className="flex justify-center items-center gap-1.5 py-2 bg-gray-800 border-b border-gray-700 flex-wrap px-3">
          {/* Velocidade */}
          <span className="text-xs text-gray-500">Vel:</span>
          {([1,2,4] as Speed[]).map(s => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`px-3 py-1 rounded text-xs font-bold ${speed===s?'bg-white text-black':'bg-gray-700 text-gray-300'}`}>
              {s}×
            </button>
          ))}

          {/* Pausa */}
          <button onClick={() => setPaused(p => !p)}
            className={`px-3 py-1 rounded text-xs font-bold ml-1 ${paused?'bg-yellow-600 text-white':'bg-gray-700 text-gray-300'}`}>
            {paused ? '▶ Retomar' : '⏸ Pausar'}
          </button>

          {/* Subs */}
          <button onClick={() => setActivePanel(p => p==='subs' ? null : 'subs')}
            className={`px-3 py-1 rounded text-xs font-bold ${activePanel==='subs'?'bg-green-600 text-white':'bg-gray-700 text-gray-300'}`}>
            ⇄ {substitutions.length}/5
          </button>

          {/* Táticas */}
          <button onClick={() => setActivePanel(p => p==='tactics' ? null : 'tactics')}
            className={`px-3 py-1 rounded text-xs font-bold ${activePanel==='tactics'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>
            🎯 Táticas
          </button>
        </div>
      )}

      {/* ── PAINÉIS FLUTUANTES ─────────────────────────────────────────── */}
      {isPlaying && activePanel === 'subs' && (
        <SubPanel
          starters={starters} bench={bench} currentStarters={currentStarters}
          substitutions={substitutions} subInIds={subInIds} subOutIds={subOutIds}
          selectingSubFor={selectingSubFor} setSelectingSubFor={setSelectingSubFor}
          makeSub={makeSub} playerStates={playerStates}/>
      )}
      {isPlaying && activePanel === 'tactics' && (
        <InMatchTactics tactics={localTactics} onChange={handleTacticsChange}/>
      )}

      {/* ── CAMPO 2D ──────────────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1">
        <div className="relative w-full h-20 rounded-xl overflow-hidden"
          style={{background:'linear-gradient(180deg,#2d6a2d 0%,#3a8a3a 50%,#2d6a2d 100%)'}}>
          <div className="absolute inset-y-0 left-1/2 w-px bg-white opacity-30"/>
          <div className="absolute top-1/2 left-1/2 w-14 h-14 border border-white opacity-15 rounded-full -translate-x-1/2 -translate-y-1/2"/>
          <div className="absolute top-1/4 left-0 h-1/2 w-7 border-r border-t border-b border-white opacity-20"/>
          <div className="absolute top-1/4 right-0 h-1/2 w-7 border-l border-t border-b border-white opacity-20"/>
          {goalFlash && <div className="absolute inset-0 bg-yellow-400 opacity-30 animate-pulse"/>}
          <div className="absolute w-4 h-4 bg-white rounded-full transform -translate-y-1/2 transition-all duration-700 z-10"
            style={{left:`${ballX}%`,top:'50%',marginLeft:'-8px',boxShadow:'0 0 10px 3px rgba(255,255,255,0.75)'}}/>
          <div className="absolute bottom-1 left-2 text-xs text-white opacity-60 font-bold">{homeTeam.abbreviation}</div>
          <div className="absolute bottom-1 right-2 text-xs text-white opacity-60 font-bold">{awayTeam.abbreviation}</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
            <div className="h-1 bg-green-400 transition-all duration-200" style={{width:`${(minute/90)*100}%`}}/>
          </div>
        </div>
      </div>

      {/* ── POSSE ─────────────────────────────────────────────────────── */}
      <div className="px-3 pb-1">
        <div className="flex items-center gap-1 text-xs">
          <span className="text-blue-400 font-bold w-9 text-right">{result.stats.possession[0]}%</span>
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-500" style={{width:`${result.stats.possession[0]}%`}}/>
            <div className="h-full bg-red-500 flex-1"/>
          </div>
          <span className="text-red-400 font-bold w-9">{result.stats.possession[1]}%</span>
        </div>
      </div>

      {/* ── PAUSA DO INTERVALO ────────────────────────────────────────── */}
      {phase === 'halftime_pause' && (
        <div className="mx-3 mb-2 rounded-xl bg-gray-800 border border-gray-700 p-3">
          <p className="text-sm font-bold text-yellow-300 mb-3">
            ⏱️ Intervalo — {homeTeam.abbreviation} {homeGoals}–{awayGoals} {awayTeam.abbreviation}
          </p>

          {/* Tabs no intervalo */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setActivePanel(p => p==='subs'?null:'subs')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${activePanel==='subs'?'bg-green-600 text-white':'bg-gray-700 text-gray-300'}`}>
              ⇄ Subs ({substitutions.length}/5)
            </button>
            <button onClick={() => setActivePanel(p => p==='tactics'?null:'tactics')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${activePanel==='tactics'?'bg-blue-600 text-white':'bg-gray-700 text-gray-300'}`}>
              🎯 Táticas
            </button>
          </div>

          {activePanel === 'subs' && (
            <SubPanel
              starters={starters} bench={bench} currentStarters={currentStarters}
              substitutions={substitutions} subInIds={subInIds} subOutIds={subOutIds}
              selectingSubFor={selectingSubFor} setSelectingSubFor={setSelectingSubFor}
              makeSub={makeSub} playerStates={playerStates}/>
          )}
          {activePanel === 'tactics' && (
            <InMatchTactics tactics={localTactics} onChange={handleTacticsChange}/>
          )}

          <button onClick={startSecondHalf}
            className="w-full py-3 bg-green-600 active:bg-green-700 text-white font-bold rounded-lg text-sm mt-2">
            ▶ Iniciar 2º Tempo
          </button>
        </div>
      )}

      {/* ── LOG DE COMENTÁRIOS ─────────────────────────────────────────── */}
      <div ref={logRef} className="flex-1 px-3 overflow-y-auto space-y-1 py-1">
        {displayedEvents.map((event, idx) => (
          <div key={idx} className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
            event.isGoal ? 'bg-yellow-900/40 border border-yellow-600/40'
            : isStructural(event.type) ? 'bg-gray-800/40 border border-gray-700/40'
            : ''}`}>
            <span className="text-gray-600 w-7 flex-shrink-0 font-mono text-right pt-0.5">
              {event.minute===0?"0'": `${event.minute}'`}
            </span>
            <span className="flex-shrink-0 pt-0.5">{eventIcon(event.type)}</span>
            <span className={`leading-relaxed ${
              event.isGoal ? 'text-yellow-200 font-bold'
              : isStructural(event.type) ? 'text-gray-400 italic'
              : event.team==='home' ? 'text-blue-200'
              : event.team==='away' ? 'text-red-200'
              : 'text-gray-300'
            }`}>{event.description}</span>
          </div>
        ))}
      </div>

      {/* ── FIM DE JOGO ───────────────────────────────────────────────── */}
      {phase === 'fulltime' && (
        <div className="px-4 pb-4 pt-3 bg-gray-900 border-t border-gray-700">
          <button onClick={() => setShowStats(s => !s)} className="w-full text-xs text-gray-400 mb-2 text-center">
            {showStats ? '▲ Ocultar estatísticas' : '▼ Ver estatísticas'}
          </button>
          {showStats && (
            <div className="mb-3 space-y-1">
              {[
                ['Chutes', result.stats.shots[0], result.stats.shots[1]],
                ['No alvo', result.stats.shotsOnTarget[0], result.stats.shotsOnTarget[1]],
                ['Posse', `${result.stats.possession[0]}%`, `${result.stats.possession[1]}%`],
                ['Escanteios', result.stats.corners[0], result.stats.corners[1]],
                ['Faltas', result.stats.fouls[0], result.stats.fouls[1]],
                ['Amarelos', result.stats.yellowCards[0], result.stats.yellowCards[1]],
              ].map(([label,h,a]) => (
                <div key={String(label)} className="flex items-center text-xs">
                  <span className={`font-bold w-10 text-right ${Number(h)>Number(a)?'text-white':'text-gray-500'}`}>{h}</span>
                  <span className="text-gray-500 flex-1 text-center">{label}</span>
                  <span className={`font-bold w-10 ${Number(a)>Number(h)?'text-white':'text-gray-500'}`}>{a}</span>
                </div>
              ))}
              {substitutions.length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Substituições:</p>
                  {substitutions.map((s,i) => {
                    const out = homeTeam.players.find(p=>p.id===s.outId);
                    const inp = homeTeam.players.find(p=>p.id===s.inId);
                    return <p key={i} className="text-xs text-gray-400">⬆️ {inp?.name} ⬇️ {out?.name} ({s.minute}')</p>;
                  })}
                </div>
              )}
            </div>
          )}
          <button onClick={() => onClose(substitutions)}
            className="w-full py-3 bg-white text-black font-bold rounded-lg text-sm">
            Fechar partida
          </button>
        </div>
      )}
    </div>
  );
}
