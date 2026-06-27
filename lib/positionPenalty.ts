// Grupos de proximidade entre posições
// Penalidade 0: posição natural (está em positions[])
// Penalidade 2: posição próxima (mesmo setor ou adjacente)
// Penalidade 5: posição distante (setor diferente mas relacionado)
// Penalidade 10: posição oposta (setores opostos ou GK saindo do gol)

import { Player } from "../src/types";

export const POSITION_PROXIMITY: Record<string, Record<string, number>> = {
  GK:  { GK:0, CB:10, LB:10, RB:10, CDM:10, CM:10, CAM:10, LM:10, RM:10, LW:10, RW:10, ST:10 },
  CB:  { GK:10, CB:0, LB:2, RB:2, CDM:5, CM:7, CAM:10, LM:10, RM:10, LW:10, RW:10, ST:10 },
  LB:  { GK:10, CB:2, LB:0, RB:5, CDM:5, CM:7, CAM:10, LM:2, RM:10, LW:5, RW:10, ST:10 },
  RB:  { GK:10, CB:2, LB:5, RB:0, CDM:5, CM:7, CAM:10, LM:10, RM:2, LW:10, RW:5, ST:10 },
  CDM: { GK:10, CB:5, LB:5, RB:5, CDM:0, CM:2, CAM:5, LM:5, RM:5, LW:7, RW:7, ST:10 },
  CM:  { GK:10, CB:7, LB:7, RB:7, CDM:2, CM:0, CAM:2, LM:2, RM:2, LW:5, RW:5, ST:7 },
  CAM: { GK:10, CB:10, LB:10, RB:10, CDM:5, CM:2, CAM:0, LM:2, RM:2, LW:2, RW:2, ST:2 },
  LM:  { GK:10, CB:10, LB:2, RB:10, CDM:5, CM:2, CAM:2, LM:0, RM:7, LW:2, RW:10, ST:5 },
  RM:  { GK:10, CB:10, LB:10, RB:2, CDM:5, CM:2, CAM:2, LM:7, RM:0, LW:10, RW:2, ST:5 },
  LW:  { GK:10, CB:10, LB:5, RB:10, CDM:7, CM:5, CAM:2, LM:2, RM:10, LW:0, RW:7, ST:2 },
  RW:  { GK:10, CB:10, LB:10, RB:5, CDM:7, CM:5, CAM:2, LM:10, RM:2, LW:7, RW:0, ST:2 },
  ST:  { GK:10, CB:10, LB:10, RB:10, CDM:10, CM:7, CAM:2, LM:5, RM:5, LW:2, RW:2, ST:0 },
};

/**
 * Calcula o OVR efetivo do jogador para uma posição específica.
 * Se a posição estiver em player.positions[], sem penalidade.
 * Caso contrário, aplica penalidade baseada na proximidade.
 */
export function getEffectiveOvr(player: Player, targetPosition: string): number {
  const naturalPositions = player.positions ?? (player.secondaryPositions ? [player.position, ...player.secondaryPositions] : [player.position]);

  // Posição natural — sem penalidade
  if (naturalPositions.includes(targetPosition)) {
    return player.overall;
  }

  // Calcula menor penalidade entre todas as posições naturais do jogador
  const minPenalty = naturalPositions.reduce((min, naturalPos) => {
    const penalty = POSITION_PROXIMITY[naturalPos]?.[targetPosition] ?? 10;
    return Math.min(min, penalty);
  }, 10);

  return Math.max(40, player.overall - minPenalty);
}

/**
 * Retorna o label de compatibilidade para exibir na UI.
 */
export function getPositionCompatibility(player: Player, targetPosition: string): {
  label: string;
  color: string;
  penalty: number;
} {
  const naturalPositions = player.positions ?? (player.secondaryPositions ? [player.position, ...player.secondaryPositions] : [player.position]);

  if (naturalPositions.includes(targetPosition)) {
    return { label: 'Natural', color: 'text-green-400', penalty: 0 };
  }

  const minPenalty = naturalPositions.reduce((min, naturalPos) => {
    const penalty = POSITION_PROXIMITY[naturalPos]?.[targetPosition] ?? 10;
    return Math.min(min, penalty);
  }, 10);

  if (minPenalty <= 2)  return { label: 'Próxima',   color: 'text-yellow-400', penalty: minPenalty };
  if (minPenalty <= 5)  return { label: 'Distante',  color: 'text-orange-400', penalty: minPenalty };
  return                       { label: 'Fora de posição', color: 'text-red-400', penalty: minPenalty };
}
