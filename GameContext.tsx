import {
  createContext, useContext, useState, useCallback, ReactNode, useMemo,
} from "react";
import { Team, Player } from "@/lib/teams";
import { TacticalSettings, defaultTactics } from "@/lib/matchEngine";
import { StandingRow, ScheduledMatch, CupMatch, generateLeague, generateCup, updateStandings, sortStandings } from "@/lib/leagueSystem";
import {
  CalendarMatch, generateCalendar, getMatchOnDate, getNextMatch,
  getDaysUntilMatch, getDayName, formatDate, addDays, getSeasonStartDate,
  autoSuggestDay, isSameDay,
} from "@/lib/calendar";
import { teams as allTeams } from "@/lib/teams";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface PlayerState {
  fatigue: number;
  morale: number;
  happiness: number;
  injuryWeeks: number;
}

export interface MatchRecord {
  round: number;
  opponent: string;
  homeGoals: number;
  awayGoals: number;
  isHome: boolean;
  date: string;
}

export interface NewsItem {
  id: number;
  type: 'injury'|'result'|'transfer'|'contract'|'training'|'info';
  title: string;
  body: string;
  date: string;
}

export type TrainingFocus =
  'physical'|'attacking'|'defending'|'possession'|'setpieces'|
  'tactical'|'goalkeepers'|'recovery'|'cohesion'|'individual';

export interface ContractOffer {
  playerId: number;
  salary: number;
  years: number;
  status: 'pending'|'accepted'|'rejected';
}

interface GameContextType {
  // Time
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team) => void;
  playerStates: Record<number, PlayerState>;
  applyFatigueDrops: (drops: Record<number, number>, isWin: boolean, isDraw: boolean) => void;

  // Táticas
  tactics: TacticalSettings;
  setTactics: (t: TacticalSettings) => void;

  // Histórico
  matchHistory: MatchRecord[];
  addMatchRecord: (r: MatchRecord) => void;

  // Data e calendário contínuo
  currentDate: Date;
  currentDayName: string;
  currentDateStr: string;
  calendarMatches: CalendarMatch[];
  todayMatch: CalendarMatch | null;       // partida de hoje (se houver)
  nextMatch: CalendarMatch | null;        // próxima partida
  daysUntilNextMatch: number;
  currentRound: number;
  advanceDay: (training?: TrainingFocus) => void;
  markMatchPlayed: (round: number, homeGoals: number, awayGoals: number) => void;

  // Treino do dia
  todayTraining: TrainingFocus | null;
  setTodayTraining: (f: TrainingFocus | null) => void;
  autoSuggestTraining: () => TrainingFocus;

  // Finanças
  balance: number;
  monthlyIncome: number;
  wageBill: number;
  addFunds: (v: number) => void;
  deductFunds: (v: number) => void;

  // Liga
  standings: StandingRow[];
  schedule: ScheduledMatch[];
  recordLeagueResult: (homeId: number, awayId: number, hg: number, ag: number) => void;
  cupMatches: CupMatch[];

  // Notícias
  news: NewsItem[];
  addNews: (n: Omit<NewsItem,'id'>) => void;

  // Contratos
  pendingContracts: ContractOffer[];
  proposeContract: (playerId: number, salary: number, years: number) => void;
  resolveContract: (playerId: number, accept: boolean) => void;

  season: number;
  restoreFromSave: (team: Team, data: any) => void;
  buildSaveData: () => any | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [selectedTeam, setSelectedTeamRaw] = useState<Team | null>(null);
  const [playerStates, setPlayerStates]   = useState<Record<number, PlayerState>>({});
  const [tactics, setTactics]             = useState<TacticalSettings>(defaultTactics);
  const [matchHistory, setMatchHistory]   = useState<MatchRecord[]>([]);
  const [currentDate, setCurrentDate]     = useState<Date>(getSeasonStartDate());
  const [calendarMatches, setCalendarMatches] = useState<CalendarMatch[]>([]);
  const [balance, setBalance]             = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [news, setNews]                   = useState<NewsItem[]>([]);
  const [newsCounter, setNewsCounter]     = useState(0);
  const [pendingContracts, setPendingContracts] = useState<ContractOffer[]>([]);
  const [todayTraining, setTodayTraining] = useState<TrainingFocus | null>(null);
  const [season] = useState(2026);

  const { standings: initStandings, schedule: initSchedule } = useMemo(() => generateLeague(allTeams), []);
  const initCup = useMemo(() => generateCup(allTeams), []);
  const [standings, setStandings] = useState<StandingRow[]>(initStandings);
  const [schedule] = useState<ScheduledMatch[]>(initSchedule);
  const [cupMatches] = useState<CupMatch[]>(initCup);

  const wageBill = useMemo(() =>
    selectedTeam?.players.reduce((s,p) => s + p.salary, 0) ?? 0,
  [selectedTeam]);

  // Partida de hoje e próxima partida
  const todayMatch = useMemo(() => {
    if (!selectedTeam) return null;
    return getMatchOnDate(calendarMatches, currentDate, selectedTeam.id);
  }, [calendarMatches, currentDate, selectedTeam]);

  const nextMatch = useMemo(() => {
    if (!selectedTeam) return null;
    return getNextMatch(calendarMatches, selectedTeam.id, currentDate);
  }, [calendarMatches, currentDate, selectedTeam]);

  const daysUntilNextMatch = useMemo(() => {
    if (!nextMatch) return 99;
    return getDaysUntilMatch(currentDate, nextMatch.date);
  }, [currentDate, nextMatch]);

  const currentRound = useMemo(() => {
    // Rodada atual = última partida disputada + 1
    const played = calendarMatches.filter(m =>
      m.played && (m.homeId === selectedTeam?.id || m.awayId === selectedTeam?.id)
    );
    return played.length + 1;
  }, [calendarMatches, selectedTeam]);

  const currentDayName  = getDayName(currentDate);
  const currentDateStr  = formatDate(currentDate);

  // ── NOTÍCIAS ────────────────────────────────────────────────────────────────
  const pushNews = useCallback((n: Omit<NewsItem,'id'>) => {
    setNewsCounter(c => {
      const id = c + 1;
      setNews(prev => [{ ...n, id }, ...prev].slice(0, 40));
      return id;
    });
  }, []);
  const addNews = pushNews;

  // ── SELECIONAR TIME ─────────────────────────────────────────────────────────
  const setSelectedTeam = useCallback((team: Team) => {
    setSelectedTeamRaw(team);
    setBalance(team.balance);
    setMonthlyIncome(team.monthlyIncome);
    const initial: Record<number, PlayerState> = {};
    team.players.forEach((p: Player) => {
      initial[p.id] = { fatigue: 100, morale: p.morale, happiness: p.happiness, injuryWeeks: 0 };
    });
    setPlayerStates(initial);
    const cal = generateCalendar(allTeams.map(t => t.id));
    setCalendarMatches(cal);
    setCurrentDate(getSeasonStartDate()); // começa na segunda 06/Abr
    pushNews({ type:'info', title:`Bem-vindo ao ${team.name}!`, body:`Objetivo: ${team.objective}`, date:'06/04' });
  }, [pushNews]);

  const addFunds    = useCallback((v: number) => setBalance(b => b + v), []);
  const deductFunds = useCallback((v: number) => setBalance(b => b - v), []);

  // ── AVANÇAR DIA ─────────────────────────────────────────────────────────────
  const advanceDay = useCallback((training?: TrainingFocus) => {
    const focus = training ?? todayTraining;

    // Aplica treino do dia (se não for dia de jogo)
    if (focus && selectedTeam) {
      setPlayerStates(prev => {
        const next = { ...prev };
        selectedTeam.players.forEach(p => {
          const cur = next[p.id] ?? { fatigue:100, morale:75, happiness:75, injuryWeeks:0 };
          if (cur.injuryWeeks > 0) return;

          // Efeito do treino (por dia, valores menores que o semanal)
          let fatChange = 0, moraleDelta = 0;
          switch (focus) {
            case 'recovery':   fatChange = +18; moraleDelta = +2; break;
            case 'physical':   fatChange = +8;  moraleDelta = 0;  break;
            case 'tactical':   fatChange = -5;  moraleDelta = +1; break;
            case 'attacking':  fatChange = -7;  moraleDelta = +1; break;
            case 'defending':  fatChange = -7;  moraleDelta = 0;  break;
            case 'possession': fatChange = -5;  moraleDelta = +1; break;
            case 'setpieces':  fatChange = -3;  moraleDelta = 0;  break;
            case 'goalkeepers':fatChange = -5;  moraleDelta = 0;  break;
            case 'cohesion':   fatChange = -4;  moraleDelta = +2; break;
            case 'individual': fatChange = -4;  moraleDelta = +1; break;
          }
          next[p.id] = {
            ...cur,
            fatigue: Math.min(100, Math.max(0, cur.fatigue + fatChange)),
            morale:  Math.min(100, Math.max(0, cur.morale + moraleDelta)),
          };
        });
        return next;
      });

      // Mensagem qualitativa (só 1x a cada 2 dias para não poluir)
      if (Math.random() > 0.5) {
        const msgs: Record<TrainingFocus, string> = {
          physical:   'O elenco trabalhou a preparação física.',
          attacking:  'O setor ofensivo treinou movimentação e finalização.',
          defending:  'A defesa trabalhou posicionamento e marcação.',
          possession: 'O time treinou a circulação de bola.',
          setpieces:  'Bolas paradas foram bem ensaiadas hoje.',
          tactical:   'O time assimilou as instruções táticas.',
          goalkeepers:'Os goleiros trabalharam reflexos e posicionamento.',
          recovery:   'Dia de recuperação. Elenco descansado.',
          cohesion:   'O entrosamento do grupo melhorou.',
          individual: 'Sessão de treino individual concluída.',
        };
        pushNews({ type:'training', title:msgs[focus], body:'', date:currentDateStr });
      }
    }

    // Pequena recuperação de lesão a cada 7 dias
    const nextDay = addDays(currentDate, 1);
    if (nextDay.getDay() === 1) { // toda segunda
      setPlayerStates(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(idStr => {
          const id = Number(idStr);
          if (next[id].injuryWeeks > 0) {
            next[id] = { ...next[id], injuryWeeks: next[id].injuryWeeks - 1 };
          }
        });
        return next;
      });
    }

    // Receita mensal (dia 1 de cada mês)
    if (nextDay.getDate() === 1) {
      setBalance(b => b + monthlyIncome - wageBill);
      pushNews({
        type:'info',
        title:'Movimentação financeira mensal',
        body:`Receita: +${monthlyIncome}K | Folha: -${wageBill}K`,
        date:`${String(nextDay.getDate()).padStart(2,'0')}/${String(nextDay.getMonth()+1).padStart(2,'0')}`,
      });
    }

    setCurrentDate(nextDay);
    setTodayTraining(null);
  }, [todayTraining, selectedTeam, currentDate, currentDateStr, monthlyIncome, wageBill, pushNews]);

  // ── MARCAR JOGO COMO DISPUTADO ────────────────────────────────────────────
  const markMatchPlayed = useCallback((round: number, homeGoals: number, awayGoals: number) => {
    setCalendarMatches(prev => prev.map(m =>
      m.round === round && !m.played
        ? { ...m, played: true, homeGoals, awayGoals }
        : m
    ));
  }, []);

  // ── FADIGA APÓS PARTIDA ───────────────────────────────────────────────────
  const applyFatigueDrops = useCallback(
    (drops: Record<number,number>, isWin: boolean, isDraw: boolean) => {
      setPlayerStates(prev => {
        const next = { ...prev };
        const moraleDelta = isWin ? 6 : isDraw ? 1 : -5;
        Object.entries(drops).forEach(([idStr, drop]) => {
          const id = Number(idStr);
          const cur = next[id] ?? { fatigue:100, morale:75, happiness:75, injuryWeeks:0 };
          let injury = cur.injuryWeeks;
          if (injury === 0 && Math.random() < Math.max(0, (100 - cur.fatigue) / 400)) {
            const r = Math.random();
            injury = r < 0.6 ? 1 : r < 0.85 ? 2 : r < 0.95 ? 4 : 8;
            const player = selectedTeam?.players.find(p => p.id === id);
            if (player) pushNews({ type:'injury', title:`${player.name} lesionado`, body:`Fora por ${injury} semana(s).`, date:currentDateStr });
          }
          next[id] = {
            fatigue: Math.max(0, cur.fatigue - drop),
            morale:  Math.min(100, Math.max(0, cur.morale + moraleDelta)),
            happiness: Math.min(100, Math.max(0, cur.happiness + (isWin?4:isDraw?0:-3))),
            injuryWeeks: injury,
          };
        });
        return next;
      });
    },
    [selectedTeam, currentDateStr, pushNews]
  );

  // ── AUTO SUGESTÃO DO DIA ──────────────────────────────────────────────────
  const autoSuggestTraining = useCallback((): TrainingFocus => {
    if (!selectedTeam) return 'physical';
    const avgFatigue = selectedTeam.players.reduce((s,p) =>
      s + (playerStates[p.id]?.fatigue ?? 100), 0) / selectedTeam.players.length;

    const attrs = [
      { key:'attacking' as TrainingFocus,  val: selectedTeam.players.reduce((s,p)=>s+p.shooting,0)/selectedTeam.players.length },
      { key:'defending' as TrainingFocus,  val: selectedTeam.players.reduce((s,p)=>s+p.defense,0)/selectedTeam.players.length },
      { key:'possession' as TrainingFocus, val: selectedTeam.players.reduce((s,p)=>s+p.passing,0)/selectedTeam.players.length },
      { key:'physical' as TrainingFocus,   val: selectedTeam.players.reduce((s,p)=>s+p.physical,0)/selectedTeam.players.length },
    ].sort((a,b) => a.val - b.val);

    return autoSuggestDay(daysUntilNextMatch, avgFatigue, attrs[0].key);
  }, [selectedTeam, playerStates, daysUntilNextMatch]);

  // ── TABELA ────────────────────────────────────────────────────────────────
  const recordLeagueResult = useCallback((homeId: number, awayId: number, hg: number, ag: number) => {
    setStandings(prev => sortStandings(updateStandings(prev, homeId, awayId, hg, ag)));
  }, []);

  const addMatchRecord = useCallback((r: MatchRecord) => {
    setMatchHistory(prev => [r, ...prev]);
  }, []);

  // ── CONTRATOS ────────────────────────────────────────────────────────────
  const proposeContract = useCallback((playerId: number, salary: number, years: number) => {
    setPendingContracts(prev => [...prev.filter(c=>c.playerId!==playerId), {playerId,salary,years,status:'pending'}]);
    const player = selectedTeam?.players.find(p => p.id === playerId);
    if (!player) return;
    const accepted = Math.random() < (salary >= player.salary ? 0.85 : 0.3);
    setTimeout(() => {
      setPendingContracts(prev => prev.map(c => c.playerId===playerId ? {...c,status:accepted?'accepted':'rejected'} : c));
      pushNews({ type:'contract', title:accepted?`${player.name} renovou!`:`${player.name} recusou`, body:accepted?`${salary}K/mês por ${years} ano(s).`:`Oferta de ${salary}K recusada.`, date:currentDateStr });
    }, 800);
  }, [selectedTeam, currentDateStr, pushNews]);

  const resolveContract = useCallback((playerId: number, _: boolean) => {
    setPendingContracts(prev => prev.filter(c => c.playerId!==playerId));
  }, []);

  // ── SAVE / LOAD ──────────────────────────────────────────────────────────
  const buildSaveData = useCallback(() => {
    if (!selectedTeam) return null;
    return {
      teamId: selectedTeam.id,
      playerStates, tactics, matchHistory,
      currentDate: currentDate.toISOString(),
      balance, monthlyIncome,
      standings, news,
      calendarMatches: calendarMatches.map(m => ({...m, date: m.date.toISOString()})),
      season,
      savedAt: new Date().toISOString(),
    };
  }, [selectedTeam, playerStates, tactics, matchHistory, currentDate, balance, monthlyIncome, standings, news, calendarMatches, season]);

  const restoreFromSave = useCallback((team: Team, data: any) => {
    setSelectedTeamRaw(team);
    setBalance(data.balance ?? team.balance);
    setMonthlyIncome(data.monthlyIncome ?? team.monthlyIncome);
    setCurrentDate(data.currentDate ? new Date(data.currentDate) : getSeasonStartDate());
    setMatchHistory(data.matchHistory ?? []);
    setNews(data.news ?? []);
    if (data.tactics) setTactics(data.tactics);
    if (data.playerStates) setPlayerStates(data.playerStates);
    if (data.standings) setStandings(data.standings);
    if (data.calendarMatches) {
      setCalendarMatches(data.calendarMatches.map((m: any) => ({...m, date: new Date(m.date)})));
    } else {
      setCalendarMatches(generateCalendar(allTeams.map(t => t.id)));
    }
    const initial: Record<number, PlayerState> = {};
    team.players.forEach((p: Player) => {
      initial[p.id] = data.playerStates?.[p.id] ?? { fatigue:100, morale:p.morale, happiness:p.happiness, injuryWeeks:0 };
    });
    if (!data.playerStates) setPlayerStates(initial);
  }, []);

  return (
    <GameContext.Provider value={{
      selectedTeam, setSelectedTeam,
      playerStates, applyFatigueDrops,
      tactics, setTactics,
      matchHistory, addMatchRecord,
      currentDate, currentDayName, currentDateStr,
      calendarMatches, todayMatch, nextMatch, daysUntilNextMatch,
      currentRound, advanceDay, markMatchPlayed,
      todayTraining, setTodayTraining, autoSuggestTraining,
      balance, monthlyIncome, wageBill,
      addFunds, deductFunds,
      standings, schedule, recordLeagueResult, cupMatches,
      news, addNews,
      pendingContracts, proposeContract, resolveContract,
      season, restoreFromSave, buildSaveData,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
