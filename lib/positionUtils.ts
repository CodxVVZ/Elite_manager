import { Player } from '@/src/types';

const POSITION_DISTANCES: Record<string, Record<string, number>> = {
  GK: { GK: 0, CB: 3, LB: 4, RB: 4, CDM: 5, CM: 6, LM: 7, RM: 7, CAM: 8, LW: 9, RW: 9, ST: 10 },
  CB: { CB: 0, LB: 1, RB: 1, CDM: 2, CM: 3, LM: 4, RM: 4, CAM: 5, LW: 6, RW: 6, ST: 7, GK: 3 },
  LB: { LB: 0, CB: 1, RB: 2, CDM: 2, CM: 3, LM: 2, RM: 4, CAM: 4, LW: 3, RW: 5, ST: 6, GK: 4 },
  RB: { RB: 0, CB: 1, LB: 2, CDM: 2, CM: 3, LM: 4, RM: 2, CAM: 4, LW: 5, RW: 3, ST: 6, GK: 4 },
  CDM: { CDM: 0, CB: 2, LB: 2, RB: 2, CM: 1, LM: 2, RM: 2, CAM: 3, LW: 3, RW: 3, ST: 4, GK: 5 },
  CM: { CM: 0, CDM: 1, CAM: 2, LM: 2, RM: 2, CB: 3, LB: 3, RB: 3, LW: 3, RW: 3, ST: 3, GK: 6 },
  LM: { LM: 0, LB: 2, CM: 2, CDM: 2, CAM: 2, LW: 2, RM: 4, CB: 4, RB: 4, RW: 4, ST: 3, GK: 7 },
  RM: { RM: 0, RB: 2, CM: 2, CDM: 2, CAM: 2, RW: 2, LM: 4, CB: 4, LB: 4, LW: 4, ST: 3, GK: 7 },
  CAM: { CAM: 0, CM: 2, LM: 2, RM: 2, LW: 2, RW: 2, ST: 2, CDM: 3, CB: 5, LB: 4, RB: 4, GK: 8 },
  LW: { LW: 0, LM: 1, CAM: 2, ST: 2, RW: 3, CM: 3, CDM: 4, LB: 3, CB: 6, RB: 5, GK: 9 },
  RW: { RW: 0, RM: 1, CAM: 2, ST: 2, LW: 3, CM: 3, CDM: 4, RB: 3, CB: 6, LB: 5, GK: 9 },
  ST: { ST: 0, LW: 2, RW: 2, CAM: 2, LM: 3, RM: 3, CM: 3, CDM: 4, CB: 7, LB: 6, RB: 6, GK: 10 },
};

export function getPositionDistance(pos1: string, pos2: string): number {
  if (pos1 === pos2) return 0;
  return POSITION_DISTANCES[pos1]?.[pos2] || 10;
}

export function getEffectiveOvr(player: Player, targetPos: string): number {
  if (player.position === targetPos) return player.overall;

  if (player.secondaryPositions && player.secondaryPositions.includes(targetPos)) {
    const dist = getPositionDistance(player.position, targetPos);
    const penalty = Math.round(dist * 0.8);
    return Math.max(player.overall - penalty, 40);
  }

  const dist = getPositionDistance(player.position, targetPos);
  const penalty = Math.min(dist * 3, 20); // max 20 penalty
  return Math.max(player.overall - penalty, 40);
}

export const POS_LABELS: Record<string, string> = {
  GK: 'GOL',
  CB: 'ZAG',
  LB: 'LE',
  RB: 'LD',
  CDM: 'VOL',
  CM: 'MEI',
  LM: 'MEI E',
  RM: 'MEI D',
  CAM: 'MEI A',
  LW: 'PE',
  RW: 'PD',
  ST: 'CA'
};
