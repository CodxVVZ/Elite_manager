import { Player } from "./teams";

export const IDEAL_SQUAD: Record<string, { min: number; max: number; ideal: number }> = {
  GK:  { min: 2, max: 3,  ideal: 2 },
  CB:  { min: 3, max: 5,  ideal: 4 },
  LB:  { min: 1, max: 4,  ideal: 2 },
  RB:  { min: 1, max: 4,  ideal: 2 },
  CDM: { min: 1, max: 4,  ideal: 2 },
  CM:  { min: 2, max: 5,  ideal: 3 },
  CAM: { min: 1, max: 4,  ideal: 2 },
  LM:  { min: 1, max: 4,  ideal: 2 },
  RM:  { min: 1, max: 4,  ideal: 2 },
  LW:  { min: 0, max: 4,  ideal: 2 },
  RW:  { min: 0, max: 4,  ideal: 2 },
  ST:  { min: 1, max: 4,  ideal: 2 },
};

export const POSITION_COVERS: Record<string, string[]> = {
  LW:  ['LM', 'CAM'],
  RW:  ['RM', 'CAM'],
  LM:  ['LW', 'CAM'],
  RM:  ['RW', 'CAM'],
  CAM: ['CM', 'LM', 'RM'],
  CDM: ['CM', 'CB'],
  ST:  ['CAM', 'LW', 'RW'],
};

export const SQUAD_SIZE_MIN = 18;
export const SQUAD_SIZE_MAX = 30;
export const SQUAD_SIZE_IDEAL = 25;

export type IssueType =
  | 'EXCESS_POSITION'
  | 'MISSING_POSITION'
  | 'SHORTAGE_POSITION'
  | 'SQUAD_TOO_LARGE'
  | 'SQUAD_TOO_SMALL'
  | 'NO_CLEAR_STARTER'
  | 'AGE_IMBALANCE'
  | 'ATTACK_VOID';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface SquadIssue {
  type: IssueType;
  severity: IssueSeverity;
  position?: string;
  current: number;
  expected: number;
  affectedPlayerIds?: number[];
  message: string;
  suggestion: string;
}

export interface SquadDiagnosis {
  clubId: number;
  analysisDay: number;
  totalPlayers: number;
  issues: SquadIssue[];
  overallHealth: 'healthy' | 'warning' | 'critical';
  priorityActions: string[];
}

function checkSquadSize(squad: Player[], issues: SquadIssue[]): void {
  const total = squad.length;

  if (total > SQUAD_SIZE_MAX) {
    issues.push({
      type: 'SQUAD_TOO_LARGE',
      severity: 'warning',
      current: total,
      expected: SQUAD_SIZE_IDEAL,
      message: `Elenco com ${total} jogadores — acima do ideal de ${SQUAD_SIZE_IDEAL}.`,
      suggestion: `Venda ou empreste ${total - SQUAD_SIZE_IDEAL} jogadores para equilibrar o elenco.`,
    });
  }

  if (total < SQUAD_SIZE_MIN) {
    issues.push({
      type: 'SQUAD_TOO_SMALL',
      severity: 'critical',
      current: total,
      expected: SQUAD_SIZE_MIN,
      message: `Elenco com apenas ${total} jogadores — insuficiente para uma temporada completa.`,
      suggestion: `Contrate pelo menos ${SQUAD_SIZE_MIN - total} jogadores para completar o elenco.`,
    });
  }
}

function checkPosition(squad: Player[], position: string, issues: SquadIssue[]): void {
  const ref = IDEAL_SQUAD[position];
  const direct = squad.filter(p => p.position === position);
  const covers = POSITION_COVERS[position] ?? [];
  const functional = squad.filter(p => covers.includes(p.position));
  const effective = direct.length + (functional.length > 0 ? 1 : 0);

  if (direct.length > ref.max) {
    issues.push({
      type: 'EXCESS_POSITION',
      severity: direct.length > ref.max + 2 ? 'warning' : 'info',
      position,
      current: direct.length,
      expected: ref.ideal,
      affectedPlayerIds: direct
        .sort((a, b) => a.overall - b.overall)
        .slice(0, direct.length - ref.ideal)
        .map(p => p.id),
      message: `${direct.length} jogadores na posição ${position} (ideal: ${ref.ideal}, máximo: ${ref.max}).`,
      suggestion: `Empreste ou venda ${direct.length - ref.ideal} ${position}(s) para equilibrar o elenco.`,
    });
  }

  if (direct.length === 0 && effective === 0 && ref.min > 0) {
    issues.push({
      type: 'MISSING_POSITION',
      severity: 'critical',
      position,
      current: 0,
      expected: ref.min,
      message: `Nenhum jogador na posição ${position} — posição completamente descoberta!`,
      suggestion: `Contrate ao menos ${ref.min} jogador(es) para a posição ${position} com urgência.`,
    });
  }

  if (direct.length > 0 && direct.length < ref.min) {
    issues.push({
      type: 'SHORTAGE_POSITION',
      severity: 'warning',
      position,
      current: direct.length,
      expected: ref.min,
      message: `Apenas ${direct.length} jogador(es) na posição ${position} (mínimo recomendado: ${ref.min}).`,
      suggestion: `Contrate mais ${ref.min - direct.length} jogador(es) para a posição ${position}.`,
    });
  }
}

function checkAttackVoid(squad: Player[], issues: SquadIssue[]): void {
  const offensivePositions = ['ST', 'LW', 'RW', 'CAM'];
  const offensivePlayers = squad.filter(p => offensivePositions.includes(p.position));
  const strikers = squad.filter(p => p.position === 'ST');

  if (offensivePlayers.length === 0) {
    issues.push({
      type: 'ATTACK_VOID',
      severity: 'critical',
      current: 0,
      expected: 3,
      message: `Elenco sem NENHUM jogador ofensivo (ST, LW, RW ou CAM)! O time não consegue atacar.`,
      suggestion: `Contrate urgentemente pelo menos 1 ST e 1 CAM ou extremo para ter opções ofensivas.`,
    });
    return;
  }

  if (strikers.length === 0 && offensivePlayers.length < 2) {
    issues.push({
      type: 'ATTACK_VOID',
      severity: 'critical',
      current: offensivePlayers.length,
      expected: 3,
      message: `Elenco sem centroavante (ST) e com apenas ${offensivePlayers.length} jogador ofensivo. Ataque extremamente limitado.`,
      suggestion: `Contrate ao menos 1 ST — o time precisa de um referencial ofensivo na área.`,
    });
  }
}

function checkAgeBalance(squad: Player[], issues: SquadIssue[]): void {
  if (squad.length === 0) return;
  const avgAge = squad.reduce((sum, p) => sum + p.age, 0) / squad.length;
  const over30 = squad.filter(p => p.age >= 30).length;

  if (avgAge > 29) {
    issues.push({
      type: 'AGE_IMBALANCE',
      severity: 'warning',
      current: Math.round(avgAge),
      expected: 26,
      message: `Elenco envelhecido — média de ${avgAge.toFixed(1)} anos (${over30} jogadores acima de 30).`,
      suggestion: `Invista em jogadores jovens (< 24 anos) para renovar o elenco gradualmente.`,
    });
  }

  if (avgAge < 22) {
    issues.push({
      type: 'AGE_IMBALANCE',
      severity: 'info',
      current: Math.round(avgAge),
      expected: 26,
      message: `Elenco muito jovem — média de ${avgAge.toFixed(1)} anos. Alta variabilidade de desempenho.`,
      suggestion: `Contrate 1–2 jogadores veteranos (28–32 anos) como líderes e referência.`,
    });
  }
}

function checkStarterQuality(squad: Player[], issues: SquadIssue[]): void {
  const STARTER_OVR_THRESHOLD = 65;

  for (const position of Object.keys(IDEAL_SQUAD)) {
    const posPlayers = squad.filter(p => p.position === position);
    if (posPlayers.length === 0) continue;

    const best = Math.max(...posPlayers.map(p => p.overall));
    if (best < STARTER_OVR_THRESHOLD) {
      issues.push({
        type: 'NO_CLEAR_STARTER',
        severity: 'warning',
        position,
        current: best,
        expected: STARTER_OVR_THRESHOLD,
        message: `Melhor ${position} do elenco tem apenas OVR ${best} — abaixo do nível competitivo.`,
        suggestion: `Contrate um ${position} com OVR >= ${STARTER_OVR_THRESHOLD} para ser titular.`,
      });
    }
  }
}

export function analyzeSquad(players: Player[], clubId: number, currentDay: number): SquadDiagnosis {
  const issues: SquadIssue[] = [];

  checkSquadSize(players, issues);

  for (const position of Object.keys(IDEAL_SQUAD)) {
    checkPosition(players, position, issues);
  }

  checkAttackVoid(players, issues);
  checkAgeBalance(players, issues);
  checkStarterQuality(players, issues);

  issues.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const overallHealth = issues.some(i => i.severity === 'critical')
    ? 'critical'
    : issues.some(i => i.severity === 'warning')
    ? 'warning'
    : 'healthy';

  const priorityActions = issues
    .filter(i => i.severity !== 'info')
    .map(i => i.suggestion)
    .slice(0, 5);

  return {
    clubId,
    analysisDay: currentDay,
    totalPlayers: players.length,
    issues,
    overallHealth,
    priorityActions,
  };
}
