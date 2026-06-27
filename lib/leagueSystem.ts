import type { Team } from './teams';
import { LEAGUES } from './teams';

// ─── TABELA ───────────────────────────────────────────────────────────────────

export interface StandingRow {
  teamId: number;
  teamName: string;
  teamAbbr: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: ('W'|'D'|'L')[];   // últimos 5
  attendance: number;
  homeGames: number;
  yellowCards: number;
  redCards: number;
  assists: number;
}

export interface ScheduledMatch {
  round: number;
  homeId: number;
  awayId: number;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
}

// ─── GERAÇÃO DO CAMPEONATO ────────────────────────────────────────────────────

// Valores aproximados em milhares (K)
export function getPrizeMoney(leagueId: string, position: number): number {
  const l = LEAGUES[leagueId];
  if (!l) return 0;
  
  let baseMultiplier = 1;
  switch(l.country) {
      case "ENG": baseMultiplier = 4.0; break;
      case "ESP": 
      case "GER": 
      case "ITA": baseMultiplier = 3.0; break;
      case "FRA": baseMultiplier = 2.5; break;
      case "BR": baseMultiplier = 1.0; break;      
      case "ARG": baseMultiplier = 0.8; break;
      default: baseMultiplier = 0.5; break;
  }

  let divMultiplier = 1;
  switch(l.division) {
      case 1: divMultiplier = 1.0; break;
      case 2: divMultiplier = 0.3; break;
      case 3: divMultiplier = 0.1; break;
      case 4: divMultiplier = 0.05; break;
  }

  const positionRates = [
    0.15, 0.13, 0.11, 0.09, 0.08, 0.07, 0.06, 0.05, 0.045, 0.04,
    0.035, 0.03, 0.025, 0.02, 0.015, 0.01, 0.005, 0.005, 0.005, 0.005,
    0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005
  ];

  const rate = positionRates[position - 1] || 0.005;
  const totalPool = 150000 * baseMultiplier * divMultiplier;
  
  return Math.floor(totalPool * rate);
}

export function generateLeague(teams: Team[]): {
  standings: StandingRow[];
  schedule: ScheduledMatch[];
} {
  const n = teams.length; // 20

  // Algoritmo round-robin: gera turno completo (n-1 rodadas)
  const ids = teams.map(t => t.id);
  let schedule: ScheduledMatch[] = [];

  // Turno
  const firstHalf: ScheduledMatch[] = [];
  const ids2 = [...ids];
  const fixed = ids2.shift()!;

  for (let round = 0; round < n - 1; round++) {
    const home = round % 2 === 0 ? [fixed, ...ids2] : [...ids2, fixed];
    const mid = Math.floor(n / 2);
    for (let i = 0; i < mid; i++) {
      firstHalf.push({
        round: round + 1,
        homeId: home[i],
        awayId: home[n - 1 - i],
        played: false,
      });
    }
    // Rotação
    ids2.push(ids2.shift()!);
  }

  // Returno (invertido)
  const secondHalf = firstHalf.map(m => ({
    ...m,
    round: m.round + (n - 1),
    homeId: m.awayId,
    awayId: m.homeId,
  }));

  schedule = firstHalf.concat(secondHalf);

  // Tabela inicial zerada
  const standings: StandingRow[] = teams.map(t => ({
    teamId: t.id,
    teamName: t.name,
    teamAbbr: t.abbreviation,
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0,
    points: 0, form: [],
    attendance: 0, homeGames: 0,
    yellowCards: 0, redCards: 0, assists: 0,
  }));

  return { standings, schedule };
}

// ─── ATUALIZAR TABELA APÓS RESULTADO ─────────────────────────────────────────

export function updateStandings(
  standings: StandingRow[],
  homeId: number,
  awayId: number,
  homeGoals: number,
  awayGoals: number,
  homeStats?: { yellow: number; red: number; assists: number; attendance?: number },
  awayStats?: { yellow: number; red: number; assists: number }
): StandingRow[] {
  return standings.map(row => {
    if (row.teamId !== homeId && row.teamId !== awayId) return row;

    const isHome = row.teamId === homeId;
    const gf = isHome ? homeGoals : awayGoals;
    const ga = isHome ? awayGoals : homeGoals;
    const won = gf > ga;
    const drawn = gf === ga;

    const result: 'W'|'D'|'L' = won ? 'W' : drawn ? 'D' : 'L';
    const form = [result, ...row.form].slice(0, 5) as ('W'|'D'|'L')[];

    let newYellow = row.yellowCards;
    let newRed = row.redCards;
    let newAssists = row.assists;
    let newAttendance = row.attendance;
    let newHomeGames = row.homeGames;

    if (isHome) {
      newYellow += homeStats ? homeStats.yellow : 0;
      newRed += homeStats ? homeStats.red : 0;
      newAssists += homeStats ? homeStats.assists : Math.floor(homeGoals * 0.8);
      let tAtt = homeStats?.attendance ? homeStats.attendance : (Math.floor(15000 + Math.random() * 30000));
      newAttendance += tAtt;
      newHomeGames += 1;
    } else {
      newYellow += awayStats ? awayStats.yellow : 0;
      newRed += awayStats ? awayStats.red : 0;
      newAssists += awayStats ? awayStats.assists : Math.floor(awayGoals * 0.8);
    }

    return {
      ...row,
      played: row.played + 1,
      won: row.won + (won ? 1 : 0),
      drawn: row.drawn + (drawn ? 1 : 0),
      lost: row.lost + (!won && !drawn ? 1 : 0),
      goalsFor: row.goalsFor + gf,
      goalsAgainst: row.goalsAgainst + ga,
      points: row.points + (won ? 3 : drawn ? 1 : 0),
      form,
      yellowCards: newYellow,
      redCards: newRed,
      assists: newAssists,
      attendance: newAttendance,
      homeGames: newHomeGames,
    };
  });
}

// ─── ORDENAÇÃO DA TABELA (critérios brasileiros) ──────────────────────────────
// 1º Pontos  2º Vitórias  3º Saldo de gols  4º Gols pró  5º Nome (sorteio)

export function sortStandings(standings: StandingRow[]): StandingRow[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won   !== a.won)   return b.won   - a.won;
    const gdB = b.goalsFor - b.goalsAgainst;
    const gdA = a.goalsFor - a.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName); // sorteio simulado por ordem alfabética
  });
}

// ─── REBAIXAMENTO E PROMOÇÃO ────────────────────────────────────────────────
export function processPromotionsRelegations(standings: StandingRow[], allTeams: Team[]) {
  const promotions: {teamId: number, from: string, to: string}[] = [];
  const relegations: {teamId: number, from: string, to: string}[] = [];

  // Group standings by league
  const leagueStandings: Record<string, StandingRow[]> = {};
  standings.forEach(s => {
    const t = allTeams.find(x => x?.id === s.teamId);
    if (!t) return;
    if (!leagueStandings[t.leagueId]) leagueStandings[t.leagueId] = [];
    leagueStandings[t.leagueId].push(s);
  });

  // Sort each league
  Object.keys(leagueStandings).forEach(lid => {
    leagueStandings[lid] = sortStandings(leagueStandings[lid]);
  });

  const countries = Array.from(new Set(Object.keys(leagueStandings).map(lid => LEAGUES[lid]?.country).filter(Boolean)));

  countries.forEach(countryId => {
    const countryLeagues = Object.entries(LEAGUES)
      .filter(([id, l]) => l.country === countryId)
      .sort((a, b) => a[1].division - b[1].division);

    for (let i = 0; i < countryLeagues.length - 1; i++) {
      const currentDivId = countryLeagues[i][0];
      const lowerDivId = countryLeagues[i + 1][0];

      const currentSt = leagueStandings[currentDivId] || [];
      const lowerSt = leagueStandings[lowerDivId] || [];
      if (currentSt.length === 0 || lowerSt.length === 0) continue;

      let slots = 3;
      if (countryId === 'BR') slots = 4;
      if (countryId === 'ARG') slots = 2; // ARG has fewer promo slots generally but 2 is fine

      // Simulate playoffs if not Brazil and not ARG
      const usesPlayoffs = (countryId !== 'BR' && countryId !== 'ARG');
      
      const promoteTeamIds: number[] = [];
      const dropTeamIds: number[] = [];

      // Teams that drop
      for (let x = currentSt.length - 1; x >= currentSt.length - slots; x--) {
        if (currentSt[x]) dropTeamIds.push(currentSt[x].teamId);
      }

      // Teams that promote
      if (usesPlayoffs) {
        // Direct promo for first N-1 teams
        for (let x = 0; x < slots - 1; x++) {
          if (lowerSt[x]) promoteTeamIds.push(lowerSt[x].teamId);
        }
        // Playoff between teams ranked (slots) to (slots + 3)
        const playoffCandidates = [];
        for (let x = slots - 1; x < slots + 3; x++) {
          if (lowerSt[x]) playoffCandidates.push(lowerSt[x]);
        }
        if (playoffCandidates.length > 0) {
          // just pick one, biased towards higher rank
          const r = Math.random();
          let pIdx = 0;
          if (r > 0.4) pIdx = 1;
          if (r > 0.7) pIdx = 2;
          if (r > 0.9) pIdx = 3;
          pIdx = Math.min(pIdx, playoffCandidates.length - 1);
          promoteTeamIds.push(playoffCandidates[pIdx].teamId);
        }
      } else {
        // Direct promo
        for (let x = 0; x < slots; x++) {
          if (lowerSt[x]) promoteTeamIds.push(lowerSt[x].teamId);
        }
      }

      // Apply
      promoteTeamIds.forEach(id => {
        promotions.push({teamId: id, from: lowerDivId, to: currentDivId});
        const team = allTeams.find(t => t.id === id);
        if (team) team.leagueId = currentDivId;
      });
      dropTeamIds.forEach(id => {
        relegations.push({teamId: id, from: currentDivId, to: lowerDivId});
        const team = allTeams.find(t => t.id === id);
        if (team) team.leagueId = lowerDivId;
      });
    }
  });

  return { promotions, relegations };
}

// ─── COPA NACIONAL (mata-mata 16 times) ──────────────────────────────────────

export interface CupMatch {
  id: string;
  round: string; // 'R64', 'R32', 'R16', 'QF', 'SF', 'F'
  homeId: number;
  awayId: number;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
  winnerId?: number;
  country?: string;
}

export function generateCup(teams: Team[]): CupMatch[] {
  // Determine closest lower power of 2 up to 64
  let count = 1;
  while (count * 2 <= teams.length && count * 2 <= 64) {
    count *= 2;
  }
  
  if (count < 2) return [];

  // Seleciona 'count' times aleatoriamente (ou pode ser classificados por nível)
  const shuffled = [...teams].sort(() => Math.random() - 0.5).slice(0, count);
  const matches: CupMatch[] = [];

  const roundName = count === 64 ? 'R64' : count === 32 ? 'R32' : count === 16 ? 'R16' : count === 8 ? 'QF' : count === 4 ? 'SF' : 'F';

  // We assign a country to the cup matches if they all belong to one country
  const country = teams.length > 0 && teams[0].leagueId ? LEAGUES[teams[0].leagueId]?.country : undefined;

  for (let i = 0; i < count / 2; i++) {
    matches.push({
      id: `${roundName}-${i}`,
      round: roundName,
      homeId: shuffled[i * 2].id,
      awayId: shuffled[i * 2 + 1].id,
      played: false,
      country
    });
  }
  return matches;
}
