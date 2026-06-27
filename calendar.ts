// ─── SISTEMA DE CALENDÁRIO CONTÍNUO ──────────────────────────────────────────
// Temporada 2026: Brasileirão 38 rodadas
// Jogos sempre em: Terça (2), Quarta (3) ou Domingo (0)
// O tempo avança dia a dia de forma contínua

export type MatchDay = 'tuesday' | 'wednesday' | 'sunday';

export interface CalendarMatch {
  round: number;
  date: Date;
  day: MatchDay;
  homeId: number;
  awayId: number;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
}

// Temporada começa na segunda-feira 06/Abr/2026
// Rd 1: jogo na Terça 07/Abr
const SEASON_START = new Date(2026, 3, 6); // 06/Abr/2026 (Segunda)

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDate(date: Date): string {
  return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

export function getSeasonStartDate(): Date {
  return new Date(SEASON_START);
}

// Retorna a data de jogo de uma rodada dado o dia escolhido
// Rd 1 começa na semana do 06/Abr
// Cada rodada é exatamente 1 semana depois
function getRoundMatchDate(round: number, day: MatchDay): Date {
  const weekStart = addDays(SEASON_START, (round - 1) * 7);
  const offsets: Record<MatchDay, number> = { tuesday: 1, wednesday: 2, sunday: 6 };
  return addDays(weekStart, offsets[day]);
}

// ─── GERAÇÃO DO CALENDÁRIO ────────────────────────────────────────────────────

export function generateCalendar(teamIds: number[]): CalendarMatch[] {
  const n = teamIds.length;
  const matches: CalendarMatch[] = [];

  const ids = [...teamIds];
  const fixed = ids.shift()!;
  const rotating = [...ids];

  const roundPairsList: Array<Array<[number,number]>> = [];

  for (let round = 0; round < n - 1; round++) {
    const pairs: Array<[number,number]> = [];
    const circle = [fixed, ...rotating];
    const mid = n / 2;
    for (let i = 0; i < mid; i++) {
      pairs.push(round % 2 === 0
        ? [circle[i], circle[n - 1 - i]]
        : [circle[n - 1 - i], circle[i]]
      );
    }
    roundPairsList.push(pairs);
    rotating.push(rotating.shift()!);
  }

  const firstHalf = [...roundPairsList];
  const secondHalf = firstHalf.map(pairs => pairs.map(([h,a]) => [a,h] as [number,number]));
  const allRounds = [...firstHalf, ...secondHalf];

  // Contagem de dias por time para balancear
  const teamDayCount: Record<number, Record<MatchDay,number>> = {};
  teamIds.forEach(id => { teamDayCount[id] = { tuesday:0, wednesday:0, sunday:0 }; });

  const DAYS: MatchDay[] = ['tuesday','wednesday','sunday'];
  const SLOTS: Record<MatchDay,number> = { tuesday:3, wednesday:4, sunday:3 };

  allRounds.forEach((pairs, roundIdx) => {
    const round = roundIdx + 1;
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    const slotsLeft = { ...SLOTS };

    shuffled.forEach(([homeId, awayId]) => {
      const scoredDays = DAYS
        .filter(d => slotsLeft[d] > 0)
        .map(d => ({
          day: d,
          score: (teamDayCount[homeId]?.[d] ?? 0) + (teamDayCount[awayId]?.[d] ?? 0),
        }))
        .sort((a,b) => a.score - b.score);

      const chosen = scoredDays[0]?.day ?? 'wednesday';
      slotsLeft[chosen]--;
      teamDayCount[homeId][chosen]++;
      teamDayCount[awayId][chosen]++;

      matches.push({
        round,
        date: getRoundMatchDate(round, chosen),
        day: chosen,
        homeId,
        awayId,
        played: false,
      });
    });
  });

  // Ordena por data
  matches.sort((a,b) => a.date.getTime() - b.date.getTime());
  return matches;
}

// ─── QUERIES DO CALENDÁRIO ────────────────────────────────────────────────────

export function getMatchOnDate(calendar: CalendarMatch[], date: Date, teamId: number): CalendarMatch | null {
  return calendar.find(m =>
    isSameDay(m.date, date) &&
    (m.homeId === teamId || m.awayId === teamId) &&
    !m.played
  ) ?? null;
}

export function getNextMatch(calendar: CalendarMatch[], teamId: number, fromDate: Date): CalendarMatch | null {
  return calendar
    .filter(m => !m.played && (m.homeId === teamId || m.awayId === teamId) && m.date >= fromDate)
    .sort((a,b) => a.date.getTime() - b.date.getTime())[0] ?? null;
}

export function getDaysUntilMatch(current: Date, matchDate: Date): number {
  const diff = matchDate.getTime() - current.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── NOME DO DIA ──────────────────────────────────────────────────────────────

const DAY_NAMES_PT = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
export function getDayName(date: Date): string {
  return DAY_NAMES_PT[date.getDay()];
}

// ─── SUGESTÃO AUTO ────────────────────────────────────────────────────────────

import type { TrainingFocus } from '@/contexts/GameContext';

export function autoSuggestDay(
  daysUntilMatch: number,
  avgFatigue: number,
  weakest: TrainingFocus
): TrainingFocus {
  if (avgFatigue < 55) return 'recovery';
  if (daysUntilMatch === 1) return 'tactical';    // véspera → tático
  if (daysUntilMatch === 2) return 'setpieces';   // 2 dias antes → bola parada
  if (daysUntilMatch >= 5) return weakest;        // longe → desenvolve fraqueza
  return 'physical';                              // padrão → físico
}
