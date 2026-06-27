// ─── SISTEMA DE CALENDÁRIO CONTÍNUO ──────────────────────────────────────────
// Temporada 2026: Brasileirão 38 rodadas
// Jogos sempre em: Terça (2), Quarta (3) ou Domingo (0)
// O tempo avança dia a dia de forma contínua

export type MatchDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface CalendarMatch {
  round: number;
  competitionId: string;
  date: Date;
  day: MatchDay;
  homeId: number;
  awayId: number;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
}

export const COMPETITION_DAYS: Record<string, MatchDay[]> = {
  'league':     ['saturday', 'sunday'],
  'champions':  ['tuesday', 'wednesday'],
  'cup':        ['tuesday', 'wednesday'],
  'friendly':   ['wednesday'],
};

// Temporada começa na segunda-feira 06/Abr/2026
// Rd 1: jogo na Terça 07/Abr
const SEASON_START = new Date(2026, 3, 6); // 06/Abr/2026 (Segunda)

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

import { loadSettings } from "./saveSystem";

export function formatDate(date: Date): string {
  const settings = loadSettings();
  const d = String(date.getDate()).padStart(2,'0');
  const m = String(date.getMonth()+1).padStart(2,'0');
  if (settings.dateFormat === 'mm/dd') return `${m}/${d}`;
  return `${d}/${m}`;
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
function getRoundMatchDate(round: number, day: MatchDay, startDate: Date, weekInterval: number): Date {
  const weekStart = addDays(startDate, (round - 1) * 7 * weekInterval);
  const offsets: Record<MatchDay, number> = { 
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 
  };
  return addDays(weekStart, offsets[day as string] || 0);
}

// ─── GERAÇÃO DO CALENDÁRIO ────────────────────────────────────────────────────

export function generateCalendar(competitions: Array<{
  competitionId: string;
  teamIds: number[];
  matchDays: MatchDay[];
  startDate: Date;
  weekInterval: number;
}>): CalendarMatch[] {
  let allMatches: CalendarMatch[] = [];

  for (const comp of competitions) {
    const { competitionId, teamIds, matchDays, startDate, weekInterval } = comp;
    let teamIdsToUse = [...teamIds];
    if (teamIdsToUse.length % 2 !== 0) {
      teamIdsToUse.push(-1); // dummy BYE team
    }
    const n = teamIdsToUse.length;
    const ids = [...teamIdsToUse];
    const fixed = ids.shift()!;
    const rotating = [...ids];
    const roundPairsList: Array<Array<[number,number]>> = [];

    for (let round = 0; round < n - 1; round++) {
      const pairs: Array<[number,number]> = [];
      const circle = [fixed, ...rotating];
      const mid = n / 2;
      for (let i = 0; i < mid; i++) {
        const home = circle[i];
        const away = circle[n - 1 - i];
        if (home !== -1 && away !== -1) {
          pairs.push(round % 2 === 0 ? [home, away] : [away, home]);
        }
      }
      roundPairsList.push(pairs);
      rotating.push(rotating.shift()!);
    }

    const firstHalf = [...roundPairsList];
    const secondHalf = firstHalf.map(pairs => pairs.map(([h,a]) => [a,h] as [number,number]));
    const allRounds = [...firstHalf, ...secondHalf];

    allRounds.forEach((pairs, roundIdx) => {
      const round = roundIdx + 1;
      const shuffled = [...pairs].sort(() => Math.random() - 0.5);
      
      shuffled.forEach(([homeId, awayId], i) => {
        const slotsIndex = i % Math.max(1, matchDays.length);
        const chosen = matchDays[slotsIndex] || matchDays[0];
        // Ensure some variety
        
        allMatches.push({
          round,
          competitionId,
          date: getRoundMatchDate(round, chosen, startDate, weekInterval),
          day: chosen,
          homeId,
          awayId,
          played: false
        });
      });
    });
  }

  // Ordena por data
  allMatches.sort((a,b) => a.date.getTime() - b.date.getTime());
  return allMatches;
}

// ─── QUERIES DO CALENDÁRIO ────────────────────────────────────────────────────

export function getMatchOnDate(calendar: CalendarMatch[], date: Date, teamId: number, competitionId?: string): CalendarMatch | null {
  return calendar.find(m =>
    isSameDay(m.date, date) &&
    (m.homeId === teamId || m.awayId === teamId) &&
    (competitionId === undefined || m.competitionId === competitionId) &&
    !m.played
  ) ?? null;
}

export function getNextMatch(calendar: CalendarMatch[], teamId: number, fromDate: Date, competitionId?: string): CalendarMatch | null {
  return calendar
    .filter(m => 
      !m.played && 
      (m.homeId === teamId || m.awayId === teamId) && 
      m.date >= fromDate &&
      (competitionId === undefined || m.competitionId === competitionId)
    )
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
