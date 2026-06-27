import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { Team, Player, teams as allTeams, LEAGUES } from "@/lib/teams";
import { analyzeSquad } from "@/lib/squadAnalyzer";
import {
  TacticalSettings,
  defaultTactics,
  simulateMatch,
} from "@/lib/matchEngine";
import {
  StandingRow,
  ScheduledMatch,
  CupMatch,
  generateLeague,
  generateCup,
  updateStandings,
  sortStandings,
  getPrizeMoney,
  processPromotionsRelegations,
} from "@/lib/leagueSystem";
import {
  CalendarMatch,
  generateCalendar,
  getMatchOnDate,
  getNextMatch,
  getDaysUntilMatch,
  getDayName,
  formatDate,
  addDays,
  getSeasonStartDate,
  autoSuggestDay,
  isSameDay,
  COMPETITION_DAYS,
} from "@/lib/calendar";
import { UCLFixture, UCLStandingRow, selectUCLTeams, createUCLPots, drawUCLFixtures, generateUCLCalendarMatches, buildUCLStandings, getUCLClassification, generateUCLKnockout } from "@/lib/championsLeague";
import type { Facilities, StaffMember } from "@/lib/saveSystem";
import { IndividualPlan } from "@/lib/trainingTypes";


// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface PlayerState {
  fatigue: number;
  morale: number;
  happiness: number;
  injuryWeeks: number;
  trainingBonus?: { attribute: string; bonus: number };
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
  type: "injury" | "result" | "transfer" | "contract" | "training" | "info";
  title: string;
  body: string;
  date: string;
}

export type TrainingFocus =
  | "physical"
  | "attacking"
  | "defending"
  | "possession"
  | "setpieces"
  | "tactical"
  | "goalkeepers"
  | "recovery"
  | "cohesion"
  | "individual";

export interface ContractOffer {
  playerId: number;
  salary: number;
  years: number;
  status: "pending" | "accepted" | "rejected";
  isNewTransfer?: boolean; // If true, it's a new signing
}

export interface TransferOffer {
  playerId: number;
  fee: number;
  status: "pending" | "accepted" | "rejected";
}

interface GameContextType {
  // Time
  selectedTeam: Team | null;
  setSelectedTeam: (team: Team) => void;
  playerStates: Record<number, PlayerState>;
  applyFatigueDrops: (
    drops: Record<number, number>,
    isWin: boolean,
    isDraw: boolean,
  ) => void;

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
  todayMatches: CalendarMatch[];
  todayMatch: CalendarMatch | null; // partida de hoje (se houver)
  nextMatch: CalendarMatch | null; // próxima partida
  daysUntilNextMatch: number;
  currentRound: number;
  advanceDay: (training?: TrainingFocus) => void;
  markMatchPlayed: (
    a: number | string,
    b: number,
    c: number,
    d: number,
    e: number,
    f?: number
  ) => void;

  // Treino do dia
  todayTraining: TrainingFocus | null;
  setTodayTraining: (f: TrainingFocus | null) => void;
  autoSuggestTraining: () => TrainingFocus;
  individualPlans: Record<number, IndividualPlan>;
  updateIndividualPlan: (playerId: number, plan: Partial<IndividualPlan>) => void;

  // Finanças
  balance: number;
  monthlyIncome: number;
  wageBill: number;
  addFunds: (v: number) => void;
  deductFunds: (v: number) => void;

  uclTeams: number[];
  uclFixtures: UCLFixture[];
  uclStandings: UCLStandingRow[];
  uclStage: 'league_phase' | 'playoff' | 'r16' | 'qf' | 'sf' | 'final' | 'done';
  userInUCL: boolean;

  // Ligas
  standings: StandingRow[];
  schedule: ScheduledMatch[];
  recordLeagueResult: (
    homeId: number,
    awayId: number,
    hg: number,
    ag: number,
    hStats?: any,
    aStats?: any,
    competitionId?: string | number,
  ) => void;
  cupMatches: CupMatch[];

  // Notícias
  news: NewsItem[];
  addNews: (n: Omit<NewsItem, "id">) => void;

  // Contratos & Transferências
  pendingContracts: ContractOffer[];
  proposeContract: (playerId: number, salary: number, years: number, isNewTransfer?: boolean) => void;
  resolveContract: (playerId: number, accept: boolean) => void;
  pendingTransfers: TransferOffer[];
  proposeTransfer: (playerId: number, fee: number) => void;
  resolveTransfer: (playerId: number) => void;
  completeInteractiveTransfer: (playerId: number, fee: number, salary: number, years: number) => void;

  season: number;
  seasonFinished: boolean;
  clubTrophies: Record<number, { season: number; name: string }[]>;
  advanceSeason: () => void;
  restoreFromSave: (team: Team, data: any) => void;
  buildSaveData: () => any | null;

  // Instalações
  facilities: Facilities;
  upgradeFacility: (fType: keyof Facilities, cost: number) => void;
  myStaff: StaffMember[];
  availableStaff: StaffMember[];
  hireStaff: (staff: StaffMember) => boolean;
  fireStaff: (id: number, compensation: number) => void;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
  playPlayerMatchSimulated: () => void;
  playerStats: Record<
    number,
    {
      goals: number;
      assists: number;
      yellowCards: number;
      redCards: number;
      matches: number;
    }
  >;
  playerHistory: Record<number, { year: number, club: string, comp: string, matches: number, goals: number, assists: number, avg: string }[]>;
  recordMatchPlayerStats: (
    events: MatchEvent[],
    homeTeam: Team,
    awayTeam: Team,
  ) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [selectedTeam, setSelectedTeamRaw] = useState<Team | null>(null);
  const [playerStates, setPlayerStates] = useState<Record<number, PlayerState>>(
    {},
  );
  const [playerHistory, setPlayerHistory] = useState<Record<number, { year: number, club: string, comp: string, matches: number, goals: number, assists: number, avg: string }[]>>({});
  const [playerStats, setPlayerStats] = useState<
    Record<
      number,
      {
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        matches: number;
      }
    >
  >({});
  const [tactics, setTactics] = useState<TacticalSettings>(defaultTactics);
  const [matchHistory, setMatchHistory] = useState<MatchRecord[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(getSeasonStartDate());
  const [calendarMatches, setCalendarMatches] = useState<CalendarMatch[]>([]);
  const [balance, setBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsCounter, setNewsCounter] = useState(0);
  const [pendingContracts, setPendingContracts] = useState<ContractOffer[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<TransferOffer[]>([]);
  const [todayTraining, setTodayTraining] = useState<TrainingFocus | null>(
    null,
  );
  const [individualPlans, setIndividualPlans] = useState<Record<number, IndividualPlan>>({});

  const updateIndividualPlan = useCallback((playerId: number, partial: Partial<IndividualPlan>) => {
    setIndividualPlans(prev => {
      const current = prev[playerId];
      if (current) {
        return { ...prev, [playerId]: { ...current, ...partial } };
      } else {
        // We'll pass the whole object via default or expect UI to set it fully the first time
        // The default plan generation logic can live in the UI or we can put it here if needed,
        // but for now let's just merge
        return { ...prev, [playerId]: { playerId, role: "Meia box-to-box", attribute: "passing", intensity: "medium", ...partial } as IndividualPlan };
      }
    });
  }, []);
  const [isSimulating, setIsSimulating] = useState(false);
  const [season, setSeason] = useState(2026);
  const [seasonFinished, setSeasonFinished] = useState(false);
  const [clubTrophies, setClubTrophies] = useState<Record<number, { season: number; name: string }[]>>({});
  const [facilities, setFacilities] = useState<Facilities>({
    stadium: 1,
    trainingCenter: 1,
    medicalCenter: 1,
    youthAcademy: 1,
    scoutingNetwork: 1,
  });
  const [uclTeams, setUclTeams] = useState<number[]>([]);
  const [uclFixtures, setUclFixtures] = useState<UCLFixture[]>([]);
  const [uclStandings, setUclStandings] = useState<UCLStandingRow[]>([]);
  const [uclStage, setUclStage] = useState<'league_phase' | 'playoff' | 'r16' | 'qf' | 'sf' | 'final' | 'done'>('league_phase');
  const [userInUCL, setUserInUCL] = useState(false);

  const [myStaff, setMyStaff] = useState<StaffMember[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);

  // Gera staff aleatório (se não estiver salvo)
  useEffect(() => {
    if (availableStaff.length === 0) {
      const roles: ("assistant" | "coach" | "physio" | "scout")[] = [
        "assistant",
        "coach",
        "physio",
        "scout",
      ];
      const ptFirstNames = [
        "Carlos",
        "Roberto",
        "Lucas",
        "Ricardo",
        "Eduardo",
        "Paulo",
        "Sérgio",
        "Márcio",
        "Fernando",
        "João",
        "Pedro",
        "Felipe",
      ];
      const ptLastNames = [
        "Silva",
        "Santos",
        "Oliveira",
        "Costa",
        "Pereira",
        "Almeida",
        "Nunes",
        "Melo",
        "Souza",
        "Rodrigues",
        "Ferreira",
        "Lima",
      ];
      const esFirstNames = [
        "Diego",
        "Javier",
        "Luis",
        "Jorge",
        "Mateo",
        "Santiago",
        "Sebastián",
        "Matías",
        "Alejandro",
        "Martín",
      ];
      const esLastNames = [
        "García",
        "Fernández",
        "González",
        "Rodríguez",
        "López",
        "Martínez",
        "Pérez",
        "Gómez",
        "Sánchez",
        "Díaz",
      ];
      const euroFirstNames = [
        "Klaus",
        "Hans",
        "Pierre",
        "Jean",
        "Marco",
        "Giuseppe",
        "John",
        "David",
        "Sven",
        "Lars",
        "Luka",
        "Ivan",
      ];
      const euroLastNames = [
        "Müller",
        "Schmidt",
        "Dupont",
        "Martin",
        "Rossi",
        "Russo",
        "Smith",
        "Jones",
        "Johansson",
        "Andersson",
        "Modric",
        "Kovac",
      ];

      const generated: StaffMember[] = [];
      for (let i = 0; i < 20; i++) {
        const rRole = Math.random();
        const role = roles.find((_, idx) => rRole < (idx + 1) / roles.length)!;
        const skill = Math.floor(Math.random() * 10) + 10; // 10 to 19
        const salary = Math.floor(Math.random() * 15 + skill * 1.5); // e.g. 15 to 45 K

        const rNat = Math.random();
        let nationality = "Brasil";
        let firstName = "";
        let lastName = "";

        if (rNat < 0.5) {
          nationality = "Brasil";
          firstName =
            ptFirstNames[Math.floor(Math.random() * ptFirstNames.length)];
          lastName =
            ptLastNames[Math.floor(Math.random() * ptLastNames.length)];
        } else if (rNat < 0.7) {
          nationality = "Argentina";
          firstName =
            esFirstNames[Math.floor(Math.random() * esFirstNames.length)];
          lastName =
            esLastNames[Math.floor(Math.random() * esLastNames.length)];
        } else if (rNat < 0.8) {
          nationality = "Uruguai";
          firstName =
            esFirstNames[Math.floor(Math.random() * esFirstNames.length)];
          lastName =
            esLastNames[Math.floor(Math.random() * esLastNames.length)];
        } else if (rNat < 0.9) {
          nationality = "Portugal";
          firstName =
            ptFirstNames[Math.floor(Math.random() * ptFirstNames.length)];
          lastName =
            ptLastNames[Math.floor(Math.random() * ptLastNames.length)];
        } else {
          nationality = [
            "Espanha",
            "Itália",
            "Alemanha",
            "França",
            "Croácia",
            "Inglaterra",
          ][Math.floor(Math.random() * 6)];
          firstName =
            euroFirstNames[Math.floor(Math.random() * euroFirstNames.length)];
          lastName =
            euroLastNames[Math.floor(Math.random() * euroLastNames.length)];
        }

        const name = `${firstName} ${lastName}`;
        generated.push({
          id: 1000 + i,
          name,
          role,
          skill,
          salary,
          nationality,
        });
      }
      setAvailableStaff(generated);
    }
  }, []);

  const currentDayName = getDayName(currentDate);
  const currentDateStr = formatDate(currentDate);

  const hireStaff = useCallback(
    (staff: StaffMember): boolean => {
      if (!selectedTeam) return false;

      const currentRoleCount = myStaff.filter(
        (s) => s.role === staff.role,
      ).length;
      let limit = 0;
      let roleName = "";
      if (staff.role === "assistant") {
        limit = 1;
        roleName = "Auxiliar Técnico";
      } else if (staff.role === "coach") {
        limit = facilities.trainingCenter;
        roleName = "Treinadores";
      } else if (staff.role === "physio") {
        limit = facilities.medicalCenter;
        roleName = "Fisioterapeutas";
      } else if (staff.role === "scout") {
        limit = facilities.scoutingNetwork;
        roleName = "Olheiros";
      }

      if (currentRoleCount >= limit) {
        pushNews({
          type: "info",
          title: `Limite Atingido`,
          body: `Sua estrutura não permite contratar mais ${roleName}. O limite atual é ${limit}.`,
          date: currentDateStr,
        });
        return false;
      }

      let minLevel = 1;
      let minLevelStr = "Amador";
      if (staff.skill >= 18) {
        minLevel = 4;
        minLevelStr = "Nível Nacional (4)";
      } else if (staff.skill >= 15) {
        minLevel = 3;
        minLevelStr = "Nível Intermediário (3)";
      } else if (staff.skill >= 13) {
        minLevel = 2;
        minLevelStr = "Nível Regional (2)";
      }

      if (selectedTeam.clubLevel < minLevel) {
        pushNews({
          type: "info",
          title: `Contrato Recusado`,
          body: `${staff.name} recusou a proposta pois exige um clube de pelo menos ${minLevelStr}.`,
          date: currentDateStr,
        });
        return false;
      }

      setMyStaff((prev) => [...prev, staff]);
      setAvailableStaff((prev) => prev.filter((s) => s.id !== staff.id));
      setBalance((b) => b - staff.salary); // 1st month in advance
      pushNews({
        type: "info",
        title: `Contratação: ${staff.name}`,
        body: `Novo membro para a equipe técnica.`,
        date: currentDateStr,
      });
      return true;
    },
    [currentDateStr, selectedTeam, myStaff, facilities],
  );

  const fireStaff = useCallback(
    (id: number, compensation: number) => {
      const fired = myStaff.find((s) => s.id === id);
      if (!fired) return;
      setBalance((b) => b - compensation);
      setMyStaff((prev) => prev.filter((s) => s.id !== id));
      setAvailableStaff((prev) => [...prev, fired]);
      pushNews({
        type: "info",
        title: `Demissão: ${fired.name}`,
        body: `Membro da equipe técnica desligado. Multa recisória: ${compensation}K.`,
        date: currentDateStr,
      });
    },
    [myStaff, currentDateStr],
  );

  const {
    standings: initStandings,
    schedule: initSchedule,
    cupMatches: initCup,
  } = useMemo(() => {
    let allSt: StandingRow[] = [];
    let allSch: ScheduledMatch[] = [];
    let allCup: CupMatch[] = [];

    // Group teams by league for standing and schedule
    const leaguesIds = new Set(allTeams.map((t) => t.leagueId));
    leaguesIds.forEach((lid) => {
      const lgTeams = allTeams.filter((t) => t.leagueId === lid);
      if (lgTeams.length === 0) return;
      const { standings, schedule } = generateLeague(lgTeams);
      allSt = allSt.concat(standings);
      allSch = allSch.concat(schedule);
    });

    // Group teams by country for National Cups
    const countriesIds = new Set(
      allTeams.map((t) => LEAGUES[t.leagueId]?.country).filter(Boolean),
    );
    countriesIds.forEach((cid) => {
      const countryTeams = allTeams.filter(
        (t) => LEAGUES[t.leagueId]?.country === cid,
      );
      if (countryTeams.length > 0) {
        // Cup names can be derived from country ID, but for now we'll just generate the cup
        const cup = generateCup(countryTeams);
        // We could mutate the cup name here to indicate the national cup if desired
        allCup = allCup.concat(cup);
      }
    });

    return { standings: allSt, schedule: allSch, cupMatches: allCup };
  }, []);

  const [standings, setStandings] = useState<StandingRow[]>(initStandings);
  const [schedule, setSchedule] = useState<ScheduledMatch[]>(initSchedule);
  const [cupMatches, setCupMatches] = useState<CupMatch[]>(initCup);

  const wageBill = useMemo(() => {
    let playersWage =
      selectedTeam?.players.reduce((s, p) => s + p.salary, 0) ?? 0;
    let staffWage = myStaff.reduce((s, st) => s + st.salary, 0);
    return playersWage + staffWage;
  }, [selectedTeam, myStaff]);

  // ── NOTÍCIAS ────────────────────────────────────────────────────────────────
  const pushNews = useCallback((n: Omit<NewsItem, "id">) => {
    setNewsCounter((c) => {
      const id = c + 1;
      setNews((prev) => [{ ...n, id }, ...prev].slice(0, 40));
      return id;
    });
  }, []);
  const addNews = pushNews;

  // ── PREMIAÇÃO DE FIM DE TEMPORADA ──────────────────────────────────────────
  useEffect(() => {
    if (
      calendarMatches.length > 0 &&
      !seasonFinished &&
      calendarMatches.every((m) => m.played)
    ) {
      setSeasonFinished(true);
      if (selectedTeam) {
        const myLeagueId = selectedTeam.leagueId;
        const myLeagueStandings = sortStandings(
          standings.filter((s) => {
            const t = allTeams.find((tx) => tx.id === s.teamId);
            return t && t.leagueId === myLeagueId;
          }),
        );

        const myRank =
          myLeagueStandings.findIndex((s) => s.teamId === selectedTeam.id) + 1;
        const prize = getPrizeMoney(myLeagueId, myRank) || 0;

        if (prize > 0) {
          setBalance((b) => b + prize);
          pushNews({
            type: "info",
            title: `Fim de Temporada! (${season})`,
            body: `Parabéns pela ${myRank}ª posição. Premiação de fim de temporada recebida: ${prize >= 1000 ? `${(prize / 1000).toFixed(1)}M` : `${prize}K`}.`,
            date: currentDateStr,
          });
        } else {
          pushNews({
            type: "info",
            title: `Fim de Temporada! (${season})`,
            body: `Seu time terminou na ${myRank}ª posição. Nenhuma premiação recebida.`,
            date: currentDateStr,
          });
        }
      }
    }
  }, [
    calendarMatches,
    seasonFinished,
    selectedTeam,
    standings,
    season,
    currentDateStr,
    pushNews,
  ]);

  // Partida de hoje e próxima partida
  const todayMatches = useMemo(() => {
    if (!selectedTeam) return [];
    return calendarMatches.filter(m => 
      m.date <= currentDate && 
      (m.homeId === selectedTeam.id || m.awayId === selectedTeam.id) && 
      !m.played
    );
  }, [calendarMatches, currentDate, selectedTeam]);

  const todayMatch = useMemo(() => {
    return todayMatches.length > 0 ? todayMatches[0] : null;
  }, [todayMatches]);

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
    const played = calendarMatches.filter(
      (m) =>
        m.played &&
        (m.homeId === selectedTeam?.id || m.awayId === selectedTeam?.id),
    );
    return played.length + 1;
  }, [calendarMatches, selectedTeam]);

  // ── SELECIONAR TIME ─────────────────────────────────────────────────────────
  const setSelectedTeam = useCallback(
    (team: Team) => {
      setSelectedTeamRaw(team);
      setBalance(team.balance);
      setMonthlyIncome(team.monthlyIncome);
      const initial: Record<number, PlayerState> = {};
      team.players.forEach((p: Player) => {
        initial[p.id] = {
          fatigue: 100,
          morale: p.morale,
          happiness: p.happiness,
          injuryWeeks: 0,
        };
      });
      setPlayerStates(initial);
      const leaguesIds = Array.from(new Set(allTeams.map((t) => t.leagueId)));
      const competitionsToGen = leaguesIds.map((lid) => ({
        competitionId: lid,
        teamIds: allTeams.filter((t) => t.leagueId === lid).map((t) => t.id),
        matchDays: COMPETITION_DAYS['league'] || ['saturday', 'sunday'],
        startDate: getSeasonStartDate(),
        weekInterval: 1
      }));
      const cal = generateCalendar(competitionsToGen);
      
      const uclT = selectUCLTeams(allTeams);
      setUclTeams(uclT.map(t => t.id));
      const pots = createUCLPots(uclT);
      const fixs = drawUCLFixtures(pots);
      setUclFixtures(fixs);
      const std = buildUCLStandings(uclT, fixs);
      setUclStandings(std);
      setUclStage('league_phase');
      setUserInUCL(uclT.some(t => t.id === team.id));
      const ucal = generateUCLCalendarMatches(fixs, getSeasonStartDate());
      
      setCalendarMatches(cal.concat(ucal));
      setCurrentDate(getSeasonStartDate()); // começa na segunda 06/Abr
      setStandings(initStandings);
      setSchedule(initSchedule);
      setCupMatches(initCup);
      setMatchHistory([]);
      setPlayerStats({});
      setSeason(2026);
      setSeasonFinished(false);
      setNews([]);
      setNewsCounter(0);
      setPendingContracts([]);
      setTodayTraining(null);
      setFacilities({
        stadium: 1,
        trainingCenter: 1,
        medicalCenter: 1,
        youthAcademy: 1,
        scoutingNetwork: 1,
      });
      setNews([
        {
          id: 0,
          type: "info",
          title: `Bem-vindo ao ${team.name}!`,
          body: `Objetivo: ${team.objective}`,
          date: "06/04",
          read: false,
        },
      ]);
    },
    [initStandings, initSchedule, initCup],
  );

  const addFunds = useCallback((v: number) => setBalance((b) => b + v), []);
  const deductFunds = useCallback((v: number) => setBalance((b) => b - v), []);

  const upgradeFacility = useCallback(
    (fType: keyof Facilities, cost: number) => {
      if (balance >= cost) {
        setBalance((b) => b - cost);
        setFacilities((prev) => ({ ...prev, [fType]: prev[fType] + 1 }));
        pushNews({
          type: "info",
          title: `Instalação melhorada!`,
          body: `O nível foi evoluído com sucesso. Custou ${cost}K.`,
          date: currentDateStr,
        });
      }
    },
    [balance, currentDateStr, pushNews],
  );

  // ── AVANÇAR DIA ─────────────────────────────────────────────────────────────
  const advanceDay = useCallback(
    (training?: TrainingFocus) => {
      const focus = training ?? todayTraining;

      // Aplica treino do dia ou descanso (se não for dia de jogo)
      if (selectedTeam) {
        setPlayerStates((prev) => {
          const next = { ...prev };
          selectedTeam.players.forEach((p) => {
            const cur = next[p.id] ?? {
              fatigue: 100,
              morale: 75,
              happiness: 75,
              injuryWeeks: 0,
            };
            if (cur.injuryWeeks > 0) return;

            // Efeito do treino (por dia, valores menores que o semanal)
            let fatChange = 0,
              moraleDelta = 0;

            if (focus) {
              switch (focus) {
                case "recovery":
                  fatChange = +18;
                  moraleDelta = +2;
                  break;
                case "physical":
                  fatChange = +8;
                  moraleDelta = 0;
                  break;
                case "tactical":
                  fatChange = -5;
                  moraleDelta = +1;
                  break;
                case "attacking":
                  fatChange = -7;
                  moraleDelta = +1;
                  break;
                case "defending":
                  fatChange = -7;
                  moraleDelta = 0;
                  break;
                case "possession":
                  fatChange = -5;
                  moraleDelta = +1;
                  break;
                case "setpieces":
                  fatChange = -3;
                  moraleDelta = 0;
                  break;
                case "goalkeepers":
                  fatChange = -5;
                  moraleDelta = 0;
                  break;
                case "cohesion":
                  fatChange = -4;
                  moraleDelta = +2;
                  break;
                case "individual": {
                  const plan = individualPlans[p.id];
                  const intensity = plan?.intensity ?? 'medium';
                  fatChange = intensity === 'high' ? -10 : intensity === 'medium' ? -5 : -2;
                  moraleDelta = +1;
                  
                  if (plan) {
                    cur.trainingBonus = {
                      attribute: plan.attribute,
                      bonus: intensity === 'high' ? 4 : intensity === 'medium' ? 2 : 1
                    };
                  }
                  break;
                }
              }
            } else {
              // Descanso (sem treino definido)
              fatChange = +12;
              moraleDelta = +1;
            }

            // Training center and coaches improve recovery and reduce fatigue cost
            let coachSkill = 0;
            myStaff.forEach((st) => {
              if (st.role === "coach" || st.role === "assistant")
                coachSkill += st.skill;
            });
            const tcMod =
              (facilities.trainingCenter - 1) * 0.15 + coachSkill * 0.015;
            if (fatChange > 0) {
              fatChange = Math.round(fatChange * (1 + tcMod));
            } else if (fatChange < 0) {
              fatChange = Math.round(fatChange * (1 - tcMod));
            }

            next[p.id] = {
              ...cur,
              fatigue: Math.min(100, Math.max(0, cur.fatigue + fatChange)),
              morale: Math.min(100, Math.max(0, cur.morale + moraleDelta)),
            };
          });
          return next;
        });

        if (focus) {
          // Mensagem qualitativa (só 1x a cada 2 dias para não poluir)
          if (Math.random() > 0.5) {
            const msgs: Record<TrainingFocus, string> = {
              physical: "O elenco trabalhou a preparação física.",
              attacking: "O setor ofensivo treinou movimentação e finalização.",
              defending: "A defesa trabalhou posicionamento e marcação.",
              possession: "O time treinou a circulação de bola.",
              setpieces: "Bolas paradas foram bem ensaiadas hoje.",
              tactical: "O time assimilou as instruções táticas.",
              goalkeepers: "Os goleiros trabalharam reflexos e posicionamento.",
              recovery: "Dia de recuperação. Elenco descansado.",
              cohesion: "O entrosamento do grupo melhorou.",
              individual: "Sessão de treino individual concluída.",
            };
            pushNews({
              type: "training",
              title: msgs[focus],
              body: "",
              date: currentDateStr,
            });
          }
        }
      }

      // Pequena recuperação de lesão a cada 7 dias e ciclo de mercado semanal
      const nextDay = addDays(currentDate, 1);
      if (nextDay.getDay() === 1) {
        // toda segunda
        setPlayerStates((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((idStr) => {
            const id = Number(idStr);
            if (next[id].injuryWeeks > 0) {
              next[id] = { ...next[id], injuryWeeks: next[id].injuryWeeks - 1 };
            }
          });
          return next;
        });

        // User Squad Diagnostic Alert
        const isTransferWindowOpen = nextDay.getMonth() === 0 || nextDay.getMonth() === 6; // Jan and Jul
        allTeams.forEach(t => {
           if (t.id === selectedTeam.id) {
             const diagnosis = analyzeSquad(t.players, t.id, currentDate.getTime());
             if (diagnosis.overallHealth !== 'healthy') {
               pushNews({
                 type: "info",
                 title: diagnosis.overallHealth === 'critical' ? '⚠️ Problema crítico no seu elenco!' : '📋 Análise semanal do elenco',
                 body: diagnosis.priorityActions.join('\n'),
                 date: currentDateStr,
                 // diagnosis object could be attached here if interface allowed it, but body as string is good fallback.
               });
             }
           }
        });
      }

      // Receita mensal (dia 1 de cada mês)
      if (nextDay.getDate() === 1) {
        setBalance((b) => b + monthlyIncome - wageBill);
        pushNews({
          type: "info",
          title: "Movimentação financeira mensal",
          body: `Receita: +${monthlyIncome}K | Folha: -${wageBill}K`,
          date: `${String(nextDay.getDate()).padStart(2, "0")}/${String(nextDay.getMonth() + 1).padStart(2, "0")}`,
        });
      }

      // Simulate all AI matches for the current date (or past dates if skipped) before skipping to the next day
      const aiMatches = calendarMatches.filter(
        (m) =>
          m.date <= currentDate &&
          !m.played &&
          m.homeId !== selectedTeam?.id &&
          m.awayId !== selectedTeam?.id,
      );

      if (aiMatches.length > 0) {
        const matchResults: {
          homeId: number;
          awayId: number;
          homeGoals: number;
          awayGoals: number;
          homeStats: any;
          awayStats: any;
          matchRef: CalendarMatch;
        }[] = [];

        aiMatches.forEach((m) => {
          const hTeam = allTeams.find((t) => t.id === m.homeId);
          const aTeam = allTeams.find((t) => t.id === m.awayId);
          if (hTeam && aTeam) {
            const aiH = { ...defaultTactics },
              aiA = { ...defaultTactics };
            const r1 = Math.random();
            aiH.mentality =
              r1 < 0.4 ? "attacking" : r1 < 0.7 ? "balanced" : "defensive";
            const r2 = Math.random();
            aiA.mentality =
              r2 < 0.4 ? "attacking" : r2 < 0.7 ? "balanced" : "defensive";
            const hFat: Record<number, number> = {},
              aFat: Record<number, number> = {};
            hTeam.players.forEach((p) => {
              hFat[p.id] = 100;
            });
            aTeam.players.forEach((p) => {
              aFat[p.id] = 100;
            });

            const res = simulateMatch(hTeam, aTeam, hFat, aFat, aiH, aiA);
            matchResults.push({
              homeId: hTeam.id,
              awayId: aTeam.id,
              homeGoals: res.homeGoals,
              awayGoals: res.awayGoals,
              homeStats: {
                yellow: res.stats.yellowCards[0],
                red: res.stats.redCards[0],
                assists: res.stats.assists[0],
              },
              awayStats: {
                yellow: res.stats.yellowCards[1],
                red: res.stats.redCards[1],
                assists: res.stats.assists[1],
              },
              matchRef: m,
              events: res.events,
              hTeam: hTeam,
              aTeam: aTeam,
            });
          }
        });

        if (matchResults.length > 0) {
          matchResults.forEach((r) => {
            recordMatchPlayerStats(r.events, r.hTeam, r.aTeam);
          });

          setCalendarMatches((prevCal) => {
            let nextCal = [...prevCal];
            matchResults.forEach((r) => {
              const mIdx = nextCal.findIndex((x) => x === r.matchRef);
              if (mIdx !== -1) {
                nextCal[mIdx] = {
                  ...nextCal[mIdx],
                  played: true,
                  homeGoals: r.homeGoals,
                  awayGoals: r.awayGoals,
                };
              }
            });
            return nextCal;
          });

          setStandings((prev) => {
            let st = [...prev];
            const leagueResults = matchResults.filter(r => r.matchRef.competitionId !== 'UCL' && !String(r.matchRef.competitionId).startsWith('cup_'));
            leagueResults.forEach((r) => {
              st = updateStandings(
                st,
                r.homeId,
                r.awayId,
                r.homeGoals,
                r.awayGoals,
                r.homeStats,
                r.awayStats,
              );
            });
            return sortStandings(st);
          });

          setUclFixtures((prevFix) => {
            let nextFix = [...prevFix];
            const uclResults = matchResults.filter(r => r.matchRef.competitionId === 'UCL');
            if (uclResults.length > 0) {
              uclResults.forEach(r => {
                const fIdx = nextFix.findIndex(x => x.round === r.matchRef.round && x.homeId === r.homeId && x.awayId === r.awayId);
                if (fIdx !== -1) {
                  nextFix[fIdx] = { ...nextFix[fIdx], played: true, homeGoals: r.homeGoals, awayGoals: r.awayGoals };
                }
              });
            }
            return nextFix;
          });
        }
      }

      setCurrentDate(nextDay);
      setTodayTraining(null);
    },
    [
      todayTraining,
      selectedTeam,
      currentDate,
      currentDateStr,
      monthlyIncome,
      wageBill,
      pushNews,
      facilities.trainingCenter,
      myStaff,
      calendarMatches,
      allTeams,
    ],
  );

  useEffect(() => {
    if (uclTeams.length > 0 && uclFixtures.length > 0) {
      const uT = allTeams.filter(t => uclTeams.includes(t.id));
      setUclStandings(buildUCLStandings(uT, uclFixtures));
    }
  }, [uclFixtures, uclTeams]);

  // ── MARCAR JOGO COMO DISPUTADO ────────────────────────────────────────────
  const markMatchPlayed = useCallback(
    (
      arg1: number | string,
      arg2: number,
      arg3: number,
      arg4: number,
      arg5: number,
      arg6?: number,
    ) => {
      let competitionId = 'league';
      let round: number, homeId: number, awayId: number, homeGoals: number, awayGoals: number;

      if (typeof arg1 === 'string') {
        competitionId = arg1;
        round = arg2;
        homeId = arg3;
        awayId = arg4;
        homeGoals = arg5;
        awayGoals = arg6 as number;
      } else {
        round = arg1;
        homeId = arg2;
        awayId = arg3;
        homeGoals = arg4;
        awayGoals = arg5;
      }

      setCalendarMatches((prev) =>
        prev.map((m) =>
          m.round === round && m.homeId === homeId && m.awayId === awayId && m.competitionId === competitionId
            ? { ...m, played: true, homeGoals, awayGoals }
            : m,
        ),
      );

      if (competitionId === 'UCL') {
        setUclFixtures((prevFix) => {
          let nextFix = [...prevFix];
          const fIdx = nextFix.findIndex(x => x.round === round && x.homeId === homeId && x.awayId === awayId);
          if (fIdx !== -1) {
            nextFix[fIdx] = { ...nextFix[fIdx], played: true, homeGoals, awayGoals };
          }
          return nextFix;
        });
      }
    },
    [],
  );

  // ── FADIGA APÓS PARTIDA ───────────────────────────────────────────────────
  const applyFatigueDrops = useCallback(
    (drops: Record<number, number>, isWin: boolean, isDraw: boolean) => {
      setPlayerStates((prev) => {
        const next = { ...prev };
        const moraleDelta = isWin ? 6 : isDraw ? 1 : -5;
        Object.entries(drops).forEach(([idStr, drop]) => {
          const id = Number(idStr);
          const cur = next[id] ?? {
            fatigue: 100,
            morale: 75,
            happiness: 75,
            injuryWeeks: 0,
          };
          let injury = cur.injuryWeeks;
          // Medical center and physios lower injury chance and duration
          let physioSkill = 0;
          myStaff.forEach((st) => {
            if (st.role === "physio") physioSkill += st.skill;
          });

          const injuryChanceMod =
            Math.max(0, (100 - cur.fatigue) / 400) *
            (1 - (facilities.medicalCenter - 1) * 0.1 - physioSkill * 0.01);
          if (injury === 0 && Math.random() < Math.max(0.01, injuryChanceMod)) {
            const r = Math.random();
            const injuryDurMod = Math.max(
              0.5,
              1 - (facilities.medicalCenter - 1) * 0.15 - physioSkill * 0.015,
            );
            injury =
              r < 0.6
                ? Math.round(1 * injuryDurMod)
                : r < 0.85
                  ? Math.round(2 * injuryDurMod)
                  : r < 0.95
                    ? Math.round(4 * injuryDurMod)
                    : Math.round(8 * injuryDurMod);
            // Ensure minimum 1 week
            injury = Math.max(1, injury);
            const player = selectedTeam?.players.find((p) => p.id === id);
            if (player)
              pushNews({
                type: "injury",
                title: `${player.name} lesionado`,
                body: `Fora por ${injury} semana(s).`,
                date: currentDateStr,
              });
          }
          next[id] = {
            fatigue: Math.max(0, cur.fatigue - drop),
            morale: Math.min(100, Math.max(0, cur.morale + moraleDelta)),
            happiness: Math.min(
              100,
              Math.max(0, cur.happiness + (isWin ? 4 : isDraw ? 0 : -3)),
            ),
            injuryWeeks: injury,
          };
        });
        return next;
      });
    },
    [selectedTeam, currentDateStr, pushNews, facilities.medicalCenter, myStaff],
  );

  // ── AUTO SUGESTÃO DO DIA ──────────────────────────────────────────────────
  const autoSuggestTraining = useCallback((): TrainingFocus => {
    if (!selectedTeam) return "physical";
    const avgFatigue =
      selectedTeam.players.reduce(
        (s, p) => s + (playerStates[p.id]?.fatigue ?? 100),
        0,
      ) / selectedTeam.players.length;

    const attrs = [
      {
        key: "attacking" as TrainingFocus,
        val:
          selectedTeam.players.reduce((s, p) => s + p.shooting, 0) /
          selectedTeam.players.length,
      },
      {
        key: "defending" as TrainingFocus,
        val:
          selectedTeam.players.reduce((s, p) => s + p.defense, 0) /
          selectedTeam.players.length,
      },
      {
        key: "possession" as TrainingFocus,
        val:
          selectedTeam.players.reduce((s, p) => s + p.passing, 0) /
          selectedTeam.players.length,
      },
      {
        key: "physical" as TrainingFocus,
        val:
          selectedTeam.players.reduce((s, p) => s + p.physical, 0) /
          selectedTeam.players.length,
      },
    ].sort((a, b) => a.val - b.val);

    return autoSuggestDay(daysUntilNextMatch, avgFatigue, attrs[0].key);
  }, [selectedTeam, playerStates, daysUntilNextMatch]);

  // ── ESTATISTICAS DOS JOGADORES ────────────────────────────────────────────
  const recordMatchPlayerStats = useCallback(
    (events: MatchEvent[], homeTeam: Team, awayTeam: Team) => {
      setPlayerStats((prev) => {
        const next = { ...prev };

        const getStats = (id: number) => {
          if (!next[id]) {
            next[id] = {
              goals: 0,
              assists: 0,
              yellowCards: 0,
              redCards: 0,
              matches: 0,
            };
          } else if (next[id] === prev[id]) {
            next[id] = { ...prev[id] };
          }
          return next[id];
        };

        [...homeTeam.players, ...awayTeam.players].forEach((p) => {
          getStats(p.id).matches += 1;
        });

        events.forEach((e) => {
          if (e.type === "goal") {
            if (e.playerId) getStats(e.playerId).goals += 1;
            if (e.assistId) getStats(e.assistId).assists += 1;
          } else if (e.type === "yellow_card" && e.playerId) {
            getStats(e.playerId).yellowCards += 1;
          } else if (e.type === "red_card" && e.playerId) {
            getStats(e.playerId).redCards += 1;
          }
        });
        return next;
      });
    },
    [],
  );

  // ── TABELA ────────────────────────────────────────────────────────────────
  const recordLeagueResult = useCallback(
    (
      homeId: number,
      awayId: number,
      hg: number,
      ag: number,
      hStats?: any,
      aStats?: any,
      competitionId?: string | number,
    ) => {
      if (competitionId === 'UCL' || String(competitionId).startsWith('cup_')) return;
      setStandings((prev) =>
        sortStandings(
          updateStandings(prev, homeId, awayId, hg, ag, hStats, aStats),
        ),
      );
    },
    [],
  );

  const addMatchRecord = useCallback((r: MatchRecord) => {
    setMatchHistory((prev) => [r, ...prev]);
  }, []);

  // ── CONTRATOS ────────────────────────────────────────────────────────────
  const proposeContract = useCallback(
    (playerId: number, salary: number, years: number, isNewTransfer?: boolean) => {
      setPendingContracts((prev) => [
        ...prev.filter((c) => c.playerId !== playerId),
        { playerId, salary, years, status: "pending", isNewTransfer },
      ]);
      const allPlayers = allTeams.flatMap(t => t.players);
      const player = allPlayers.find((p) => p.id === playerId);
      if (!player) return;
      const accepted = Math.random() < (salary >= player.salary ? 0.85 : 0.3);
      setTimeout(() => {
        setPendingContracts((prev) =>
          prev.map((c) =>
            c.playerId === playerId
              ? { ...c, status: accepted ? "accepted" : "rejected" }
              : c,
          ),
        );
        if (accepted) {
           // Apply it to truth immediately, to ensure the UI is unblocked
           player.salary = salary;
           player.contractYears = years;
           if (isNewTransfer && selectedTeam) {
             const fromTeam = allTeams.find(t => t.players.some(p => p.id === playerId));
             const fee = pendingTransfers.find(t => t.playerId === playerId)?.fee || 0;
             if (fromTeam && fromTeam.id !== selectedTeam.id) {
               fromTeam.players = fromTeam.players.filter(p => p.id !== playerId);
               selectedTeam.players.push(player);
               setBalance(b => b - fee);
             }
             setPendingTransfers(prev => prev.filter(c => c.playerId !== playerId));
             setSelectedTeamRaw({ ...selectedTeam });
           } else if (selectedTeam && selectedTeam.players.some(p => p.id === playerId)) {
             setSelectedTeamRaw({ ...selectedTeam }); // refresh UI
           }
        }
        pushNews({
          type: "contract",
          title: accepted
            ? (isNewTransfer ? `${player.name} assinou com o clube!` : `${player.name} renovou!`)
            : `${player.name} recusou`,
          body: accepted
            ? `${salary}K/mês por ${years} ano(s).`
            : `Oferta de ${salary}K recusada.`,
          date: currentDateStr,
        });
      }, 800);
    },
    [selectedTeam, pendingTransfers, currentDateStr, pushNews],
  );

  const resolveContract = useCallback((playerId: number, _: boolean) => {
    setPendingContracts((prev) => prev.filter((c) => c.playerId !== playerId));
  }, []);

  const proposeTransfer = useCallback(
    (playerId: number, fee: number) => {
      setPendingTransfers((prev) => [
        ...prev.filter((c) => c.playerId !== playerId),
        { playerId, fee, status: "pending" },
      ]);
      const allPlayers = allTeams.flatMap(t => t.players);
      const player = allPlayers.find((p) => p.id === playerId);
      if (!player) return;
      const clubId = Math.floor(player.id / 1000);
      const fromTeam = allTeams.find(t => t.players.some(p => p.id === playerId));
      
      const pVal = Math.pow(player.overall / 10, 4) * 2;
      const requiredFee = pVal * (fromTeam?.clubLevel ? 1 + (fromTeam.clubLevel * 0.1) : 1.2);
      
      const accepted = fee >= requiredFee * 0.8 && Math.random() < (fee >= requiredFee ? 0.9 : 0.4);
      setTimeout(() => {
        setPendingTransfers((prev) =>
          prev.map((c) =>
            c.playerId === playerId
              ? { ...c, status: accepted ? "accepted" : "rejected" }
              : c,
          ),
        );
        pushNews({
          type: "transfer",
          title: accepted
            ? `${fromTeam?.name || "Clube"} aceitou proposta por ${player.name}!`
            : `${fromTeam?.name || "Clube"} recusou proposta por ${player.name}.`,
          body: accepted
            ? `A oferta de ${fee}K foi aceita. Agora negocie o contrato com o jogador.`
            : `Eles consideraram a oferta de ${fee}K insuficiente.`,
          date: currentDateStr,
        });
      }, 800);
    },
    [currentDateStr, pushNews],
  );

  const completeInteractiveTransfer = useCallback(
    (playerId: number, fee: number, salary: number, years: number) => {
      const allPlayers = allTeams.flatMap(t => t.players);
      const player = allPlayers.find((p) => p.id === playerId);
      if (!player || !selectedTeam) return;

      const fromTeam = allTeams.find(t => t.players.some(p => p.id === playerId));
      if (fromTeam && fromTeam.id !== selectedTeam.id) {
        fromTeam.players = fromTeam.players.filter(p => p.id !== playerId);
        player.salary = salary;
        player.contractYears = years;
        selectedTeam.players.push(player);
        setBalance(b => b - fee);
        setSelectedTeamRaw({ ...selectedTeam });
        
        pushNews({
          type: "transfer",
          title: `BOMBA: ${player.name} é do ${selectedTeam.name}!`,
          body: `O clube fechou a contratação por R$ ${fee >= 1000 ? (fee / 1000).toFixed(1) + 'M' : fee + 'K'}. Salário será de ${salary}K/mês por ${years} ano(s).`,
          date: currentDateStr,
        });
      }
    },
    [allTeams, selectedTeam, currentDateStr, pushNews]
  );

  const resolveTransfer = useCallback((playerId: number) => {
    setPendingTransfers((prev) => prev.filter((c) => c.playerId !== playerId));
  }, []);

  const advanceSeason = useCallback(() => {
    // Award trophies
    setClubTrophies((prev) => {
      const next = { ...prev };
      const addTrophy = (teamId: number, name: string) => {
        if (!next[teamId]) next[teamId] = [];
        // Prevent duplicate trophy for same season/name
        if (!next[teamId].find(t => t.season === season && t.name === name)) {
          next[teamId].push({ season, name });
        }
      };

      // League trophies
      const leaguesIds = new Set(allTeams.map((t) => t.leagueId));
      leaguesIds.forEach((lid) => {
        const lgTeams = allTeams.filter((t) => t.leagueId === lid).map(t => t.id);
        const lgStandings = standings.filter(s => lgTeams.includes(s.teamId));
        if (lgStandings.length > 0) {
           const champion = lgStandings[0].teamId; // already sorted by game logic, but to be sure we should rely on standings array order
           addTrophy(champion, `Campeão - ${LEAGUES[lid]?.name || 'Liga'}`);
        }
      });

      // Cup trophies
      const cupFinals = cupMatches.filter(m => !m.nextMatchId && m.played);
      cupFinals.forEach(final => {
         // Handle penalties if added in future, but for now goals
         const homeG = final.homeGoals ?? 0;
         const awayG = final.awayGoals ?? 0;
         let winner = homeG > awayG ? final.homeId : (awayG > homeG ? final.awayId : final.homeId); // default home on draw if no pens
         
         const winningTeam = allTeams.find(t => t.id === winner);
         if (winningTeam) {
            const country = LEAGUES[winningTeam.leagueId]?.country || 'Nacional';
            addTrophy(winner, `Campeão da Copa - ${country}`);
         }
      });

      return next;
    });

    // Process promotions and relegations
    const { promotions, relegations } = processPromotionsRelegations(
      standings,
      allTeams,
    );

    // Log them in news
    if (promotions.length > 0 || relegations.length > 0) {
      let newsBody = "Rebaixamentos e promoções:\n";
      promotions
        .sort((a, b) => a.from.localeCompare(b.from))
        .slice(0, 10)
        .forEach((p) => {
          const team = allTeams.find((t) => t.id === p.teamId);
          if (team)
            newsBody += `${team.name} subiu para ${LEAGUES[p.to]?.name}.\n`;
        });
      relegations
        .sort((a, b) => a.from.localeCompare(b.from))
        .slice(0, 10)
        .forEach((p) => {
          const team = allTeams.find((t) => t.id === p.teamId);
          if (team)
            newsBody += `${team.name} caiu para ${LEAGUES[p.to]?.name}.\n`;
        });
      pushNews({
        type: "info",
        title: `Mudanças de Divisão (${season})`,
        body: newsBody.trim(),
        date: currentDateStr,
      });
    }

    // Generate new season
    setSeason((s) => s + 1);
    setSeasonFinished(false);
    setCurrentDate(getSeasonStartDate());
    setMatchHistory([]);
    setPlayerHistory((prev) => {
      const next = { ...prev };
      Object.keys(playerStats).forEach((pidStr) => {
        const pid = Number(pidStr);
        const stats = playerStats[pid];
        if (!next[pid]) next[pid] = [];
        
        let pClubName = "Desconhecido";
        let pCompName = "Liga Nac.";
        for (const t of allTeams) {
            if (t.players.some(x => x.id === pid)) {
               pClubName = t.name;
               pCompName = LEAGUES[t.leagueId]?.abbreviation || LEAGUES[t.leagueId]?.name || "Liga Nac.";
               break;
            }
        }
        
        const avg = stats.matches > 0 ? (6.4 + Math.min(2.5, (stats.goals * 0.4 + stats.assists * 0.2 + (stats.matches * 0.1)))).toFixed(1) : "-";
        
        next[pid].push({
           year: season,
           club: pClubName,
           comp: pCompName,
           matches: stats.matches,
           goals: stats.goals,
           assists: stats.assists,
           avg: avg
        });
      });
      return next;
    });
    setPlayerStats({});

    // Create new standings and calendar
    let allSt: StandingRow[] = [];
    let allSch: ScheduledMatch[] = [];
    let allCup: CupMatch[] = [];

    const leaguesIds = new Set(allTeams.map((t) => t.leagueId));
    leaguesIds.forEach((lid) => {
      const lgTeams = allTeams.filter((t) => t.leagueId === lid);
      if (lgTeams.length === 0) return;
      const { standings: lgSt, schedule: lgSch } = generateLeague(lgTeams);
      allSt = allSt.concat(lgSt);
      allSch = allSch.concat(lgSch);
    });
    setStandings(allSt);
    setSchedule(allSch);

    const countriesIds = new Set(
      allTeams.map((t) => LEAGUES[t.leagueId]?.country).filter(Boolean),
    );
    countriesIds.forEach((cid) => {
      const countryTeams = allTeams.filter(
        (t) => LEAGUES[t.leagueId]?.country === cid,
      );
      if (countryTeams.length > 0) {
        allCup = allCup.concat(generateCup(countryTeams));
      }
    });
    setCupMatches(allCup);

    const lComps = Array.from(leaguesIds).map((lid) => ({
      competitionId: lid,
      teamIds: allTeams.filter((t) => t.leagueId === lid).map((t) => t.id),
      matchDays: COMPETITION_DAYS['league'] || ['saturday', 'sunday'],
      startDate: getSeasonStartDate(),
      weekInterval: 1
    }));
    setCalendarMatches(generateCalendar(lComps));
  }, [allTeams, standings, season, currentDateStr, pushNews]);

  const playPlayerMatchSimulated = useCallback(() => {
    if (!selectedTeam) return;
    const tMatch = calendarMatches.find(m =>
      m.date <= currentDate &&
      (m.homeId === selectedTeam.id || m.awayId === selectedTeam.id) &&
      !m.played
    );
    if (!tMatch || tMatch.played) return;

    const oppId =
      tMatch.homeId === selectedTeam.id ? tMatch.awayId : tMatch.homeId;
    const oppTeam = allTeams.find((t) => t.id === oppId);
    if (!oppTeam) return;

    const myFat: Record<number, number> = {};
    selectedTeam.players.forEach(
      (p) => (myFat[p.id] = playerStates[p.id]?.fatigue ?? 100),
    );

    const oppFat: Record<number, number> = {};
    oppTeam.players.forEach((p) => (oppFat[p.id] = 100));

    const r1 = Math.random();
    const aiOpp = { ...defaultTactics };
    aiOpp.mentality =
      r1 < 0.3 ? "defensive" : r1 < 0.7 ? "balanced" : "attacking";

    let res;
    if (tMatch.homeId === selectedTeam.id) {
      res = simulateMatch(selectedTeam, oppTeam, myFat, oppFat, tactics, aiOpp);
    } else {
      res = simulateMatch(oppTeam, selectedTeam, oppFat, myFat, aiOpp, tactics);
    }

    const { homeGoals, awayGoals, fatigueDrops, stats } = res;

    // We must pass the correct drops. applyFatigueDrops will only process players of the selectedTeam
    const isWin =
      (tMatch.homeId === selectedTeam.id && homeGoals > awayGoals) ||
      (tMatch.awayId === selectedTeam.id && awayGoals > homeGoals);
    const isDraw = homeGoals === awayGoals;

    applyFatigueDrops(fatigueDrops, isWin, isDraw);

    // update player stats
    const hTeamObj = tMatch.homeId === selectedTeam.id ? selectedTeam : oppTeam;
    const aTeamObj = tMatch.homeId === selectedTeam.id ? oppTeam : selectedTeam;
    recordMatchPlayerStats(res.events, hTeamObj, aTeamObj);

    const hStats = {
      yellow: stats.yellowCards[0],
      red: stats.redCards[0],
      assists: stats.assists[0],
    };
    const aStats = {
      yellow: stats.yellowCards[1],
      red: stats.redCards[1],
      assists: stats.assists[1],
    };

    recordLeagueResult(
      tMatch.homeId,
      tMatch.awayId,
      homeGoals,
      awayGoals,
      hStats,
      aStats,
      tMatch.competitionId,
    );

    markMatchPlayed(
      tMatch.competitionId,
      tMatch.round,
      tMatch.homeId,
      tMatch.awayId,
      homeGoals,
      awayGoals,
    );

    pushNews({
      type: "result",
      title: `${homeGoals} - ${awayGoals} vs ${oppTeam.abbreviation}`,
      body: `Simulação rápida concluída.`,
      date: currentDateStr,
    });
  }, [
    selectedTeam,
    calendarMatches,
    currentDate,
    currentDateStr,
    tactics,
    playerStates,
    markMatchPlayed,
    applyFatigueDrops,
    recordLeagueResult,
    pushNews,
  ]);

  const simRefs = useRef({
    selectedTeam,
    calendarMatches,
    currentDateStr,
    playPlayerMatchSimulated,
    advanceDay,
    currentDate,
    todayTraining,
  });

  useEffect(() => {
    simRefs.current = {
      selectedTeam,
      calendarMatches,
      currentDateStr,
      playPlayerMatchSimulated,
      advanceDay,
      currentDate,
      todayTraining,
    };
  });

  // Efeito para auto-simulate
  useEffect(() => {
    if (!isSimulating) return;

    if (seasonFinished) {
      console.log("[SIM] Season finished, stopping simulation.");
      setIsSimulating(false);
      return;
    }

    console.log("[SIM] Setting timeout for next day...");

    const timer = setTimeout(() => {
      const refs = simRefs.current;
      console.log("[SIM] Timeout fired. Processing day:", refs.currentDateStr);
      const tMatch = refs.selectedTeam
        ? refs.calendarMatches.find(m =>
            m.date <= refs.currentDate &&
            (m.homeId === refs.selectedTeam?.id || m.awayId === refs.selectedTeam?.id) &&
            !m.played
          )
        : null;
      if (tMatch && !tMatch.played) {
        console.log("[SIM] Playing player match for today:", tMatch);
        refs.playPlayerMatchSimulated();
      } else {
        console.log("[SIM] Advancing day without player match");
      }
      refs.advanceDay(refs.todayTraining ?? undefined);
    }, 10);

    return () => {
      console.log("[SIM] Clearing timeout.");
      clearTimeout(timer);
    };
  }, [isSimulating, seasonFinished, currentDate]);

  // ── SAVE / LOAD ──────────────────────────────────────────────────────────
  const buildSaveData = useCallback(() => {
    if (!selectedTeam) return null;
    const teamLeagues: Record<number, string> = {};
    const customPlayerConfigs: Record<number, { teamId: number, salary: number, contractYears: number }> = {};
    
    allTeams.forEach((t) => {
      teamLeagues[t.id] = t.leagueId;
      t.players.forEach(p => {
        const originalTeamId = Math.floor(p.id / 1000);
        if (originalTeamId !== t.id || t.id === selectedTeam.id) {
          customPlayerConfigs[p.id] = { teamId: t.id, salary: p.salary, contractYears: p.contractYears };
        }
      });
    });

    return {
      teamId: selectedTeam.id,
      playerStates,
      playerStats,
      playerHistory,
      tactics,
      matchHistory,
      currentDate: currentDate.toISOString(),
      balance,
      monthlyIncome,
      standings,
      news,
      calendarMatches: calendarMatches.map((m) => ({
        ...m,
        date: m.date.toISOString(),
      })),
      season,
      seasonFinished,
      clubTrophies,
      teamLeagues,
      customPlayerConfigs,
      facilities,
      myStaff,
      availableStaff,
      individualPlans,
      savedAt: new Date().toISOString(),
      uclTeams,
      uclFixtures,
      uclStandings,
      uclStage,
      userInUCL,
    };
  }, [
    selectedTeam,
    playerStates,
    tactics,
    matchHistory,
    currentDate,
    balance,
    monthlyIncome,
    standings,
    news,
    calendarMatches,
    season,
    seasonFinished,
    allTeams,
    facilities,
    myStaff,
    availableStaff,
    uclTeams,
    uclFixtures,
    uclStandings,
    uclStage,
    userInUCL
  ]);

  const restoreFromSave = useCallback((team: Team, data: any) => {
    setSelectedTeamRaw(team);
    setBalance(data.balance ?? team.balance);
    setMonthlyIncome(data.monthlyIncome ?? team.monthlyIncome);
    if (data.myStaff) setMyStaff(data.myStaff);
    if (data.availableStaff) setAvailableStaff(data.availableStaff);
    if (data.individualPlans) setIndividualPlans(data.individualPlans);
    else setIndividualPlans({});
    setCurrentDate(
      data.currentDate ? new Date(data.currentDate) : getSeasonStartDate(),
    );
    setMatchHistory(data.matchHistory ?? []);
    setNews(data.news ?? []);
    if (data.playerStats) {
      setPlayerStats(data.playerStats);
    } else {
      setPlayerStats({});
    }
    if (data.playerHistory) {
      setPlayerHistory(data.playerHistory);
    } else {
      setPlayerHistory({});
    }
    setSeasonFinished(data.seasonFinished ?? false);
    if (data.clubTrophies) {
      setClubTrophies(data.clubTrophies);
    } else {
      setClubTrophies({});
    }

    if (data.uclTeams) setUclTeams(data.uclTeams);
    if (data.uclFixtures) setUclFixtures(data.uclFixtures);
    if (data.uclStandings) setUclStandings(data.uclStandings);
    if (data.uclStage) setUclStage(data.uclStage);
    if (data.userInUCL !== undefined) setUserInUCL(data.userInUCL);
    else setUserInUCL(false);

    setFacilities(
      data.facilities ?? {
        stadium: 1,
        trainingCenter: 1,
        medicalCenter: 1,
        youthAcademy: 1,
        scoutingNetwork: 1,
      },
    );

    if (data.teamLeagues) {
      Object.keys(data.teamLeagues).forEach((idStr) => {
        const id = parseInt(idStr);
        const t = allTeams.find((x) => x.id === id);
        if (t) t.leagueId = data.teamLeagues[idStr];
      });
    }

    if (data.customPlayerConfigs) {
      const allPlayers = allTeams.flatMap(t => t.players);
      Object.keys(data.customPlayerConfigs).forEach((playerIdStr) => {
        const pid = parseInt(playerIdStr);
        const config = data.customPlayerConfigs[pid];
        const player = allPlayers.find(p => p.id === pid);
        if (player) {
          player.salary = config.salary;
          player.contractYears = config.contractYears;
          const currentTeam = allTeams.find(t => t.players.some(p => p.id === pid));
          if (currentTeam && currentTeam.id !== config.teamId) {
            currentTeam.players = currentTeam.players.filter(p => p.id !== pid);
            const newTeam = allTeams.find(t => t.id === config.teamId);
            if (newTeam) newTeam.players.push(player);
          }
        }
      });
      // Ensure selectedTeam reflects the updated players reference
      if (team) {
        const updatedTeam = allTeams.find(t => t.id === team.id);
        if (updatedTeam) team.players = updatedTeam.players;
      }
    }

    if (data.news && data.news.length > 0) {
      let maxId = 0;
      data.news.forEach((n: any) => {
        if (n.id > maxId) maxId = n.id;
      });
      setNewsCounter(maxId);
    } else {
      setNewsCounter(0);
    }

    if (data.tactics) setTactics(data.tactics);
    if (data.standings) {
      const savedTeams = new Set(data.standings.map((s: any) => s.teamId));
      const missingStandings = initStandings.filter(
        (s) => !savedTeams.has(s.teamId),
      );
      setStandings([...data.standings, ...missingStandings]);
    } else {
      setStandings(initStandings);
    }
    if (data.calendarMatches) {
      const leaguesIds = Array.from(new Set(allTeams.map((t) => t.leagueId)));
      const lComps = leaguesIds.map((lid) => ({
        competitionId: lid,
        teamIds: allTeams.filter((t) => t.leagueId === lid).map((t) => t.id),
        matchDays: COMPETITION_DAYS['league'] || ['saturday', 'sunday'],
        startDate: getSeasonStartDate(),
        weekInterval: 1
      }));
      const freshCalendar = generateCalendar(lComps);
      const savedMap = new Map(
        data.calendarMatches.map((m: any) => [
          `${m.homeId}-${m.awayId}-${m.round}`,
          m,
        ]),
      );
      setCalendarMatches(
        freshCalendar.map((m) => {
          const k = `${m.homeId}-${m.awayId}-${m.round}`;
          if (savedMap.has(k)) {
            const s = savedMap.get(k);
            return {
              ...m,
              played: s.played,
              homeGoals: s.homeGoals,
              awayGoals: s.awayGoals,
              date: new Date(s.date),
            };
          }
          return m;
        }),
      );
    } else {
      const leaguesIds = Array.from(new Set(allTeams.map((t) => t.leagueId)));
      const lComps = leaguesIds.map((lid) => ({
        competitionId: lid,
        teamIds: allTeams.filter((t) => t.leagueId === lid).map((t) => t.id),
        matchDays: COMPETITION_DAYS['league'] || ['saturday', 'sunday'],
        startDate: getSeasonStartDate(),
        weekInterval: 1
      }));
      setCalendarMatches(generateCalendar(lComps));
    }
    const initial: Record<number, PlayerState> = {};
    team.players.forEach((p: Player) => {
      initial[p.id] = data.playerStates?.[p.id] ?? {
        fatigue: 100,
        morale: p.morale,
        happiness: p.happiness,
        injuryWeeks: 0,
      };
    });
    setPlayerStates(initial);
  }, []);

  return (
    <GameContext.Provider
      value={{
        selectedTeam,
        setSelectedTeam,
        playerStates,
        playerStats,
        playerHistory,
        recordMatchPlayerStats,
        applyFatigueDrops,
        tactics,
        setTactics,
        matchHistory,
        addMatchRecord,
        currentDate,
        currentDayName,
        currentDateStr,
        calendarMatches,
        todayMatch,
        nextMatch,
        daysUntilNextMatch,
        currentRound,
        advanceDay,
        markMatchPlayed,
        todayTraining,
        setTodayTraining,
        autoSuggestTraining,
        balance,
        monthlyIncome,
        wageBill,
        addFunds,
        deductFunds,
        uclTeams,
        uclFixtures,
        uclStandings,
        uclStage,
        userInUCL,
        standings,
        schedule,
        recordLeagueResult,
        cupMatches,
        news,
        addNews: pushNews,
        pendingContracts,
        proposeContract,
        resolveContract,
        pendingTransfers,
        proposeTransfer,
        resolveTransfer,
        completeInteractiveTransfer,
        season,
        seasonFinished,
        advanceSeason,
        restoreFromSave,
        buildSaveData,
        facilities,
        upgradeFacility,
        myStaff,
        availableStaff,
        hireStaff,
        fireStaff,
        isSimulating,
        setIsSimulating,
        playPlayerMatchSimulated,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
