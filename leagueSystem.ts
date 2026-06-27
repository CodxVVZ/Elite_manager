import type { Team } from './teams';

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

export function generateLeague(teams: Team[]): {
  standings: StandingRow[];
  schedule: ScheduledMatch[];
} {
  const n = teams.length; // 20

  // Algoritmo round-robin: gera turno completo (n-1 rodadas)
  const ids = teams.map(t => t.id);
  const schedule: ScheduledMatch[] = [];

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

  schedule.push(...firstHalf, ...secondHalf);

  // Tabela inicial zerada
  const standings: StandingRow[] = teams.map(t => ({
    teamId: t.id,
    teamName: t.name,
    teamAbbr: t.abbreviation,
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0,
    points: 0, form: [],
  }));

  return { standings, schedule };
}

// ─── ATUALIZAR TABELA APÓS RESULTADO ─────────────────────────────────────────

export function updateStandings(
  standings: StandingRow[],
  homeId: number,
  awayId: number,
  homeGoals: number,
  awayGoals: number
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

// ─── COPA NACIONAL (mata-mata 16 times) ──────────────────────────────────────

export interface CupMatch {
  id: string;
  round: 'R16' | 'QF' | 'SF' | 'F';
  homeId: number;
  awayId: number;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
  winnerId?: number;
}

export function generateCup(teams: Team[]): CupMatch[] {
  // Seleciona 16 times aleatoriamente
  const shuffled = [...teams].sort(() => Math.random() - 0.5).slice(0, 16);
  const matches: CupMatch[] = [];

  for (let i = 0; i < 8; i++) {
    matches.push({
      id: `R16-${i}`,
      round: 'R16',
      homeId: shuffled[i * 2].id,
      awayId: shuffled[i * 2 + 1].id,
      played: false,
    });
  }
  return matches;
}
