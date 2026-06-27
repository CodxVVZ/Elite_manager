import type { Team, Player } from './teams';

// ─── TÁTICAS ─────────────────────────────────────────────────────────────────

export interface TacticalSettings {
  mentality: 'defensive' | 'balanced' | 'attacking';
  defensiveLine: 'deep' | 'medium' | 'high';
  pressingIntensity: 'low' | 'medium' | 'high';
  playStyle: 'direct' | 'balanced' | 'possession';
  counterAttack: boolean;
  offensiveWidth: 'narrow' | 'balanced' | 'wide';
  fullbackSupport: boolean;
  compactDefense: boolean;
}

export const defaultTactics: TacticalSettings = {
  mentality: 'balanced',
  defensiveLine: 'medium',
  pressingIntensity: 'medium',
  playStyle: 'balanced',
  counterAttack: false,
  offensiveWidth: 'balanced',
  fullbackSupport: true,
  compactDefense: true,
};

// ─── TIPOS DE EVENTOS ─────────────────────────────────────────────────────────

export type MatchEventType =
  | 'kickoff'
  | 'halftime'
  | 'fulltime'
  | 'goal'
  | 'shot_saved'
  | 'shot_missed'
  | 'foul'
  | 'yellow_card'
  | 'red_card'
  | 'corner'
  | 'danger'
  | 'offside';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  team: 'home' | 'away' | 'neutral';
  player?: string;
  description: string;
  isGoal?: boolean;
  homeScore: number;
  awayScore: number;
}

export interface MatchStats {
  shots: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
  yellowCards: [number, number];
  redCards: [number, number];
  possession: [number, number];
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
  events: MatchEvent[];
  stats: MatchStats;
  fatigueDrops: Record<number, number>; // playerId → queda de fadiga
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

function roll(chance: number): boolean {
  return Math.random() < chance;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getBest11(team: Team): Player[] {
  return [...team.players].sort((a, b) => b.overall - a.overall).slice(0, 11);
}

function getAttackers(team: Team): Player[] {
  const atk = team.players.filter(p =>
    ['ST', 'LW', 'RW', 'CAM', 'LM', 'RM'].includes(p.position)
  );
  return atk.length > 0 ? atk : team.players.slice(0, 3);
}

function getDefenders(team: Team): Player[] {
  const def = team.players.filter(p =>
    ['CB', 'LB', 'RB', 'CDM'].includes(p.position)
  );
  return def.length > 0 ? def : team.players.slice(0, 4);
}

function getGK(team: Team): Player {
  return team.players.find(p => p.position === 'GK') ?? team.players[0];
}

// ─── FORÇA DO TIME ────────────────────────────────────────────────────────────

function calcStrength(
  team: Team,
  fatigueMap: Record<number, number>,
  tactics: TacticalSettings,
  isHome: boolean
): number {
  const best11 = getBest11(team);
  const avgOvr = best11.reduce((s, p) => s + p.overall, 0) / 11;
  const avgFatigue = best11.reduce((s, p) => s + (fatigueMap[p.id] ?? 100), 0) / 11;

  // Penalidade de fadiga: -1 ponto por cada 10% abaixo de 100
  const fatiguePenalty = (100 - avgFatigue) / 10;
  let strength = avgOvr - fatiguePenalty;

  // Vantagem de jogar em casa
  if (isHome) strength += 3;

  // Modificadores táticos
  const mentalityBonus = { defensive: -2, balanced: 0, attacking: 3 }[tactics.mentality];
  const pressBonus = { low: -1, medium: 0, high: 2 }[tactics.pressingIntensity];
  strength += mentalityBonus + pressBonus;

  return clamp(strength, 40, 100);
}

// ─── COMENTÁRIOS (PT-BR) ─────────────────────────────────────────────────────

const goalLines = [
  'GOOOOL! A torcida vai à loucura!',
  'GOOOOL! Que finalização espetacular!',
  'GOOOOL! O goleiro não teve chance!',
  'GOOOOL! Que jogada magistral!',
  'GOOOOL! O estádio explode!',
  'GOOOOL! Que chute fulminante!',
  'GOOOOL! Deu para o time!',
];

const savedLines = [
  'Defesaça do goleiro! Salvou o time!',
  'O arqueiro voa e salva no ângulo!',
  'Incrível! O goleiro espalmou com categoria!',
  'Ufa! Que intervenção crucial!',
  'Impediu o gol com uma defesa sensacional!',
];

const missLines = [
  'Desperdiçou uma chance de ouro!',
  'Por cima do gol! Que desperdício!',
  'Passou raspando a trave! Quase!',
  'Finalizou mal. Oportunidade jogada fora.',
  'A bola foi para fora. Deu tiro de meta.',
];

const dangerLines = [
  'Jogada perigosa! A defesa afastou por pouco.',
  'Boa chegada! O zagueiro cortou no último instante.',
  'Pressão alta! A defesa segura a bola.',
  'Construção de jogo bem elaborada.',
  'Boa troca de passes, mas sem finalização.',
];

const foulLines = [
  'Falta dura no meio-campo!',
  'O árbitro apita. Falta marcada.',
  'Jogada violenta! O juiz parou o jogo.',
  'Falta cometida. O time vai cobrar.',
];

const yellowLines = [
  'CARTÃO AMARELO! O árbitro não perdoou.',
  'Advertência! Cartão amarelo mostrado.',
  'Cartão amarelo. Próximo leva vermelho.',
];

const cornerLines = [
  'Escanteio! Vai cobrar.',
  'Bola saiu pela linha de fundo. Escanteio.',
  'Escanteio bem cobrado...',
];

const offsideLines = [
  'Impedido! A jogada é anulada.',
  'Impedimento flagrante. Boa defesa tática.',
  'Partiu em impedimento. Tiro de meta.',
];

// ─── SIMULAÇÃO PRINCIPAL ──────────────────────────────────────────────────────

export function simulateMatch(
  homeTeam: Team,
  awayTeam: Team,
  homeFatigue: Record<number, number>,
  awayFatigue: Record<number, number>,
  homeTactics: TacticalSettings,
  awayTactics: TacticalSettings
): MatchResult {
  const events: MatchEvent[] = [];
  const stats: MatchStats = {
    shots: [0, 0],
    shotsOnTarget: [0, 0],
    corners: [0, 0],
    fouls: [0, 0],
    yellowCards: [0, 0],
    redCards: [0, 0],
    possession: [0, 0],
  };

  let homeGoals = 0;
  let awayGoals = 0;
  let htHome = 0;
  let htAway = 0;

  // Força base de cada time
  const homeBaseStr = calcStrength(homeTeam, homeFatigue, homeTactics, true);
  const awayBaseStr = calcStrength(awayTeam, awayFatigue, awayTactics, false);

  // ── Loop principal: 1 ciclo por minuto ──────────────────────────────────────
  for (let min = 1; min <= 90; min++) {
    // Salvar placar do intervalo
    if (min === 45) {
      htHome = homeGoals;
      htAway = awayGoals;
      continue;
    }
    if (min === 90) continue;

    // Ajuste dinâmico por placar e fase do jogo
    const scoreDiff = homeGoals - awayGoals;
    let homeStr = homeBaseStr;
    let awayStr = awayBaseStr;

    // Time perdendo fica mais desesperado, time vencendo administra
    if (scoreDiff < 0) {
      homeStr += clamp(Math.abs(scoreDiff) * 3, 0, 7);
      awayStr -= clamp(Math.abs(scoreDiff) * 1.5, 0, 4);
    } else if (scoreDiff > 0) {
      awayStr += clamp(scoreDiff * 3, 0, 7);
      homeStr -= clamp(scoreDiff * 1.5, 0, 4);
    }

    // Fadiga crescente no 2º tempo
    if (min >= 60) {
      const fatMult = 1 - (min - 60) * 0.003;
      homeStr *= fatMult;
      awayStr *= fatMult;
    }

    // Qual time tem a bola neste minuto?
    const total = Math.max(homeStr + awayStr, 1);
    const homeAttacks = roll(homeStr / total);

    const side = homeAttacks ? 'home' : 'away';
    const sideIdx: 0 | 1 = homeAttacks ? 0 : 1;
    const defIdx: 0 | 1 = homeAttacks ? 1 : 0;
    const atkTeam = homeAttacks ? homeTeam : awayTeam;
    const defTeam = homeAttacks ? awayTeam : homeTeam;
    const atkTactics = homeAttacks ? homeTactics : awayTactics;
    const defTactics = homeAttacks ? awayTactics : homeTactics;
    const atkStr = homeAttacks ? homeStr : awayStr;
    const defStr = homeAttacks ? awayStr : homeStr;

    stats.possession[sideIdx]++;

    // Taxa de evento por minuto (calibrada para ~2.4 gols por jogo)
    let eventChance = 0.32;
    if (atkTactics.mentality === 'attacking') eventChance += 0.07;
    if (atkTactics.mentality === 'defensive') eventChance -= 0.07;
    if (defTactics.compactDefense) eventChance -= 0.05;
    if (defTactics.defensiveLine === 'deep') eventChance -= 0.03;
    if (atkTactics.counterAttack && defTactics.defensiveLine === 'high') eventChance += 0.06;
    if (atkTactics.offensiveWidth === 'wide') eventChance += 0.03;

    if (!roll(eventChance)) continue;

    // Tipo de evento neste minuto
    const r = Math.random();

    // ── FALTA ──────────────────────────────────────────────────────────────
    if (r < 0.14) {
      const defender = pick(getDefenders(defTeam));
      stats.fouls[defIdx]++;

      // Pressão alta = mais faltas
      const yellowChance = defTactics.pressingIntensity === 'high' ? 0.30 : 0.20;
      if (roll(yellowChance)) {
        stats.yellowCards[defIdx]++;
        events.push({
          minute: min, type: 'yellow_card',
          team: homeAttacks ? 'away' : 'home',
          player: defender.name,
          description: `🟨 ${pick(yellowLines)} ${defender.name}.`,
          homeScore: homeGoals, awayScore: awayGoals,
        });
      } else {
        events.push({
          minute: min, type: 'foul',
          team: homeAttacks ? 'away' : 'home',
          player: defender.name,
          description: `🤚 ${pick(foulLines)} (${defender.name})`,
          homeScore: homeGoals, awayScore: awayGoals,
        });
      }
      continue;
    }

    // ── IMPEDIMENTO ────────────────────────────────────────────────────────
    if (r < 0.18) {
      const att = pick(getAttackers(atkTeam));
      events.push({
        minute: min, type: 'offside', team: side, player: att.name,
        description: `🚩 ${pick(offsideLines)} (${att.name})`,
        homeScore: homeGoals, awayScore: awayGoals,
      });
      continue;
    }

    // ── ESCANTEIO ──────────────────────────────────────────────────────────
    if (r < 0.24) {
      stats.corners[sideIdx]++;
      events.push({
        minute: min, type: 'corner', team: side,
        description: `🚩 ${pick(cornerLines)} ${atkTeam.abbreviation}.`,
        homeScore: homeGoals, awayScore: awayGoals,
      });
      continue;
    }

    // ── JOGADA PERIGOSA SEM CHUTE ──────────────────────────────────────────
    if (r < 0.30) {
      events.push({
        minute: min, type: 'danger', team: side,
        description: `⚡ ${pick(dangerLines)}`,
        homeScore: homeGoals, awayScore: awayGoals,
      });
      continue;
    }

    // ── CHUTE ─────────────────────────────────────────────────────────────
    const attacker = pick(getAttackers(atkTeam));
    const gk = getGK(defTeam);
    stats.shots[sideIdx]++;

    // Qualidade relativa dos times afeta a precisão
    const qualityRatio = clamp(atkStr / Math.max(defStr, 1), 0.5, 2.0);
    const shootingQuality = (attacker.shooting + attacker.pace) / 2;

    // Chance de acertar o alvo
    let onTargetChance = 0.38 + (shootingQuality - 70) / 200;
    if (atkTactics.playStyle === 'direct') onTargetChance -= 0.04; // chutes mais precipitados
    if (atkTactics.playStyle === 'possession') onTargetChance += 0.04; // chances mais elaboradas
    onTargetChance = clamp(onTargetChance * qualityRatio, 0.18, 0.68);

    if (!roll(onTargetChance)) {
      // Chute para fora
      if (roll(0.35)) stats.corners[sideIdx]++;
      events.push({
        minute: min, type: 'shot_missed', team: side, player: attacker.name,
        description: `🎯 ${attacker.name} finaliza! ${pick(missLines)}`,
        homeScore: homeGoals, awayScore: awayGoals,
      });
      continue;
    }

    stats.shotsOnTarget[sideIdx]++;

    // Chance de gol vs defesa do goleiro
    const gkQuality = (gk.defense + gk.physical) / 2;
    let goalChance = 0.30 + (shootingQuality - gkQuality) / 300;

    // Contra-ataque com linha alta: chance de gol extra
    if (atkTactics.counterAttack && defTactics.defensiveLine === 'high') goalChance += 0.10;
    // Mentality bonus
    if (atkTactics.mentality === 'attacking') goalChance += 0.04;
    if (defTactics.compactDefense) goalChance -= 0.04;

    goalChance = clamp(goalChance * qualityRatio, 0.10, 0.72);

    if (roll(goalChance)) {
      // ⚽ GOL!
      if (homeAttacks) homeGoals++; else awayGoals++;
      events.push({
        minute: min, type: 'goal', team: side, player: attacker.name,
        description: `⚽ ${pick(goalLines)} ${attacker.name}! ${homeGoals}–${awayGoals}`,
        isGoal: true,
        homeScore: homeGoals, awayScore: awayGoals,
      });
    } else {
      // Defesa do goleiro
      if (roll(0.45)) stats.corners[sideIdx]++;
      events.push({
        minute: min, type: 'shot_saved', team: side, player: attacker.name,
        description: `🧤 ${attacker.name} chuta! ${pick(savedLines)} ${gk.name}!`,
        homeScore: homeGoals, awayScore: awayGoals,
      });
    }
  }

  // ── Eventos estruturais ───────────────────────────────────────────────────
  events.unshift({
    minute: 0, type: 'kickoff', team: 'neutral',
    description: `🏟️ Bola rolando! Começa o jogo entre ${homeTeam.name} e ${awayTeam.name}!`,
    homeScore: 0, awayScore: 0,
  });

  events.push({
    minute: 45, type: 'halftime', team: 'neutral',
    description: `⏱️ Intervalo. ${homeTeam.name} ${htHome}–${htAway} ${awayTeam.name}.`,
    homeScore: htHome, awayScore: htAway,
  });

  events.push({
    minute: 90, type: 'fulltime', team: 'neutral',
    description: `🏁 Fim de jogo! Resultado: ${homeTeam.name} ${homeGoals}–${awayGoals} ${awayTeam.name}`,
    homeScore: homeGoals, awayScore: awayGoals,
  });

  // Ordenar todos os eventos por minuto
  events.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    // Halftime e fulltime vão por último no mesmo minuto
    const structural = ['kickoff', 'halftime', 'fulltime'];
    if (structural.includes(a.type) && !structural.includes(b.type)) return 1;
    if (!structural.includes(a.type) && structural.includes(b.type)) return -1;
    return 0;
  });

  // ── Posse de bola normalizada ─────────────────────────────────────────────
  const totalPoss = stats.possession[0] + stats.possession[1];
  if (totalPoss > 0) {
    stats.possession[0] = Math.round((stats.possession[0] / totalPoss) * 100);
    stats.possession[1] = 100 - stats.possession[0];
  } else {
    stats.possession = [50, 50];
  }

  // ── Queda de fadiga pós-jogo ──────────────────────────────────────────────
  const fatigueDrops: Record<number, number> = {};

  const applyFatigueDrop = (team: Team, tactics: TacticalSettings) => {
    const best11 = getBest11(team);
    best11.forEach(player => {
      let base: number;
      switch (player.position) {
        case 'GK':  base = randInt(5, 10);  break;
        case 'CB':  base = randInt(10, 16); break;
        case 'LB':
        case 'RB':  base = randInt(12, 18); break;
        case 'CDM':
        case 'CM':  base = randInt(13, 20); break;
        case 'CAM':
        case 'LM':
        case 'RM':  base = randInt(14, 21); break;
        default:    base = randInt(15, 23); // ST, LW, RW
      }
      if (tactics.pressingIntensity === 'high')   base += 4;
      if (tactics.pressingIntensity === 'low')    base -= 3;
      if (tactics.mentality === 'attacking')      base += 3;
      if (tactics.mentality === 'defensive')      base -= 2;

      fatigueDrops[player.id] = clamp(base, 2, 35);
    });
  };

  applyFatigueDrop(homeTeam, homeTactics);
  applyFatigueDrop(awayTeam, awayTactics);

  return { homeGoals, awayGoals, events, stats, fatigueDrops };
}
