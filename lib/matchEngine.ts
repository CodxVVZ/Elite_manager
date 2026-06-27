import type { Team, Player } from "./teams";

// ─── TÁTICAS ─────────────────────────────────────────────────────────────────

export interface FieldSlot {
  id: string;
  x: number; // 0-100%
  y: number; // 0-100%
  playerId: number | null;
  label?: string;
}

export interface TacticalSettings {
  mentality: "defensive" | "balanced" | "attacking";
  defensiveLine: "deep" | "medium" | "high";
  pressingIntensity: "low" | "medium" | "high";
  playStyle: "direct" | "balanced" | "possession";
  counterAttack: boolean;
  offensiveWidth: "narrow" | "balanced" | "wide";
  fullbackSupport: boolean;
  compactDefense: boolean;
  formationName?: string;
  lineup?: FieldSlot[];
}

export const defaultTactics: TacticalSettings = {
  mentality: "balanced",
  defensiveLine: "medium",
  pressingIntensity: "medium",
  playStyle: "balanced",
  counterAttack: false,
  offensiveWidth: "balanced",
  fullbackSupport: true,
  compactDefense: true,
  formationName: "4-4-2",
  lineup: [],
};

// ─── TIPOS DE EVENTOS ─────────────────────────────────────────────────────────

export type MatchEventType =
  | "kickoff"
  | "halftime"
  | "fulltime"
  | "goal"
  | "shot_saved"
  | "shot_missed"
  | "foul"
  | "yellow_card"
  | "red_card"
  | "corner"
  | "danger"
  | "offside";

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  team: "home" | "away" | "neutral";
  player?: string;
  playerId?: number;
  assistId?: number;
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
  assists: [number, number];
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
  const available = [...team.players].sort((a, b) => b.overall - a.overall);
  const best: Player[] = [];

  const pickBest = (isGK: boolean, count: number, preferred: string[]) => {
    for (let c = 0; c < count; c++) {
      let idx = available.findIndex((p) =>
        isGK ? p.position === "GK" : preferred.includes(p.position),
      );
      if (idx === -1)
        idx = available.findIndex((p) =>
          isGK ? p.position === "GK" : p.position !== "GK",
        );
      if (idx === -1) idx = 0;
      if (available.length > 0 && idx !== -1) {
        best.push(available[idx]);
        available.splice(idx, 1);
      }
    }
  };

  // 1 GK, 4 DEF, 4 MID, 2 ATK
  pickBest(true, 1, ["GK"]);
  pickBest(false, 4, ["CB", "LB", "RB"]);
  pickBest(false, 4, ["CDM", "CM", "CAM", "LM", "RM"]);
  pickBest(false, 2, ["ST", "LW", "RW"]);

  return best;
}

function getLineupPlayers(team: Team, tactics: TacticalSettings): Player[] {
  let play11: Player[] = [];
  if (tactics.lineup && tactics.lineup.length > 0) {
    play11 = tactics.lineup
      .map((slot) => team.players.find((p) => p.id === slot.playerId))
      .filter(Boolean) as Player[];
  }
  
  if (play11.length < 11) {
    const best = getBest11(team);
    const existingIds = new Set(play11.map(p => p.id));
    for (const p of best) {
      if (play11.length >= 11) break;
      if (!existingIds.has(p.id)) {
        play11.push(p);
      }
    }
  }
  return play11;
}

function getAttackers(team: Team, tactics: TacticalSettings): Player[] {
  const players = getLineupPlayers(team, tactics);
  const atk = players.filter((p) =>
    ["ST", "LW", "RW", "CAM", "LM", "RM"].includes(p.position),
  );
  return atk.length > 0 ? atk : players.slice(0, 3);
}

function getDefenders(team: Team, tactics: TacticalSettings): Player[] {
  const players = getLineupPlayers(team, tactics);
  const def = players.filter((p) =>
    ["CB", "LB", "RB", "CDM"].includes(p.position),
  );
  return def.length > 0 ? def : players.slice(0, 4);
}

function getGK(team: Team, tactics: TacticalSettings): Player {
  const players = getLineupPlayers(team, tactics);
  return players.find((p) => p.position === "GK") ?? players[0];
}

// ─── FORÇA DO TIME ────────────────────────────────────────────────────────────

import { getPositionDistance } from "./positionUtils";
import { getEffectiveOvr } from "./positionPenalty";

function calcStrength(
  team: Team,
  fatigueMap: Record<number, number>,
  tactics: TacticalSettings,
  isHome: boolean,
): number {
  let avgOvr = 50;
  let avgFatigue = 100;

  if (tactics.lineup && tactics.lineup.length > 0) {
    let totalOvr = 0;
    let totalFatigue = 0;
    let count = 0;
    tactics.lineup.forEach((slot) => {
      const p = team.players.find((p) => p.id === slot.playerId);
      if (p) {
        totalOvr += getEffectiveOvr(p, slot.label || "");
        totalFatigue += fatigueMap[p.id] ?? 100;
        count++;
      }
    });
    if (count > 0) {
      avgOvr = totalOvr / count;
      avgFatigue = totalFatigue / count;
    }
  } else {
    // If no lineup (e.g. AI), use best11 which puts players mostly in right positions
    const play11 = getLineupPlayers(team, tactics);
    avgOvr =
      play11.length > 0
        ? play11.reduce((s, p) => s + p.overall, 0) / play11.length
        : 50;
    avgFatigue =
      play11.length > 0
        ? play11.reduce((s, p) => s + (fatigueMap[p.id] ?? 100), 0) /
          play11.length
        : 100;
  }

  // Penalidade de fadiga: -1 ponto por cada 10% abaixo de 100
  const fatiguePenalty = (100 - avgFatigue) / 10;
  let strength = avgOvr - fatiguePenalty;

  // Vantagem de jogar em casa
  if (isHome) strength += 3;

  // Modificadores táticos
  const mentalityBonus = { defensive: -2, balanced: 0, attacking: 3 }[
    tactics.mentality
  ];
  const pressBonus = { low: -1, medium: 0, high: 2 }[tactics.pressingIntensity];
  strength += mentalityBonus + pressBonus;

  return clamp(strength, 40, 100);
}

// ─── COMENTÁRIOS (PT-BR) ─────────────────────────────────────────────────────

const goalLines = [
  "GOOOOL! A torcida vai à loucura!",
  "GOOOOL! Que finalização espetacular!",
  "GOOOOL! O goleiro não teve chance!",
  "GOOOOL! Que jogada magistral!",
  "GOOOOL! O estádio explode!",
  "GOOOOL! Que chute fulminante!",
  "GOOOOL! Deu para o time!",
];

const savedLines = [
  "Defesaça do goleiro! Salvou o time!",
  "O arqueiro voa e salva no ângulo!",
  "Incrível! O goleiro espalmou com categoria!",
  "Ufa! Que intervenção crucial!",
  "Impediu o gol com uma defesa sensacional!",
];

const missLines = [
  "Desperdiçou uma chance de ouro!",
  "Por cima do gol! Que desperdício!",
  "Passou raspando a trave! Quase!",
  "Finalizou mal. Oportunidade jogada fora.",
  "A bola foi para fora. Deu tiro de meta.",
];

const dangerLines = [
  "Jogada perigosa! A defesa afastou por pouco.",
  "Boa chegada! O zagueiro cortou no último instante.",
  "Pressão alta! A defesa segura a bola.",
  "Construção de jogo bem elaborada.",
  "Boa troca de passes, mas sem finalização.",
];

const foulLines = [
  "Falta dura no meio-campo!",
  "O árbitro apita. Falta marcada.",
  "Jogada violenta! O juiz parou o jogo.",
  "Falta cometida. O time vai cobrar.",
];

const yellowLines = [
  "CARTÃO AMARELO! O árbitro não perdoou.",
  "Advertência! Cartão amarelo mostrado.",
  "Cartão amarelo. Próximo leva vermelho.",
];

const cornerLines = [
  "Escanteio! Vai cobrar.",
  "Bola saiu pela linha de fundo. Escanteio.",
  "Escanteio bem cobrado...",
];

const offsideLines = [
  "Impedido! A jogada é anulada.",
  "Impedimento flagrante. Boa defesa tática.",
  "Partiu em impedimento. Tiro de meta.",
];

// ─── SIMULAÇÃO PRINCIPAL ──────────────────────────────────────────────────────

export function simulateMatch(
  homeTeam: Team,
  awayTeam: Team,
  homeFatigue: Record<number, number>,
  awayFatigue: Record<number, number>,
  homeTactics: TacticalSettings,
  awayTactics: TacticalSettings,
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
    assists: [0, 0],
  };

  let homeGoals = 0,
    awayGoals = 0;
  let htHome = 0,
    htAway = 0;

  const homeDayLuck = (Math.random() * 8) - 4;
  const awayDayLuck = (Math.random() * 8) - 4;
  
  const homeBaseStr = calcStrength(homeTeam, homeFatigue, homeTactics, true) + homeDayLuck;
  const awayBaseStr = calcStrength(awayTeam, awayFatigue, awayTactics, false) + awayDayLuck;

  function getMid(team: Team, tactics: TacticalSettings) {
    const list = getLineupPlayers(team, tactics).filter((p) =>
      ["CM", "CDM", "CAM", "LM", "RM"].includes(p.position),
    );
    return list.length ? list : getLineupPlayers(team, tactics);
  }

  // 0: home def/away atk, 1: mid, 2: home atk/away def
  let ballZone = 1;
  let poss: "home" | "away" = "home";

  events.unshift({
    minute: 0,
    type: "kickoff",
    team: "neutral",
    description: `🏟️ Bola rolando! Começa o jogo entre ${homeTeam.name} e ${awayTeam.name}!`,
    homeScore: 0,
    awayScore: 0,
  });

  for (let min = 1; min <= 90; min++) {
    if (min === 45) {
      htHome = homeGoals;
      htAway = awayGoals;
      ballZone = 1;
      poss = "away";
      continue;
    }
    if (min === 90) continue;

    stats.possession[poss === "home" ? 0 : 1] += 1;

    // Fatigue
    let fMult = min >= 60 ? 1 - (min - 60) * 0.003 : 1;
    let hStr = homeBaseStr * fMult;
    let aStr = awayBaseStr * fMult;

    // score diff motivation
    let diff = homeGoals - awayGoals;
    if (diff < 0) {
      hStr += 5;
      aStr -= 2;
    } else if (diff > 0) {
      aStr += 5;
      hStr -= 2;
    }

    const atkTeam = poss === "home" ? homeTeam : awayTeam;
    const defTeam = poss === "home" ? awayTeam : homeTeam;
    const atkT = poss === "home" ? homeTactics : awayTactics;
    const defT = poss === "home" ? awayTactics : homeTactics;
    const atkStr = poss === "home" ? hStr : aStr;
    const defStr = poss === "home" ? aStr : hStr;
    const atkIdx = poss === "home" ? 0 : 1;
    const defIdx = poss === "home" ? 1 : 0;

    // Tactical influence
    let atkStyle = atkT.playStyle;
    let defPress = defT.pressingIntensity;

    const narrativeRoll = Math.random();

    // The chance to build up or lose ball depends on zone
    if (ballZone === 1) {
      // MIDFIELD
      let succChance = 0.55 + (atkStr - defStr) / 100;
      if (atkStyle === "direct") succChance -= 0.05;
      if (defPress === "high") succChance -= 0.05;
      if (atkT.offensiveWidth === "wide") succChance += 0.02;

      // home advantage
      if (poss === "home") succChance += 0.03;

      if (roll(succChance)) {
        // move to attack
        ballZone = poss === "home" ? 2 : 0;
        if (roll(0.15)) {
          const mid = pick(getMid(atkTeam, atkT));
          const fwd = pick(getAttackers(atkTeam, atkT));
          events.push({
            minute: min,
            type: "danger",
            team: poss,
            description: `✨ ${mid.name} encontra ${fwd.name} avançando para o ataque!`,
            homeScore: homeGoals,
            awayScore: awayGoals,
          });
        }
      } else {
        // lose ball
        if (roll(0.2)) {
          // foul
          const def = pick(getDefenders(defTeam, defT));
          stats.fouls[defIdx]++;
          let cardType = roll(0.05)
            ? "red"
            : roll(defPress === "high" ? 0.3 : 0.15)
              ? "yellow"
              : "none";
          let dstr =
            cardType === "red"
              ? `🟥 Cartão VERMELHO para ${def.name} por entrada violenta!`
              : cardType === "yellow"
                ? `🟨 Cartão amarelo para ${def.name} por falta dura no meio!`
                : `🤚 Falta tática de ${def.name} parando a jogada.`;
          if (cardType === "red") stats.redCards[defIdx]++;
          else if (cardType === "yellow") stats.yellowCards[defIdx]++;
          events.push({
            minute: min,
            type:
              cardType === "red"
                ? "red_card"
                : cardType === "yellow"
                  ? "yellow_card"
                  : "foul",
            player: def.name,
            playerId: def.id,
            team: poss === "home" ? "away" : "home",
            description: dstr,
            homeScore: homeGoals,
            awayScore: awayGoals,
          });
        } else {
          // just lose ball
          poss = poss === "home" ? "away" : "home";
          if (roll(0.1)) {
            let dm = pick(getMid(defTeam, defT));
            events.push({
              minute: min,
              type: "danger",
              team: poss,
              description: `🛑 ${dm.name} rouba a bola no meio campo e inverte a posse.`,
              homeScore: homeGoals,
              awayScore: awayGoals,
            });
          }
        }
      }
    } else {
      // ATTACK ZONE
      const isHomeAtk = ballZone === 2;
      if ((isHomeAtk && poss !== "home") || (!isHomeAtk && poss === "home")) {
        // Defensive possession in own half - try to clear or play out
        if (roll(0.6)) {
          ballZone = 1; // move to mid
          if (roll(0.1)) {
            const df = pick(getDefenders(atkTeam, atkT));
            events.push({
              minute: min,
              type: "danger",
              team: poss,
              description: `🛡️ ${df.name} sai jogando com categoria da defesa.`,
              homeScore: homeGoals,
              awayScore: awayGoals,
            });
          }
        } else {
          // intercept higher up
          poss = poss === "home" ? "away" : "home";
          if (roll(0.15)) {
            const fwd = pick(getAttackers(defTeam, defT)); // team that just won it in attack
            events.push({
              minute: min,
              type: "danger",
              team: poss,
              description: `🔥 ${fwd.name} pressiona a saída de bola e recupera no ataque!`,
              homeScore: homeGoals,
              awayScore: awayGoals,
            });
          }
        }
      } else {
        // Attacking possession in opp half - create chance
        let createChance = 0.4 + (atkStr - defStr) / 80;
        if (atkT.playStyle === "possession") createChance += 0.05;
        if (defT.compactDefense) createChance -= 0.05;

        // home advantage
        if (poss === "home") createChance += 0.03;

        if (roll(createChance)) {
          // Chance created!
          if (roll(0.15)) {
            const fwd = pick(getAttackers(atkTeam, atkT));
            events.push({
              minute: min,
              type: "offside",
              team: poss,
              description: `🚩 ${fwd.name} recebe em profundidade, mas é pego em impedimento!`,
              homeScore: homeGoals,
              awayScore: awayGoals,
            });
            poss = poss === "home" ? "away" : "home";
            continue;
          }

          const shooter = pick(getAttackers(atkTeam, atkT));
          const gk = getGK(defTeam, defT);
          stats.shots[atkIdx]++;

          let onTgt = 0.45 + (shooter.shooting - 65) / 100;
          if (atkT.playStyle === "direct") onTgt -= 0.05;

          if (roll(onTgt)) {
            stats.shotsOnTarget[atkIdx]++;
            let goalChance = 0.35 + (shooter.shooting - gk.defense) / 120;
            if (atkT.mentality === "attacking") goalChance += 0.05;

            if (roll(goalChance)) {
              // GOAL
              poss === "home" ? homeGoals++ : awayGoals++;
              let assistPlayer = undefined;
              if (roll(0.75)) {
                stats.assists[atkIdx]++;
                // Pick a random assister who is not the shooter (midfielder or forward)
                const lineupPlayers = getLineupPlayers(atkTeam, atkT);
                const potentialAssists = lineupPlayers.filter(
                  (p) => p.position !== "GK" && p.id !== shooter.id,
                );
                if (potentialAssists.length > 0) {
                  assistPlayer = pick(potentialAssists);
                }
              }
              events.push({
                minute: min,
                type: "goal",
                player: shooter.name,
                isGoal: true,
                team: poss,
                description: `⚽ GOOOAAAL!!! ${shooter.name} finaliza com perfeição${assistPlayer ? ` após belo passe de ${assistPlayer.name}` : ""}!! ${homeGoals}-${awayGoals}`,
                homeScore: homeGoals,
                awayScore: awayGoals,
                playerId: shooter.id,
                assistId: assistPlayer?.id,
              });
              ballZone = 1;
              poss = poss === "home" ? "away" : "home";
            } else {
              if (roll(0.4)) {
                stats.corners[atkIdx]++;
                events.push({
                  minute: min,
                  type: "shot_saved",
                  player: shooter.name,
                  team: poss,
                  description: `🧤 DEFESAÇA! ${shooter.name} chuta forte e ${gk.name} salva para escanteio!`,
                  homeScore: homeGoals,
                  awayScore: awayGoals,
                });
                // retain poss for corner, but ball goes back slightly or stays
              } else {
                events.push({
                  minute: min,
                  type: "shot_saved",
                  player: shooter.name,
                  team: poss,
                  description: `🧤 DEFESAÇA! ${shooter.name} chuta forte e ${gk.name} agarra firme!`,
                  homeScore: homeGoals,
                  awayScore: awayGoals,
                });
                poss = poss === "home" ? "away" : "home";
                ballZone = 1; // keeper distributes
              }
            }
          } else {
            if (roll(0.3)) {
              stats.corners[atkIdx]++;
              events.push({
                minute: min,
                type: "shot_missed",
                player: shooter.name,
                team: poss,
                description: `🎯 ${shooter.name} tenta o chute, a bola desvia e vai para escanteio!`,
                homeScore: homeGoals,
                awayScore: awayGoals,
              });
            } else {
              events.push({
                minute: min,
                type: "shot_missed",
                player: shooter.name,
                team: poss,
                description: `🎯 Tiro de meta! ${shooter.name} arrisca e joga longe do gol.`,
                homeScore: homeGoals,
                awayScore: awayGoals,
              });
              poss = poss === "home" ? "away" : "home";
              ballZone = 1; // keeper distributes
            }
          }
        } else {
          // Attack broken down
          poss = poss === "home" ? "away" : "home";
          if (roll(0.15)) {
            const df = pick(getDefenders(defTeam, defT));
            events.push({
              minute: min,
              type: "danger",
              team: poss,
              description: `🧱 ${df.name} faz o desarme crucial na entrada da área.`,
              homeScore: homeGoals,
              awayScore: awayGoals,
            });
          }
        }
      }
    }
  }

  events.push({
    minute: 45,
    type: "halftime",
    team: "neutral",
    description: `⏱️ Apito do árbitro, fim do primeiro tempo. ${homeTeam.name} ${htHome}-${htAway} ${awayTeam.name}`,
    homeScore: htHome,
    awayScore: htAway,
  });
  events.push({
    minute: 90,
    type: "fulltime",
    team: "neutral",
    description: `🏁 FINAL DE JOGO! ${homeTeam.name} ${homeGoals}-${awayGoals} ${awayTeam.name}`,
    homeScore: homeGoals,
    awayScore: awayGoals,
  });

  events.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    const structure = ["kickoff", "halftime", "fulltime"];
    if (structure.includes(a.type) && !structure.includes(b.type)) return 1;
    if (!structure.includes(a.type) && structure.includes(b.type)) return -1;
    return 0;
  });

  const totPoss = stats.possession[0] + stats.possession[1];
  if (totPoss > 0) {
    stats.possession[0] = Math.round((stats.possession[0] / totPoss) * 100);
    stats.possession[1] = 100 - stats.possession[0];
  } else {
    stats.possession = [50, 50];
  }

  const fatigueDrops: Record<number, number> = {};
  function dropFatigue(team: Team, t: TacticalSettings) {
    let play11 = getLineupPlayers(team, t);
    if (play11.length === 0) play11 = getBest11(team);
    play11.forEach((p) => {
      let b = randInt(12, 22);
      if (t.pressingIntensity === "high") b += 4;
      fatigueDrops[p.id] = clamp(b, 2, 35);
    });
  }
  dropFatigue(homeTeam, homeTactics);
  dropFatigue(awayTeam, awayTactics);

  return { homeGoals, awayGoals, events, stats, fatigueDrops };
}
