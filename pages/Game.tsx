import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useGame, TrainingFocus } from "@/contexts/GameContext";
import { teams as allTeams, LEAGUES, COUNTRIES } from "@/lib/teams";
import {
  simulateMatch,
  defaultTactics,
  TacticalSettings,
} from "@/lib/matchEngine";
import { POS_LABELS, getPositionDistance } from "@/lib/positionUtils";
import { sortStandings } from "@/lib/leagueSystem";
import MatchScreen, { SubstitutionRecord } from "@/pages/MatchScreen";
import { TeamLogo } from "@/components/TeamLogo";
import { UCLScreen } from "@/components/UCLScreen";
import { saveGame, loadSettings } from "@/lib/saveSystem";
import { MarketScreen } from "@/components/MarketScreen";
import { IndividualTrainingScreen } from "@/components/IndividualTrainingScreen";
import { useTransfer } from "@/contexts/TransferContext";
import { getSeasonStartDate } from "@/lib/calendar";

import { useFullscreen } from "@/hooks/useFullscreen";

type Tab =
  | "dashboard"
  | "squad"
  | "tactics"
  | "training"
  | "finances"
  | "competitions"
  | "transfers"
  | "news"
  | "history"
  | "facilities";
export type Formation =
  | "4-4-2"
  | "4-3-3"
  | "4-2-3-1"
  | "3-5-2"
  | "5-3-2"
  | "4-5-1"
  | "4-1-4-1"
  | "4-3-3-F"
  | "3-4-3"
  | "4-4-2-D"
  | "5-4-1"
  | "4-2-2-2";

const formationRows: Record<Formation, string[][]> = {
  "4-4-2": [
    ["GK"],
    ["LB", "CB", "CB", "RB"],
    ["LM", "CM", "CM", "RM"],
    ["ST", "ST"],
  ],
  "4-3-3": [
    ["GK"],
    ["LB", "CB", "CB", "RB"],
    ["CM", "CM", "CM"],
    ["LW", "ST", "RW"],
  ],
  "4-2-3-1": [
    ["GK"],
    ["LB", "CB", "CB", "RB"],
    ["CDM", "CDM"],
    ["LM", "CAM", "RM"],
    ["ST"],
  ],
  "3-5-2": [
    ["GK"],
    ["CB", "CB", "CB"],
    ["LM", "CM", "CM", "CM", "RM"],
    ["ST", "ST"],
  ],
  "5-3-2": [
    ["GK"],
    ["LB", "CB", "CB", "CB", "RB"],
    ["CM", "CM", "CM"],
    ["ST", "ST"],
  ],
  "4-5-1": [
    ["GK"],
    ["LB", "CB", "CB", "RB"],
    ["LM", "CM", "CDM", "CM", "RM"],
    ["ST"],
  ],
  "4-1-4-1": [
    ["GK"],
    ["LB", "CB", "CB", "RB"],
    ["CDM"],
    ["LM", "CM", "CM", "RM"],
    ["ST"],
  ],
  "4-3-3-F": [
    ["GK"],
    ["LB", "CB", "CB", "RB"],
    ["CDM", "CM", "CM"],
    ["LW", "ST", "RW"],
  ],
  "3-4-3": [
    ["GK"],
    ["CB", "CB", "CB"],
    ["LM", "CM", "CM", "RM"],
    ["LW", "ST", "RW"],
  ],
  "4-4-2-D": [
    ["GK"],
    ["LB", "CB", "CB", "RB"],
    ["LM", "CDM", "CDM", "RM"],
    ["ST", "ST"],
  ],
  "5-4-1": [
    ["GK"],
    ["LB", "CB", "CB", "CB", "RB"],
    ["LM", "CM", "CM", "RM"],
    ["ST"],
  ],
  "4-2-2-2": [
    ["GK"],
    ["LB", "CB", "CB", "RB"],
    ["CDM", "CDM"],
    ["CAM", "CAM"],
    ["ST", "ST"],
  ],
};

const SESSIONS: { k: TrainingFocus; label: string; desc: string }[] = [
  { k: "physical", label: "💪 Físico", desc: "Melhora preparo e resistência" },
  { k: "attacking", label: "⚔️ Ataque", desc: "Finalização e movimentação" },
  { k: "defending", label: "🛡️ Defesa", desc: "Marcação e posicionamento" },
  { k: "possession", label: "🔵 Posse de Bola", desc: "Passe e circulação" },
  { k: "setpieces", label: "🎯 Bolas Paradas", desc: "Escanteios e faltas" },
  { k: "tactical", label: "🧠 Tático", desc: "Organização e estratégia" },
  { k: "goalkeepers", label: "🧤 Goleiros", desc: "Reflexos e posicionamento" },
  { k: "recovery", label: "😴 Recuperação", desc: "Reduz fadiga e lesões" },
  { k: "cohesion", label: "🤝 Coesão", desc: "Entrosamento coletivo" },
  {
    k: "individual",
    label: "⭐ Individual",
    desc: "Evolui atributo específico",
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtMoney(v: number) {
  const c =
    loadSettings().currency === "USD"
      ? "$"
      : loadSettings().currency === "EUR"
        ? "€"
        : "R$";
  return v >= 1000 ? `${c}${(v / 1000).toFixed(1)}M` : `${c}${v}K`;
}
function fatigueColor(v: number, d: boolean) {
  return v >= 70
    ? d
      ? "text-green-400"
      : "text-green-600"
    : v >= 40
      ? d
        ? "text-yellow-400"
        : "text-yellow-600"
      : d
        ? "text-red-400"
        : "text-red-600";
}
function moraleColor(v: number, d: boolean) {
  return v >= 70
    ? d
      ? "text-green-400"
      : "text-green-600"
    : v >= 45
      ? d
        ? "text-yellow-400"
        : "text-yellow-600"
      : d
        ? "text-red-400"
        : "text-red-600";
}
function moraleLabel(v: number) {
  return v >= 85
    ? "Excelente"
    : v >= 70
      ? "Bom"
      : v >= 50
        ? "Normal"
        : v >= 30
          ? "Baixo"
          : "Péssimo";
}
function statusLabel(s: string) {
  return (
    {
      star: "Estrela",
      starter: "Titular",
      rotation: "Rotação",
      reserve: "Reserva",
      prospect: "Promessa",
    }[s] ?? s
  );
}
function levelLabel(l: number) {
  return ["", "Pequeno", "Médio", "Grande", "Gigante"][l] ?? "";
}

// ─── CAMPO TÁTICO ─────────────────────────────────────────────────────────────

export interface FieldSlot {
  id: string;
  x: number; // 0-100%
  y: number; // 0-100%
  playerId: number | null;
  label?: string;
}

export function getLabelForCoords(x: number, y: number): string {
  // y > 85 is GK (bottom of screen)
  if (y > 85) return "GK";

  // y > 68 is Defense
  if (y > 67) {
    if (x < 30) return "LB";
    if (x > 70) return "RB";
    return "CB";
  }

  // y > 53 is Defensive Midfield (closer to Defense)
  if (y > 53) {
    if (x < 30) return "LM";
    if (x > 70) return "RM";
    return "CDM";
  }

  // y > 38 is Central Midfield
  if (y > 38) {
    if (x < 30) return "LM";
    if (x > 70) return "RM";
    return "CM";
  }

  // y > 22 is Attacking Midfield / Wingers (closer to Attack)
  if (y > 22) {
    if (x < 30) return "LW";
    if (x > 70) return "RW";
    return "CAM";
  }

  // y <= 22 is Attack (top of screen)
  if (x < 35) return "LW";
  if (x > 65) return "RW";
  return "ST";
}

import { getEffectiveOvr, getPositionCompatibility } from "../lib/positionPenalty";

export function generateDefaultLineup(formation: Formation): FieldSlot[] {
  const rows = formationRows[formation];
  const lineup: FieldSlot[] = [];
  const yStep = 76 / Math.max(1, rows.length - 1);
  [...rows].forEach((row, ri) => {
    const y = 88 - ri * yStep;
    const xStep = 76 / Math.max(1, row.length - 1 || 1);
    const xOffset = row.length === 1 ? 50 : 12;
    row.forEach((pos, ci) => {
      const x = row.length === 1 ? 50 : xOffset + ci * xStep;
      lineup.push({ id: `slot-${ri}-${ci}`, x, y, playerId: null, label: pos });
    });
  });
  return lineup;
}

function FormationField({
  formation,
  dark,
  lineupPlayers,
  selectedSlot,
  onSlotTap,
}: {
  formation: Formation;
  dark: boolean;
  lineupPlayers: Array<{
    id: number;
    name: string;
    position: string;
    positions?: string[];
    secondaryPositions?: string[];
    overall: number;
    shirtNumber?: number;
  } | null>;
  selectedSlot: number | null;
  onSlotTap: (slotIndex: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getPosColor = (pos: string) => {
    if (pos === "GK") return "rgba(234,179,8,0.85)";
    if (["CB", "LB", "RB", "WB"].includes(pos)) return "rgba(59,130,246,0.85)";
    if (["CDM", "CM", "CAM", "LM", "RM", "DM", "AM"].includes(pos))
      return "rgba(16,185,129,0.85)";
    if (["LW", "RW", "ST", "SS", "CF"].includes(pos))
      return "rgba(239,68,68,0.85)";
    return "rgba(100,100,100,0.85)";
  };

  const rows = formationRows[formation];

  let currentIndex = 0;
  const rowsWithIndices = rows.map((row) => {
    return row.map((pos) => {
      const idx = currentIndex++;
      return { pos, flatIndex: idx, player: lineupPlayers[idx] };
    });
  });

  const reversedRowsWithIndices = [...rowsWithIndices].reverse();

  const getShortName = (name: string) => {
    const parts = name.split(" ");
    if (parts.length === 1) return name.substring(0, 8);
    return `${parts[0][0]}. ${parts[parts.length - 1]}`.substring(0, 10);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden flex flex-col justify-around py-4 z-0"
      style={{
        background:
          "linear-gradient(180deg,#1a4a1a 0%,#2a6a2a 50%,#1a4a1a 100%)",
        minHeight: "420px",
      }}
    >
      {selectedSlot !== null && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => onSlotTap(-1)} // Handled outside or we can just pass null
        />
      )}

      <div className="absolute inset-x-0 top-1/2 h-px bg-white opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-16 h-16 border border-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-b border-l border-r border-white opacity-15 rounded-b-lg pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-t border-l border-r border-white opacity-15 rounded-t-lg pointer-events-none" />

      {reversedRowsWithIndices.map((rowArr, rowIndex) => (
        <div
          key={rowIndex}
          className="flex justify-center gap-2 sm:gap-4 z-20 pointer-events-none"
        >
          {rowArr.map(({ pos, flatIndex, player: p }) => {
            const isSelected = selectedSlot === flatIndex;
            const isTarget =
              selectedSlot !== null && selectedSlot !== flatIndex;

            let borderStyle = "1px solid rgba(255,255,255,0.3)";
            let shadowStyle = "0 2px 4px rgba(0,0,0,0.3)";
            let bgClass = "";

            if (isSelected) {
              borderStyle = "2px solid rgba(255,255,255,1)";
              shadowStyle = "0 0 12px rgba(255,255,255,0.6)";
              bgClass = "brightness-110";
            } else if (isTarget) {
              borderStyle = "2px dashed rgba(74,222,128,0.8)";
              bgClass = "bg-green-500/10 mix-blend-screen";
            }

            return (
              <button
                key={flatIndex}
                onClick={(e) => {
                  e.stopPropagation();
                  onSlotTap(flatIndex);
                }}
                className={`flex flex-col items-center justify-center relative shadow-sm pointer-events-auto transition-all ${bgClass}`}
                style={{
                  width: "56px",
                  height: "52px",
                  backgroundColor: getPosColor(pos),
                  border: borderStyle,
                  borderRadius: "6px",
                  boxShadow: shadowStyle,
                }}
              >
                {isSelected && (
                  <div className="absolute -top-4 w-full flex justify-center">
                    <span className="bg-white text-black text-[7px] font-black px-1 py-0.5 rounded shadow-sm">
                      MOVER
                    </span>
                  </div>
                )}
                {isTarget && !p && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-green-400/50 animate-pulse" />
                  </div>
                )}

                <div className="absolute top-0 right-1 text-[8px] font-bold text-white/50">
                  {pos}
                </div>
                {p ? (
                  <>
                    <span className="text-[8px] font-black text-white/90 leading-tight mt-1">
                      {p.shirtNumber || Math.floor(Math.random() * 99) + 1}
                    </span>
                    <span className="text-[9px] font-bold tracking-tight text-white leading-tight truncate w-full text-center px-0.5">
                      {getShortName(p.name)}
                    </span>
                    {(() => {
                      const effOvr = getEffectiveOvr(p as any, pos);
                      const compat = getPositionCompatibility(p as any, pos);
                      return (
                        <div className={`text-[9px] font-black leading-tight flex items-center gap-0.5 drop-shadow-md ${compat.penalty > 0 ? "text-yellow-300" : "text-yellow-300"}`}>
                           <span className={compat.color || 'text-yellow-300'}>{effOvr}</span>
                           {compat.penalty > 0 && <span className="text-[7.5px] font-bold text-red-300">-{compat.penalty}</span>}
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  <div className="w-8 h-8 border-2 border-dashed border-white/30 rounded-full flex items-center justify-center">
                    <span className="text-[10px] uppercase font-bold text-white/50">
                      {pos}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── CARD JOGADOR ─────────────────────────────────────────────────────────────

function PlayerCard({
  player,
  state,
  stats,
  playerHistory,
  dark,
  onClose,
}: {
  player: any;
  state: any;
  stats?: any;
  playerHistory: any;
  dark: boolean;
  onClose: () => void;
}) {
  const bg = dark ? "bg-gray-900" : "bg-white";
  const tx = dark ? "text-white" : "text-gray-900";
  const bgSoft = dark ? "bg-gray-800" : "bg-gray-50";
  const border = dark ? "border-gray-700" : "border-gray-200";
  const sub = dark ? "text-gray-400" : "text-gray-500";

  // Custom OVR colors
  const ovrColor =
    player.overall >= 85
      ? "bg-green-700 text-white"
      : player.overall >= 75
        ? "bg-green-500 text-white"
        : player.overall >= 65
          ? "bg-yellow-500 text-black"
          : player.overall >= 55
            ? "bg-orange-500 text-white"
            : "bg-red-500 text-white";

  // Utilities for Fake details
  const pseudoRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const rnd = pseudoRandom(player.id);
  const isGk = player.position === "GK";

  // Mocks based on id
  const weight = player.height - 100 + Math.floor(rnd * 12);
  const preferredFoot =
    pseudoRandom(player.id + 1) > 0.75 ? "Esquerdo" : "Direito";
  const shirtNumber = Math.floor(pseudoRandom(player.id + 2) * 89) + 1;
  const secondaryPos =
    player.secondaryPositions?.join(", ") ||
    (isGk
      ? ""
      : player.position === "CB"
        ? "RB, LB"
        : player.position === "CM"
          ? "CDM, CAM"
          : "ST, RW");
  const natTeam =
    pseudoRandom(player.id + 3) > 0.9 ? "Brasil" : "Não convocado";
  const marketValue =
    player.marketValue ||
    Math.floor(
      Math.pow(player.overall, 3) *
        10 *
        (1 - Math.max(0, player.age - 26) * 0.05),
    );

  const ratingColor = (rtg: number) =>
    rtg >= 8.0
      ? "bg-green-500"
      : rtg >= 7.0
        ? "bg-green-400"
        : rtg >= 6.0
          ? "bg-yellow-500"
          : "bg-red-500";

  const form = Array.from({ length: 5 }).map(() => {
    return {
      val: "-",
      color: dark ? "bg-gray-800 text-gray-500" : "bg-gray-200 text-gray-400",
    };
  });

  // Current season stats
  const currentSeasonStats = stats || {
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    matches: 0,
    conceded: 0,
    saves: 0,
  };

  // Past seasons
  const pastSeasons = (playerHistory[player.id] || [])
    .map((s) => ({
      year: s.year,
      club: s.club,
      comp: s.comp,
      matches: s.matches,
      goals: s.goals,
      assists: s.assists,
      conceded: 0,
      savePct: "-",
      avg: s.avg,
    }))
    .reverse();

  let totalMatches = currentSeasonStats.matches;
  let totalGoals = currentSeasonStats.goals;
  let totalAssists = currentSeasonStats.assists;
  let totalCards = currentSeasonStats.yellowCards + currentSeasonStats.redCards;
  let totalClubsSet = new Set(["Clube Atual"]);

  pastSeasons.forEach((s) => {
    totalMatches += s.matches;
    totalGoals += s.goals;
    totalAssists += s.assists;
    totalClubsSet.add(s.club);
  });

  const allTitles = player.careerTrophies || [];
  const indTitles = allTitles.filter(
    (t: any) =>
      t.type === "individual" ||
      t.name.includes("Melhor") ||
      t.name.includes("Artilheiro"),
  );
  const colTitles = allTitles.filter((t: any) => !indTitles.includes(t));

  if (allTitles.length === 0 && pseudoRandom(player.id) > 0.8) {
    indTitles.push({ name: "Seleção do Campeonato", season: 2023 });
  }

  // Atributos renderer
  const renderBar = (label: string, val: number) => {
    const color =
      val >= 80
        ? "bg-green-500"
        : val >= 65
          ? "bg-yellow-500"
          : val >= 50
            ? "bg-orange-500"
            : "bg-red-500";
    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs font-bold mb-0.5">
          <span>{label}</span>
          <span>{val}</span>
        </div>
        <div
          className={`w-full ${dark ? "bg-gray-700" : "bg-gray-200"} rounded-full h-1.5`}
        >
          <div
            className={`${color} h-1.5 rounded-full`}
            style={{ width: `${Math.min(100, val)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const groupPhysical = Math.round((player.pace * 2 + player.physical) / 3);
  const groupTechnical = Math.round(
    (player.passing + player.dribbling + player.shooting) / 3,
  );
  const groupDefensive = player.defense;
  const leagueAvg = isGk ? 72 : 74;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 sm:p-6 lg:p-8 backdrop-blur-sm overflow-hidden"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-5xl max-h-full flex flex-col rounded-2xl shadow-2xl ${bg} ${tx} outline outline-1 ${border} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors backdrop-blur-md"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* HERO SECTION */}
        <div
          className={`shrink-0 relative p-6 sm:p-8 rounded-t-2xl border-b ${border} overflow-hidden ${dark ? "bg-gradient-to-br from-gray-800 to-gray-900" : "bg-gradient-to-br from-gray-100 to-white"}`}
        >
          <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
            <span className="text-[15rem] font-black leading-none">
              {player.overall}
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-6 relative z-10">
            {/* Avatar / OVR */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative">
                <img
                  src={`https://ui-avatars.com/api/?name=${player.name.replace(/ /g, "+")}&background=random&color=fff&size=120&bold=true`}
                  className="w-28 h-28 rounded-full border-4 border-white/10 shadow-lg object-cover"
                  alt="Face"
                />
                <div
                  className={`absolute -bottom-2 -right-2 w-12 h-12 flex items-center justify-center rounded-full font-black text-xl border-4 ${border} ${ovrColor} shadow-lg`}
                >
                  {player.overall}
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-black tracking-tight">
                  {player.name}
                </h2>
                <img
                  src="https://flagsapi.com/BR/flat/32.png"
                  className="w-6 h-6 shadow-sm"
                  alt="BR"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3 text-sm font-bold uppercase tracking-wider">
                <span className={`${tx}`}>{player.position}</span>
                {secondaryPos && <span className={sub}>{secondaryPos}</span>}
                <span className="text-gray-400">·</span>
                <span className={sub}>{player.age} ANOS</span>
                <span className="text-gray-400">·</span>
                <span className={sub}>{player.height}CM</span>
              </div>

              {/* Badges / Quick stats */}
              <div className="flex flex-wrap gap-2 mt-auto">
                <div
                  className={`px-2.5 py-1 rounded bg-black/10 text-xs font-bold`}
                >
                  POT{" "}
                  <span className="opacity-70 ml-1 block inline">
                    {player.potential}
                  </span>
                </div>
                <div
                  className={`px-2.5 py-1 rounded bg-black/10 text-xs font-bold`}
                >
                  VALOR{" "}
                  <span className="opacity-70 ml-1 block inline">
                    {fmtMoney(marketValue)}
                  </span>
                </div>
                <div
                  className={`px-2.5 py-1 rounded bg-black/10 text-xs font-bold`}
                >
                  CONTRATO{" "}
                  <span className="opacity-70 ml-1 block inline">
                    {player.contractYears}A
                  </span>
                </div>
                <div
                  className={`px-2.5 py-1 rounded bg-black/10 text-xs font-bold flex items-center gap-1`}
                >
                  MORAL{" "}
                  <span>{moraleLabel(state?.morale ?? 75).split(" ")[0]}</span>
                </div>
              </div>
            </div>

            {/* Form & Current State */}
            <div className="flex flex-col items-start md:items-end md:ml-auto">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest ${sub} mb-1`}
              >
                Últimas 5 Partidas
              </span>
              <div className="flex gap-1 mb-4">
                {form.map((f, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm ${f.color}`}
                  >
                    {f.val}
                  </div>
                ))}
              </div>
              {state?.injuryWeeks > 0 && (
                <div className="bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded font-bold text-xs">
                  Lesionado: {state.injuryWeeks} Semanas
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-t-0 p-0 overflow-y-auto">
          {/* LEFT COL: INFO + ATRIBUTOS */}
          <div className="w-full md:w-1/3 shrink-0 p-6 sm:p-8">
            {/* INFO */}
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 opacity-50 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span> INFO
              PESSOAL
            </h3>
            <div
              className={`grid grid-cols-2 gap-3 mb-8 text-sm ${bgSoft} p-4 rounded-xl border ${border}`}
            >
              <div>
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Camisa
                </span>
                <strong className="text-lg">#{shirtNumber}</strong>
              </div>
              <div>
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Pé Pref.
                </span>
                <strong>{preferredFoot}</strong>
              </div>
              <div>
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Peso
                </span>
                <strong>{weight} kg</strong>
              </div>
              <div>
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Seleção
                </span>
                <strong>{natTeam}</strong>
              </div>
              <div className="col-span-2">
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Salário Anual
                </span>
                <strong>{fmtMoney(player.salary * 12)}</strong>
              </div>
            </div>

            {/* ATRIBUTOS */}
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 opacity-50 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>{" "}
              ATRIBUTOS
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <span
                  className={`text-[10px] uppercase font-bold border-b ${border} pb-1 mb-2 block ${sub}`}
                >
                  Físico
                </span>
                {renderBar("Velocidade", player.pace)}
                {renderBar("Físico", player.physical)}
              </div>
              {!isGk && (
                <div>
                  <span
                    className={`text-[10px] uppercase font-bold border-b ${border} pb-1 mb-2 block ${sub}`}
                  >
                    Técnico
                  </span>
                  {renderBar("Finalização", player.shooting)}
                  {renderBar("Passe", player.passing)}
                  {renderBar("Drible", player.dribbling)}
                </div>
              )}
              <div>
                <span
                  className={`text-[10px] uppercase font-bold border-b ${border} pb-1 mb-2 block ${sub}`}
                >
                  Defensivo
                </span>
                {renderBar("Defesa", player.defense)}
              </div>
            </div>

            <div
              className={`text-xs font-medium p-3 rounded-lg ${dark ? "bg-black/30 text-gray-400" : "bg-gray-100 text-gray-600"}`}
            >
              Este jogador: <strong className={tx}>{player.overall}</strong> ·
              Média Liga: <strong>{leagueAvg}</strong> ·{" "}
              <strong className={tx}>
                #{Math.floor(pseudoRandom(player.id) * 10) + 1}
              </strong>{" "}
              de 47
            </div>
          </div>

          {/* RIGHT COL: CARREIRA + PREMIOS */}
          <div
            className={`w-full md:w-2/3 p-6 sm:p-8 ${dark ? "bg-gray-800/20" : "bg-gray-50"}`}
          >
            {/* CARREIRA */}
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 opacity-50 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>{" "}
              TOTAIS DE CARREIRA
            </h3>
            <div className="grid grid-cols-5 gap-2 mb-6">
              <div
                className={`relative p-3 rounded-xl border ${border} ${bg} overflow-hidden`}
              >
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Jogos
                </span>
                <span className="text-xl font-black">{totalMatches}</span>
              </div>
              <div
                className={`relative p-3 rounded-xl border ${border} ${bg} overflow-hidden`}
              >
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Gols
                </span>
                <span className="text-xl font-black text-green-500">
                  {totalGoals}
                </span>
              </div>
              <div
                className={`relative p-3 rounded-xl border ${border} ${bg} overflow-hidden`}
              >
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Assists
                </span>
                <span className="text-xl font-black text-blue-500">
                  {totalAssists}
                </span>
              </div>
              <div
                className={`relative p-3 rounded-xl border ${border} ${bg} overflow-hidden`}
              >
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Cartões
                </span>
                <span className="text-xl font-black text-yellow-600">
                  {totalCards}
                </span>
              </div>
              <div
                className={`relative p-3 rounded-xl border ${border} ${bg} overflow-hidden`}
              >
                <span
                  className={`block text-[10px] uppercase font-bold ${sub}`}
                >
                  Clubes
                </span>
                <span className="text-xl font-black">{totalClubsSet.size}</span>
              </div>
            </div>

            <div
              className={`rounded-xl border ${border} ${bg} overflow-hidden mb-8`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead
                    className={`text-[10px] uppercase font-bold ${sub} bg-black/5`}
                  >
                    <tr>
                      <th className="p-3">Temporada</th>
                      <th className="p-3">Clube</th>
                      <th className="p-3 text-center">J</th>
                      {isGk ? (
                        <>
                          <th className="p-3 text-center">GS</th>
                          <th className="p-3 text-center">% Def</th>
                        </>
                      ) : (
                        <>
                          <th className="p-3 text-center">G</th>
                          <th className="p-3 text-center">A</th>
                        </>
                      )}
                      <th className="p-3 text-center">Méd</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${border}`}>
                    <tr className={dark ? "bg-white/5" : "bg-black/5"}>
                      <td className="p-3 font-medium">Atual</td>
                      <td className="p-3 font-bold">Clube Atual</td>
                      <td className="p-3 text-center font-bold">
                        {currentSeasonStats.matches}
                      </td>
                      {isGk ? (
                        <>
                          <td className="p-3 text-center text-red-500">
                            {currentSeasonStats.conceded || 0}
                          </td>
                          <td className="p-3 text-center">-</td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-center font-bold text-green-500">
                            {currentSeasonStats.goals}
                          </td>
                          <td className="p-3 text-center font-bold text-blue-500">
                            {currentSeasonStats.assists}
                          </td>
                        </>
                      )}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-white font-bold text-xs ${ratingColor(Number(form[form.length - 1].val))}`}
                        >
                          {form[form.length - 1].val}
                        </span>
                      </td>
                    </tr>
                    {pastSeasons.map((s, idx) => (
                      <tr
                        key={idx}
                        className="opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <td className="p-3 font-medium">{s.year}</td>
                        <td className="p-3">{s.club}</td>
                        <td className="p-3 text-center">{s.matches}</td>
                        {isGk ? (
                          <>
                            <td className="p-3 text-center text-red-500 opacity-80">
                              {s.conceded}
                            </td>
                            <td className="p-3 text-center font-medium">
                              {s.savePct}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 text-center font-bold opacity-80">
                              {s.goals > 0 ? s.goals : "-"}
                            </td>
                            <td className="p-3 text-center font-bold opacity-80">
                              {s.assists > 0 ? s.assists : "-"}
                            </td>
                          </>
                        )}
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-white font-bold text-xs ${ratingColor(Number(s.avg))}`}
                          >
                            {s.avg}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PREMIOS */}
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 opacity-50 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: "gold" }}
              ></span>{" "}
              SALA DE TROFÉUS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Individuais */}
              <div
                className={`p-4 rounded-xl border-2 ${dark ? "border-[#D4AF37]/30 bg-black/20" : "border-[#D4AF37]/50 bg-amber-50"} h-full flex flex-col`}
              >
                <h4 className="text-xs font-bold uppercase mb-3 text-[#D4AF37]">
                  Prémios Individuais
                </h4>
                {indTitles.length > 0 ? (
                  <ul className="space-y-2 mt-auto">
                    {indTitles.map((t: any, i: number) => (
                      <li key={i} className="flex gap-2 items-start text-sm">
                        <span>🥇</span>
                        <div className="leading-tight">
                          <span className="font-bold block">{t.name}</span>
                          <span className={`text-[10px] ${sub}`}>
                            Ano {t.season}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-xs ${sub} italic mt-auto`}>
                    Nenhum prémio individual.
                  </p>
                )}
              </div>

              {/* Coletivos */}
              <div
                className={`p-4 rounded-xl border-2 ${dark ? "border-green-500/30 bg-black/20" : "border-green-500/50 bg-green-50"} h-full flex flex-col`}
              >
                <h4 className="text-xs font-bold uppercase mb-3 text-green-600 dark:text-green-500">
                  Títulos Coletivos
                </h4>
                {colTitles.length > 0 ? (
                  <ul className="space-y-2 mt-auto">
                    {colTitles.map((t: any, i: number) => (
                      <li key={i} className="flex gap-2 items-start text-sm">
                        <span>🏆</span>
                        <div className="leading-tight">
                          <span className="font-bold block">{t.name}</span>
                          <span className={`text-[10px] ${sub}`}>
                            Ano {t.season}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-xs ${sub} italic mt-auto`}>
                    Nenhum título coletivo.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TacticsPanel({
  tactics,
  setTactics,
  dark,
}: {
  tactics: TacticalSettings;
  setTactics: (t: TacticalSettings) => void;
  dark: boolean;
}) {
  const sub = dark ? "text-gray-400" : "text-gray-600";
  const btn = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold ${active ? "bg-white text-black" : dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}`;
  function row(label: string, desc: string, node: React.ReactNode) {
    return (
      <div
        className={`py-3 border-b ${dark ? "border-gray-700/50" : "border-gray-200"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p
              className={`text-xs font-semibold ${dark ? "text-gray-200" : "text-gray-800"}`}
            >
              {label}
            </p>
            <p className={`text-xs ${sub}`}>{desc}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">{node}</div>
        </div>
      </div>
    );
  }
  return (
    <div>
      {row(
        "Mentalidade",
        "Postura geral",
        <>
          {(["defensive", "balanced", "attacking"] as const).map((v) => (
            <button
              key={v}
              className={btn(tactics.mentality === v)}
              onClick={() => setTactics({ ...tactics, mentality: v })}
            >
              {v === "defensive" ? "Def" : v === "balanced" ? "Equil" : "Ataq"}
            </button>
          ))}
        </>,
      )}
      {row(
        "Linha defensiva",
        "Altura da defesa",
        <>
          {(["deep", "medium", "high"] as const).map((v) => (
            <button
              key={v}
              className={btn(tactics.defensiveLine === v)}
              onClick={() => setTactics({ ...tactics, defensiveLine: v })}
            >
              {v === "deep" ? "Baixa" : v === "medium" ? "Média" : "Alta"}
            </button>
          ))}
        </>,
      )}
      {row(
        "Pressão",
        "Intensidade da marcação",
        <>
          {(["low", "medium", "high"] as const).map((v) => (
            <button
              key={v}
              className={btn(tactics.pressingIntensity === v)}
              onClick={() => setTactics({ ...tactics, pressingIntensity: v })}
            >
              {v === "low" ? "Baixa" : v === "medium" ? "Média" : "Alta"}
            </button>
          ))}
        </>,
      )}
      {row(
        "Estilo",
        "Forma de jogar",
        <>
          {(["direct", "balanced", "possession"] as const).map((v) => (
            <button
              key={v}
              className={btn(tactics.playStyle === v)}
              onClick={() => setTactics({ ...tactics, playStyle: v })}
            >
              {v === "direct" ? "Direto" : v === "balanced" ? "Equil" : "Posse"}
            </button>
          ))}
        </>,
      )}
      {row(
        "Largura",
        "Amplitude do ataque",
        <>
          {(["narrow", "balanced", "wide"] as const).map((v) => (
            <button
              key={v}
              className={btn(tactics.offensiveWidth === v)}
              onClick={() => setTactics({ ...tactics, offensiveWidth: v })}
            >
              {v === "narrow" ? "Estr" : v === "balanced" ? "Normal" : "Aberta"}
            </button>
          ))}
        </>,
      )}
      {row(
        "Contra-ataque",
        "Explorar espaços",
        <>
          <button
            className={btn(tactics.counterAttack)}
            onClick={() => setTactics({ ...tactics, counterAttack: true })}
          >
            Sim
          </button>
          <button
            className={btn(!tactics.counterAttack)}
            onClick={() => setTactics({ ...tactics, counterAttack: false })}
          >
            Não
          </button>
        </>,
      )}
      {row(
        "Laterais",
        "Apoio no ataque",
        <>
          <button
            className={btn(tactics.fullbackSupport)}
            onClick={() => setTactics({ ...tactics, fullbackSupport: true })}
          >
            Sim
          </button>
          <button
            className={btn(!tactics.fullbackSupport)}
            onClick={() => setTactics({ ...tactics, fullbackSupport: false })}
          >
            Não
          </button>
        </>,
      )}
      {row(
        "Compactação",
        "Bloco defensivo",
        <>
          <button
            className={btn(tactics.compactDefense)}
            onClick={() => setTactics({ ...tactics, compactDefense: true })}
          >
            Sim
          </button>
          <button
            className={btn(!tactics.compactDefense)}
            onClick={() => setTactics({ ...tactics, compactDefense: false })}
          >
            Não
          </button>
        </>,
      )}
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Game() {
  const dark = useDarkMode().isDarkMode;
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { advanceTransferDay } = useTransfer();
  const {
    selectedTeam,
    playerStates,
    tactics,
    setTactics,
    matchHistory,
    addMatchRecord,
    currentDate,
    currentDayName,
    currentDateStr,
    todayMatch,
    nextMatch,
    daysUntilNextMatch,
    currentRound,
    advanceDay,
    markMatchPlayed,
    todayTraining,
    setTodayTraining,
    autoSuggestTraining,
    individualPlans,
    updateIndividualPlan,
    balance,
    monthlyIncome,
    wageBill,
    addFunds,
    standings,
    recordLeagueResult,
    news,
    addNews,
    pendingContracts,
    proposeContract,
    resolveContract,
    applyFatigueDrops,
    season,
    buildSaveData,
    seasonFinished,
    clubTrophies,
    cupMatches,
    advanceSeason,
    facilities,
    upgradeFacility,
    myStaff,
    availableStaff,
    hireStaff,
    fireStaff,
    isSimulating,
    setIsSimulating,
    playerStats,
    playerHistory,
    recordMatchPlayerStats,
  } = useGame();

  const settings = loadSettings();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [leagueTab, setLeagueTab] = useState<
    "classification" | "stats" | "champions"
  >("classification");
  const [playerStatsTab, setPlayerStatsTab] = useState<
    "goals" | "assists" | "cards"
  >("goals");
  const [matchData, setMatchData] = useState<ReturnType<
    typeof simulateMatch
  > | null>(null);
  const [opponent, setOpponent] = useState<(typeof allTeams)[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [lineupActionPlayer, setLineupActionPlayer] = useState<any>(null);
  const [substituteTarget, setSubstituteTarget] = useState<number | null>(null);
  const [formation, setFormation] = useState<Formation>("4-4-2");
  const [squadSort, setSquadSort] = useState<
    "name" | "position" | "overall" | "salary" | "fatigue" | "age"
  >("overall");
  const [lineup, setLineup] = useState<(number | null)[]>([]);
  const [lineupMode, setLineupMode] = useState<"auto" | "manual">("auto");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showTeamModal, setShowTeamModal] = useState<Team | null>(null);
  const [showContractModal, setShowContractModal] = useState<any>(null);
  const [contractSalary, setContractSalary] = useState(0);
  const [contractYears, setContractYears] = useState(2);
  const [saveSlotModal, setSaveSlotModal] = useState(false);
  const [showSimConfirm, setShowSimConfirm] = useState(false);
  const [lastSaveMsg, setLastSaveMsg] = useState<string | null>(null);
  const [inMatchTactics, setInMatchTactics] =
    useState<TacticalSettings>(tactics);
  const [viewLeagueId, setViewLeagueId] = useState<string | null>(null);
  const [staffSearch, setStaffSearch] = useState("");

  useEffect(() => {
    if (tactics.formationName) {
      setFormation(tactics.formationName as Formation);
    }
  }, [tactics.formationName]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [activeTab]);

  const lastTransferDayRef = useRef<string | null>(null);
  // Hook into currentDateStr to trigger Transfer Market AI each day
  useEffect(() => {
    if (!currentDateStr || !allTeams || !selectedTeam) return;
    if (lastTransferDayRef.current === currentDateStr) return;
    lastTransferDayRef.current = currentDateStr;

    const diff = Math.floor(
      (currentDate.getTime() - getSeasonStartDate().getTime()) /
        (1000 * 3600 * 24),
    );
    advanceTransferDay(currentDate, season, diff, allTeams, selectedTeam.id);
  }, [currentDateStr, season, advanceTransferDay, currentDate, selectedTeam]);

  const handleSetFormation = (f: Formation) => {
    setFormation(f);
    setTactics({ ...tactics, formationName: f }); // Note: tactic.lineup will be rebuilt automatically by the useEffect
  };

  const lastMonthRef = useRef(currentDate.getMonth());
  useEffect(() => {
    const currentMonth = currentDate.getMonth();
    if (currentMonth !== lastMonthRef.current) {
      lastMonthRef.current = currentMonth;
      if (settings.autoSave === "monthly") {
        setTimeout(() => {
          const d = buildSaveData();
          if (d)
            saveGame(
              settings.autoSaveSlot,
              d,
              selectedTeam?.name ?? "",
              selectedTeam?.abbreviation ?? "",
            );
        }, 200);
      }
    }
  }, [
    currentDate,
    buildSaveData,
    selectedTeam,
    settings.autoSave,
    settings.autoSaveSlot,
  ]);

  const isMatchDay = !!todayMatch;

  const nextOpponent = useMemo(() => {
    if (!selectedTeam || !nextMatch) return null;
    const oppId =
      nextMatch.homeId === selectedTeam.id
        ? nextMatch.awayId
        : nextMatch.homeId;
    return allTeams.find((t) => t.id === oppId) ?? null;
  }, [selectedTeam, nextMatch]);

  if (!selectedTeam)
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${dark ? "bg-gray-900" : "bg-white"}`}
      >
        <button
          onClick={() => navigate("/new-game")}
          className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold"
        >
          Escolher Time
        </button>
      </div>
    );

  const bg = dark ? "bg-gray-900" : "bg-gray-50";
  const card = dark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";
  const tx = dark ? "text-white" : "text-gray-900";
  const sub = dark ? "text-gray-400" : "text-gray-500";
  const div = dark ? "border-gray-700" : "border-gray-200";

  const posOrder: Record<string, number> = {
    GK: 0,
    CB: 1,
    LB: 2,
    RB: 3,
    CDM: 4,
    CM: 5,
    CAM: 6,
    LM: 7,
    RM: 8,
    LW: 9,
    RW: 10,
    ST: 11,
  };

  const filteredPlayers = useMemo(() => {
    let list = selectedTeam.players.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.position.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return [...list].sort((a, b) => {
      const sa = (playerStates || {})[a.id],
        sb = (playerStates || {})[b.id];
      switch (squadSort) {
        case "position":
          return (posOrder[a.position] ?? 99) - (posOrder[b.position] ?? 99);
        case "salary":
          return b.salary - a.salary;
        case "fatigue":
          return (sb?.fatigue ?? 100) - (sa?.fatigue ?? 100);
        case "age":
          return a.age - b.age;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return b.overall - a.overall;
      }
    });
  }, [selectedTeam.players, searchQuery, squadSort, playerStates]);

  const autoLineup = useMemo(() => {
    const slots = formationRows[formation].flat();
    const usedPlayers = new Set<number>();
    const usedSlots = new Set<number>();
    const result: (number | null)[] = new Array(slots.length).fill(null);

    // Greedy assignment: find the best available player for any available slot
    for (let step = 0; step < slots.length; step++) {
      let bestPlayer = null;
      let bestSlotIndex = -1;
      let maxOvr = -1;

      for (let i = 0; i < slots.length; i++) {
        if (usedSlots.has(i)) continue;
        const slot = slots[i];

        for (const p of selectedTeam.players) {
          if (usedPlayers.has(p.id)) continue;
          if ((playerStates || {})[p.id]?.injuryWeeks > 0) continue;

          const ev = getEffectiveOvr(p, slot);
          if (ev > maxOvr) {
            maxOvr = ev;
            bestPlayer = p;
            bestSlotIndex = i;
          }
        }
      }

      if (bestPlayer && bestSlotIndex !== -1) {
        result[bestSlotIndex] = bestPlayer.id;
        usedPlayers.add(bestPlayer.id);
        usedSlots.add(bestSlotIndex);
      }
    }

    // Fill any remaining slots with remaining players (fallback)
    for (let i = 0; i < slots.length; i++) {
      if (result[i] === null) {
        const fallback = selectedTeam.players.find(
          (p) => !usedPlayers.has(p.id) && !((playerStates || {})[p.id]?.injuryWeeks > 0)
        );
        if (fallback) {
          result[i] = fallback.id;
          usedPlayers.add(fallback.id);
        }
      }
    }

    return result;
  }, [selectedTeam.players, playerStates, formation]);
  const activeLineup = useMemo(() => {
    if (lineupMode === "manual") {
      return [...lineup];
    }
    return autoLineup;
  }, [lineupMode, lineup, autoLineup]);

  const handleSlotTap = (slotIndex: number) => {
    if (slotIndex === -1) {
      setSelectedSlot(null);
      return;
    }

    if (lineupMode === "auto") {
      setLineup([...activeLineup]);
      setLineupMode("manual");
    }

    if (selectedSlot !== null) {
      if (selectedSlot === slotIndex) {
        setSelectedSlot(null);
      } else {
        const newLineup = [...activeLineup];
        const temp = newLineup[selectedSlot];
        newLineup[selectedSlot] = newLineup[slotIndex];
        newLineup[slotIndex] = temp;
        setLineup(newLineup);
        setSelectedSlot(null);
      }
      return;
    }

    const playerId = activeLineup[slotIndex];
    if (playerId) {
      const player = selectedTeam?.players.find((p) => p.id === playerId);
      if (player) {
         setLineupActionPlayer({ ...player, slotIndex });
      }
    } else {
      setSelectedSlot(slotIndex);
    }
  };

  useEffect(() => {
    const flatPositions = formationRows[formation].flat();
    setTactics((prev) => {
      const isSame =
        prev.lineup?.length === flatPositions.length &&
        prev.lineup.every(
          (s, i) =>
            s.playerId === (activeLineup[i] || null) &&
            s.label === flatPositions[i],
        ) &&
        prev.formationName === formation;
      if (isSame) return prev;

      const newLineup = flatPositions.map((pos, i) => ({
        id: `slot-${i}`,
        playerId: activeLineup[i] || null,
        label: pos,
        x: 0,
        y: 0,
      }));
      return { ...prev, lineup: newLineup, formationName: formation };
    });
  }, [activeLineup, formation, setTactics]);

  async function handleManualSave(slot: number) {
    const data = buildSaveData();
    if (!data || !selectedTeam) return;
    await saveGame(slot, data, selectedTeam.name, selectedTeam.abbreviation);
    setSaveSlotModal(false);
    setLastSaveMsg(`Salvo no Slot ${slot}`);
    setTimeout(() => setLastSaveMsg(null), 2500);
  }

  function handlePlay() {
    if (!selectedTeam || !todayMatch || !nextOpponent) return;
    
    // Use current tactics to avoid stale state issues, 
    // since setInMatchTactics is async
    const currentTactics = { ...tactics };
    setInMatchTactics(currentTactics);
    
    const myFat: Record<number, number> = {};
    selectedTeam.players.forEach((p) => {
      myFat[p.id] = (playerStates || {})[p.id]?.fatigue ?? 100;
    });
    const oppFat: Record<number, number> = {};
    nextOpponent.players.forEach((p) => {
      oppFat[p.id] = 100;
    });
    const aiT = { ...defaultTactics };
    const r = Math.random();
    aiT.mentality = r < 0.4 ? "attacking" : r < 0.7 ? "balanced" : "defensive";

    let result;
    if (todayMatch.homeId === selectedTeam.id) {
      result = simulateMatch(
        selectedTeam,
        nextOpponent,
        myFat,
        oppFat,
        currentTactics,
        aiT,
      );
    } else {
      result = simulateMatch(
        nextOpponent,
        selectedTeam,
        oppFat,
        myFat,
        aiT,
        currentTactics,
      );
    }

    setMatchData(result);
    setOpponent(nextOpponent);
  }

  function handleMatchClose(subs: SubstitutionRecord[]) {
    if (!selectedTeam || !matchData || !opponent || !todayMatch) return;

    // Check if we are home or away
    const isMeHome = todayMatch.homeId === selectedTeam.id;

    // Determine win/loss from my perspective
    const myGoals = isMeHome ? matchData.homeGoals : matchData.awayGoals;
    const oppGoals = isMeHome ? matchData.awayGoals : matchData.homeGoals;

    const isWin = myGoals > oppGoals;
    const isDraw = myGoals === oppGoals;
    const drops = { ...matchData.fatigueDrops };
    subs.forEach((s) => {
      if (drops[s.outId] !== undefined)
        drops[s.outId] = Math.floor(drops[s.outId] * 0.6);
      drops[s.inId] = Math.floor((drops[s.outId] ?? 10) * 0.4);
    });
    applyFatigueDrops(drops, isWin, isDraw);

    const hTeamObj = isMeHome ? selectedTeam : opponent;
    const aTeamObj = isMeHome ? opponent : selectedTeam;

    recordMatchPlayerStats(matchData.events, hTeamObj, aTeamObj);

    const hStats = {
      yellow: matchData.stats.yellowCards[0],
      red: matchData.stats.redCards[0],
      assists: matchData.stats.assists[0],
    };
    const aStats = {
      yellow: matchData.stats.yellowCards[1],
      red: matchData.stats.redCards[1],
      assists: matchData.stats.assists[1],
    };

    recordLeagueResult(
      todayMatch.homeId,
      todayMatch.awayId,
      matchData.homeGoals,
      matchData.awayGoals,
      hStats,
      aStats,
      todayMatch.competitionId,
    );
    markMatchPlayed(
      todayMatch.competitionId,
      todayMatch.round,
      todayMatch.homeId,
      todayMatch.awayId,
      matchData.homeGoals,
      matchData.awayGoals,
    );
    addMatchRecord({
      round: currentRound,
      opponent: opponent.name,
      homeGoals: matchData.homeGoals,
      awayGoals: matchData.awayGoals,
      isHome: isMeHome,
      date: currentDateStr,
    });

    let ticketRevenue = 0;
    if (todayMatch.homeId === selectedTeam.id) {
      ticketRevenue = 100 * facilities.stadium; // Home match revenue
      addFunds(ticketRevenue);
    }
    const winBonus = isWin ? 500 : isDraw ? 100 : 0;
    if (winBonus > 0) addFunds(winBonus);

    addNews({
      type: "result",
      title: `${selectedTeam.abbreviation} ${matchData.homeGoals}–${matchData.awayGoals} ${opponent.abbreviation}`,
      body:
        (isWin ? "Vitória!" : "") +
        (ticketRevenue > 0 ? ` (Bilheteria: +${ticketRevenue}K)` : ""),
      date: currentDateStr,
    });
    if (settings.autoSave === "after_match") {
      setTimeout(() => {
        const d = buildSaveData();
        if (d)
          saveGame(
            settings.autoSaveSlot,
            d,
            selectedTeam.name,
            selectedTeam.abbreviation,
          );
      }, 200);
    }
    setMatchData(null);
    setOpponent(null);
    // Avança automaticamente para o dia seguinte após o jogo
    advanceDay();
  }

  const viewStandings = useMemo(() => {
    const targetLid = viewLeagueId || selectedTeam.leagueId;
    return standings.filter((s) => {
      const t = allTeams.find((tx) => tx.id === s.teamId);
      return t && t.leagueId === targetLid;
    });
  }, [standings, selectedTeam.leagueId, viewLeagueId]);
  const sortedStandings = sortStandings(viewStandings);

  // Need my actual standing specifically for dashboard stats
  const actualMyLeagueStandings = useMemo(() => {
    return standings.filter((s) => {
      const t = allTeams.find((tx) => tx.id === s.teamId);
      return t && t.leagueId === selectedTeam.leagueId;
    });
  }, [standings, selectedTeam.leagueId]);
  const mySortedStandings = sortStandings(actualMyLeagueStandings);
  const myStanding = mySortedStandings.find(
    (s) => s.teamId === selectedTeam.id,
  );
  const myPos =
    mySortedStandings.findIndex((s) => s.teamId === selectedTeam.id) + 1;

  const seasonReviewStats = useMemo(() => {
    if (!selectedTeam || !seasonFinished) return null;

    // Liga
    const isChampion = myPos === 1;

    // Copa
    const myCountry = LEAGUES[selectedTeam.leagueId]?.country;
    const cupMatchesMyCountry = cupMatches.filter((m) => {
      const ht = allTeams.find((t) => t.id === m.homeId);
      return ht && LEAGUES[ht.leagueId]?.country === myCountry;
    });
    const myCupFinal = cupMatchesMyCountry.find(
      (m) => !m.nextMatchId && m.played,
    );

    let isCupChampion = false;
    if (myCupFinal) {
      const hg = myCupFinal.homeGoals ?? 0;
      const ag = myCupFinal.awayGoals ?? 0;
      const cupWinnerId =
        hg > ag
          ? myCupFinal.homeId
          : ag > hg
            ? myCupFinal.awayId
            : myCupFinal.homeId;
      isCupChampion = cupWinnerId === selectedTeam.id;
    }

    // Destaques do time
    const myPlayers = selectedTeam.players;
    let topScorer = myPlayers[0];
    let topAssists = myPlayers[0];

    if (myPlayers.length > 0) {
      myPlayers.forEach((p) => {
        const stats = (playerStats || {})[p.id] || {
          goals: 0,
          assists: 0,
          matches: 0,
        };
        const ts = (playerStats || {})[topScorer.id] || { goals: 0 };
        const ta = (playerStats || {})[topAssists.id] || { assists: 0 };
        if (stats.goals > ts.goals) topScorer = p;
        if (stats.assists > ta.assists) topAssists = p;
      });
    }

    return {
      myPos,
      isChampion,
      isCupChampion,
      topScorer,
      topAssists,
    };
  }, [selectedTeam, seasonFinished, cupMatches, playerStats, myPos]);

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: "dashboard", icon: "📊", label: "Início" },
    { key: "squad", icon: "👥", label: "Elenco" },
    { key: "tactics", icon: "🎯", label: "Táticas" },
    { key: "training", icon: "🏋️", label: "Treino" },
    { key: "finances", icon: "💰", label: "Finanças" },
    { key: "competitions", icon: "🏆", label: "Liga" },
    { key: "transfers", icon: "🔄", label: "Mercado" },
    { key: "facilities", icon: "🏢", label: "Clube" },
    { key: "news", icon: "📰", label: "Notícias" },
    { key: "history", icon: "⏱️", label: "Histórico" },
  ];

  return (
    <>
      {showSimConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center px-4 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${bg}`}
          >
            <h2 className={`text-xl font-bold mb-4 ${tx}`}>
              Simular Temporada?
            </h2>
            <p className={`text-sm mb-6 ${sub}`}>
              Tem certeza que deseja simular o resto da temporada e os seus
              jogos usando as táticas atuais? Isso pode levar alguns segundos.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSimConfirm(false)}
                className={`flex-1 py-2.5 rounded-xl font-medium border ${card}`}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowSimConfirm(false);
                  setIsSimulating(true);
                }}
                className="flex-1 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Simular Jogo a Jogo
              </button>
            </div>
          </div>
        </div>
      )}

      {isSimulating && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Simulando...</h2>
          <p className="text-gray-300 text-sm opacity-80 max-w-sm text-center mb-4">
            A temporada está sendo simulada junto de outros campeonatos e copas.
            Isso pode levar alguns segundos.
          </p>
          <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 text-sm font-mono text-blue-300 mb-6">
            {currentDate.toLocaleDateString("pt-BR")}
          </div>
          <button
            onClick={() => setIsSimulating(false)}
            className="px-6 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Parar Simulação
          </button>
        </div>
      )}

      {matchData && opponent && (
        <MatchScreen
          homeTeam={selectedTeam}
          awayTeam={opponent}
          result={matchData}
          playerStates={playerStates}
          currentTactics={inMatchTactics}
          onTacticsChange={setInMatchTactics}
          onClose={handleMatchClose}
        />
      )}
      {selectedPlayer && (
        <PlayerCard
          player={selectedPlayer}
          state={(playerStates || {})[selectedPlayer.id]}
          stats={(playerStats || {})[selectedPlayer.id]}
          playerHistory={playerHistory}
          dark={dark}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {/* MODAL CONTRATO */}
      {showContractModal &&
        (() => {
          const p = showContractModal;
          const pending = pendingContracts.find((c) => c.playerId === p.id);
          return (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
              <div
                className={`w-full max-w-md rounded-t-2xl border-t border-x p-5 ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className={`text-base font-bold ${tx}`}>{p.name}</p>
                    <p className={`text-xs ${sub}`}>
                      {(p.positions ?? (p.secondaryPositions ? [p.position, ...p.secondaryPositions] : [p.position])).join(' / ')} · OVR {p.overall} · {p.contractYears}a
                      restante(s)
                    </p>
                  </div>
                  <button
                    onClick={() => setShowContractModal(null)}
                    className={`text-xl ${sub}`}
                  >
                    ✕
                  </button>
                </div>
                {pending?.status === "pending" && (
                  <div
                    className={`rounded-xl border p-3 mb-3 ${dark ? "border-yellow-700 bg-yellow-900/20" : "border-yellow-300 bg-yellow-50"}`}
                  >
                    <p
                      className={`text-xs font-bold ${dark ? "text-yellow-300" : "text-yellow-700"}`}
                    >
                      ⏳ Aguardando resposta...
                    </p>
                  </div>
                )}
                {pending?.status === "accepted" && (
                  <div
                    className={`rounded-xl border p-3 mb-3 ${dark ? "border-green-700 bg-green-900/20" : "border-green-200 bg-green-50"}`}
                  >
                    <p
                      className={`text-xs font-bold ${dark ? "text-green-300" : "text-green-700"}`}
                    >
                      ✅ Contrato renovado!
                    </p>
                  </div>
                )}
                {pending?.status === "rejected" && (
                  <div
                    className={`rounded-xl border p-3 mb-3 ${dark ? "border-red-700 bg-red-900/20" : "border-red-200 bg-red-50"}`}
                  >
                    <p
                      className={`text-xs font-bold ${dark ? "text-red-400" : "text-red-700"}`}
                    >
                      ❌ Proposta recusada.
                    </p>
                  </div>
                )}
                <div className="space-y-3 mb-4">
                  <div>
                    <p className={`text-xs ${sub} mb-1`}>
                      Salário proposto (K/mês) — atual: {p.salary}K
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={5000}
                      value={contractSalary || p.salary}
                      onChange={(e) =>
                        setContractSalary(Number(e.target.value))
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    />
                  </div>
                  <div>
                    <p className={`text-xs ${sub} mb-1`}>Duração</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setContractYears(n)}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold ${contractYears === n ? (dark ? "bg-white text-black" : "bg-gray-900 text-white") : dark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}
                        >
                          {n}a
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    proposeContract(
                      p.id,
                      contractSalary || p.salary,
                      contractYears,
                    )
                  }
                  disabled={!!pending && pending.status === "pending"}
                  className={`w-full py-3 rounded-xl text-sm font-bold mb-2 ${!!pending && pending.status === "pending" ? "bg-gray-600 text-gray-400" : "bg-green-600 text-white"}`}
                >
                  {pending?.status === "pending"
                    ? "Aguardando..."
                    : "Enviar proposta"}
                </button>
                <button
                  onClick={() => setShowContractModal(null)}
                  className={`w-full py-2 text-xs ${sub}`}
                >
                  Fechar
                </button>
              </div>
            </div>
          );
        })()}

      {/* MODAL SAVE */}
      {saveSlotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
          <div
            className={`w-full max-w-xs rounded-2xl border p-5 ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}
          >
            <div className="flex items-center justify-between mb-4">
              <p className={`text-base font-bold ${tx}`}>Salvar Jogo</p>
              <button
                onClick={() => setSaveSlotModal(false)}
                className={`text-xl ${sub}`}
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((slot) => {
                const info = (() => {
                  try {
                    const r = localStorage.getItem(
                      `elite_manager_save_${slot}_meta`,
                    );
                    return r ? JSON.parse(r) : null;
                  } catch {
                    return null;
                  }
                })();
                return (
                  <button
                    key={slot}
                    onClick={() => handleManualSave(slot)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}
                  >
                    <div className="text-left">
                      <p className={`text-sm font-bold ${tx}`}>Slot {slot}</p>
                      {info ? (
                        <p className={`text-xs ${sub}`}>
                          {info.teamName} · Rd {info.round}
                        </p>
                      ) : (
                        <p className={`text-xs ${sub}`}>Vazio</p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold ${dark ? "text-green-400" : "text-green-600"}`}
                    >
                      Salvar
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {lastSaveMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-xs font-bold px-5 py-2 rounded-full shadow-lg pointer-events-none">
          ✓ {lastSaveMsg}
        </div>
      )}

      {/* MODAL VITRINE DE TÍTULOS / DETALHES DO TIME */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-sm rounded-2xl border p-5 ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"} max-h-[80vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10">
                  <TeamLogo
                    teamId={showTeamModal.id}
                    logoUrl={showTeamModal.logoUrl}
                    fallbackName={showTeamModal.name}
                  />
                </div>
                <div>
                  <h3 className={`font-bold text-lg leading-tight ${tx}`}>
                    {showTeamModal.name}
                  </h3>
                  <p className={`text-xs ${sub}`}>{showTeamModal.city}</p>
                </div>
              </div>
              <button
                onClick={() => setShowTeamModal(null)}
                className={`text-xl ${sub} hover:${tx}`}
              >
                ✕
              </button>
            </div>

            <div className={`mt-4 pt-4 border-t ${div}`}>
              <h4
                className={`text-sm font-bold mb-3 flex items-center gap-2 ${tx}`}
              >
                🏆 Vitrine de Títulos
              </h4>
              {clubTrophies[showTeamModal.id] &&
              clubTrophies[showTeamModal.id].length > 0 ? (
                <div className="space-y-2">
                  {clubTrophies[showTeamModal.id].map((t, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-lg border ${dark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}
                    >
                      <span className={`text-xs font-semibold ${tx}`}>
                        {t.name}
                      </span>
                      <span
                        className={`text-xs ${sub} font-mono bg-gray-500/10 px-2 py-0.5 rounded`}
                      >
                        {t.season}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`text-center py-6 border border-dashed rounded-lg ${dark ? "border-gray-700 text-gray-500" : "border-gray-300 text-gray-400"}`}
                >
                  <p className="text-xs">Nenhum título ganho durante o save.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`min-h-screen flex flex-col ${bg}`}>
        {/* TOP BAR */}
        <div
          className={`sticky top-0 z-40 ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"} border-b px-4 py-3`}
        >
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/")}
                className={`text-xs px-2 py-1.5 rounded-lg border ${dark ? "border-gray-700 text-gray-400" : "border-gray-300 text-gray-500"}`}
              >
                ← Menu
              </button>
              <div className="w-8 h-8 flex-shrink-0">
                <TeamLogo
                  teamId={selectedTeam.id}
                  logoUrl={selectedTeam.logoUrl}
                  fallbackName={selectedTeam.name}
                />
              </div>
              <div>
                <p className={`font-bold text-sm leading-tight ${tx}`}>
                  {selectedTeam.abbreviation}
                </p>
                <p className={`text-xs ${sub}`}>
                  {currentDayName} {currentDateStr} · {season}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleFullscreen}
                className={`text-xs px-2 py-1.5 rounded-lg border flex items-center ${dark ? "border-gray-700 text-gray-400" : "border-gray-300 text-gray-500"}`}
                title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
              >
                {isFullscreen ? "🗗" : "🖵"}
              </button>
              <button
                onClick={() => setSaveSlotModal(true)}
                className={`text-xs px-2 py-1.5 rounded-lg border ${dark ? "border-gray-700 text-gray-400" : "border-gray-300 text-gray-500"}`}
              >
                💾
              </button>
              <div className="text-right">
                <p
                  className={`text-xs font-bold ${dark ? "text-green-400" : "text-green-600"}`}
                >
                  {fmtMoney(balance)}
                </p>
                <p className={`text-xs ${sub}`}>{myPos}º lugar</p>
              </div>
              {isMatchDay ? (
                <button
                  onClick={handlePlay}
                  className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg"
                >
                  🏟️ Jogar
                </button>
              ) : seasonFinished ? (
                <button
                  onClick={advanceSeason}
                  className={`text-xs px-4 py-2 rounded-lg font-bold bg-green-600 text-white`}
                >
                  Próxima Temporada →
                </button>
              ) : (
                <button
                  onClick={() => advanceDay(todayTraining ?? undefined)}
                  className={`text-xs px-4 py-2 rounded-lg border font-bold ${dark ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"}`}
                >
                  Avançar →
                </button>
              )}
            </div>
          </div>
          {/* Banner do dia */}
          <div className="max-w-2xl mx-auto mt-1.5">
            <div
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-center ${
                isMatchDay
                  ? dark
                    ? "bg-green-900/40 text-green-300 border border-green-800"
                    : "bg-green-50 text-green-700 border border-green-200"
                  : daysUntilNextMatch <= 1
                    ? dark
                      ? "bg-yellow-900/30 text-yellow-300 border border-yellow-800"
                      : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    : dark
                      ? "bg-gray-800 text-gray-400"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {isMatchDay
                ? `🏟️ DIA DE JOGO · ${selectedTeam.abbreviation} vs ${nextOpponent?.abbreviation}`
                : nextMatch
                  ? `Próximo jogo: ${nextOpponent?.abbreviation} em ${daysUntilNextMatch} dia(s)`
                  : "Sem jogos agendados"}
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto pb-24 max-w-2xl mx-auto w-full">
          <div className="px-4 pt-4">
            {/* DASHBOARD */}
            {activeTab === "dashboard" && (
              <div className="space-y-4">
                <h2 className={`text-base font-bold ${tx}`}>Dashboard</h2>

                {seasonFinished && seasonReviewStats && (
                  <div
                    className={`rounded-2xl border p-5 overflow-hidden relative shadow-md ${dark ? "bg-gradient-to-br from-indigo-900 to-slate-900 border-indigo-700" : "bg-gradient-to-br from-indigo-50 to-white border-indigo-200"}`}
                  >
                    <div className="absolute -top-4 -right-4 p-4 opacity-10 text-8xl">
                      🏆
                    </div>
                    <div className="relative z-10">
                      <h3
                        className={`text-xl font-black mb-1 ${dark ? "text-indigo-300" : "text-indigo-800"}`}
                      >
                        Resumo da Temporada {season}
                      </h3>
                      <p
                        className={`text-sm mb-5 ${dark ? "text-indigo-200" : "text-indigo-600"}`}
                      >
                        Estatísticas e destaques do {selectedTeam?.name}
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div
                          className={`rounded-xl p-3 bg-white/5 border ${dark ? "border-white/10" : "border-black/5"}`}
                        >
                          <p className="text-xs opacity-70 font-semibold uppercase">
                            Liga
                          </p>
                          <p className="text-xl font-bold p-1">
                            {seasonReviewStats.myPos}º Lugar
                          </p>
                          {seasonReviewStats.isChampion && (
                            <p className="text-xs text-yellow-500 font-bold px-1">
                              ⭐ Campeão!
                            </p>
                          )}
                        </div>

                        <div
                          className={`rounded-xl p-3 bg-white/5 border ${dark ? "border-white/10" : "border-black/5"}`}
                        >
                          <p className="text-xs opacity-70 font-semibold uppercase">
                            Copa
                          </p>
                          <p className="text-xl font-bold p-1">
                            {seasonReviewStats.isCupChampion
                              ? "Campeão"
                              : "Eliminado"}
                          </p>
                          {seasonReviewStats.isCupChampion && (
                            <p className="text-xs text-yellow-500 font-bold px-1">
                              ⭐ Título Inédito!
                            </p>
                          )}
                        </div>

                        <div
                          className={`rounded-xl p-3 bg-white/5 border ${dark ? "border-white/10" : "border-black/5"}`}
                        >
                          <p className="text-xs opacity-70 font-semibold uppercase">
                            Artilheiro
                          </p>
                          <p className="text-sm font-bold truncate px-1 mt-1">
                            {seasonReviewStats.topScorer.name}
                          </p>
                          <p className="text-sm px-1">
                            {(playerStats || {})[seasonReviewStats.topScorer.id]
                              ?.goals || 0}{" "}
                            Gols
                          </p>
                        </div>

                        <div
                          className={`rounded-xl p-3 bg-white/5 border ${dark ? "border-white/10" : "border-black/5"}`}
                        >
                          <p className="text-xs opacity-70 font-semibold uppercase">
                            Líder Assist.
                          </p>
                          <p className="text-sm font-bold truncate px-1 mt-1">
                            {seasonReviewStats.topAssists.name}
                          </p>
                          <p className="text-sm px-1">
                            {(playerStats || {})[
                              seasonReviewStats.topAssists.id
                            ]?.assists || 0}{" "}
                            Assis.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={advanceSeason}
                        className="w-full py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-transform active:scale-95"
                      >
                        Avançar para Temporada {season + 1} ➔
                      </button>
                    </div>
                  </div>
                )}

                {!seasonFinished && (
                  <>
                    {/* Card principal do dia */}
                    <div className={`rounded-xl border p-4 ${card}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className={`text-lg font-black ${tx}`}>
                            {currentDayName}
                          </p>
                          <p className={`text-xs ${sub}`}>
                            {currentDateStr} · Temporada {season}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs ${sub}`}>
                            Rd {currentRound}/
                            {standings ? (standings.length - 1) * 2 : 38}
                          </p>
                          {nextMatch && (
                            <p
                              className={`text-xs font-bold ${daysUntilNextMatch <= 2 ? (dark ? "text-yellow-400" : "text-yellow-600") : sub}`}
                            >
                              {daysUntilNextMatch} dia(s) para o jogo
                            </p>
                          )}
                        </div>
                      </div>

                      {isMatchDay ? (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10">
                                <TeamLogo
                                  teamId={selectedTeam.id}
                                  logoUrl={selectedTeam.logoUrl}
                                  fallbackName={selectedTeam.abbreviation}
                                />
                              </div>
                              <p className={`font-bold ${tx}`}>
                                {selectedTeam.abbreviation}
                              </p>
                            </div>
                            <p className={`text-sm font-bold ${sub}`}>vs</p>
                            <div className="flex items-center gap-2">
                              <p className={`font-bold ${tx}`}>
                                {nextOpponent?.abbreviation}
                              </p>
                              <div className="w-10 h-10">
                                {nextOpponent ? (
                                  <TeamLogo
                                    teamId={nextOpponent.id}
                                    logoUrl={nextOpponent.logoUrl}
                                    fallbackName={nextOpponent.abbreviation}
                                  />
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={handlePlay}
                            className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-bold"
                          >
                            🏟️ Jogar partida agora
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Treino do dia */}
                          <p className={`text-xs font-semibold ${sub} mb-2`}>
                            Treino de hoje:
                          </p>
                          {todayTraining ? (
                            <div
                              className={`flex items-center justify-between rounded-lg px-3 py-2 mb-3 ${dark ? "bg-green-900/30 border border-green-800" : "bg-green-50 border border-green-200"}`}
                            >
                              <span
                                className={`text-sm font-bold ${dark ? "text-green-300" : "text-green-700"}`}
                              >
                                {
                                  SESSIONS.find((s) => s.k === todayTraining)
                                    ?.label
                                }
                              </span>
                              <button
                                onClick={() => setTodayTraining(null)}
                                className={`text-xs ${sub}`}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value)
                                  setTodayTraining(
                                    e.target.value as TrainingFocus,
                                  );
                              }}
                              className={`w-full px-3 py-2 rounded-xl border text-sm mb-3 ${dark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-gray-300 text-gray-700"}`}
                            >
                              <option value="">— Escolher treino</option>
                              {SESSIONS.map((s) => (
                                <option key={s.k} value={s.k}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                setTodayTraining(autoSuggestTraining())
                              }
                              className={`flex-1 py-2 rounded-xl text-xs font-bold border ${dark ? "border-blue-700 text-blue-300" : "border-blue-400 text-blue-600"}`}
                            >
                              🤖 Auto
                            </button>
                            <button
                              onClick={() =>
                                advanceDay(todayTraining ?? undefined)
                              }
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-700 text-white"
                            >
                              Avançar dia →
                            </button>
                          </div>
                          <button
                            onClick={() => setShowSimConfirm(true)}
                            className="w-full mt-2 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                          >
                            ⚡ Simular Temporada
                          </button>
                        </>
                      )}
                    </div>

                    {/* Próximos jogos */}
                    <div className={`rounded-xl border ${card}`}>
                      <div className={`px-4 py-2.5 border-b ${div}`}>
                        <p
                          className={`text-xs font-semibold uppercase tracking-wide ${sub}`}
                        >
                          Próximos jogos
                        </p>
                      </div>
                      {(() => {
                        const upcoming = [];
                        for (const m of [...([] as any[])]) {
                          if (upcoming.length >= 3) break;
                        }
                        // Pega próximos 3 jogos do time
                        const teamMatches = [] as any[];
                        return teamMatches.length === 0 ? (
                          <p className={`px-4 py-3 text-xs ${sub}`}>
                            Calendário a definir
                          </p>
                        ) : (
                          teamMatches.slice(0, 3).map((m: any, i: number) => (
                            <div
                              key={i}
                              className={`px-4 py-2.5 border-b ${div} last:border-0 flex items-center justify-between`}
                            >
                              <p className={`text-sm ${tx}`}>vs {m.opponent}</p>
                              <p className={`text-xs ${sub}`}>{m.date}</p>
                            </div>
                          ))
                        );
                      })()}
                      <div
                        className={`px-4 py-2.5 border-b ${div} last:border-0 flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6">
                            {nextOpponent ? (
                              <TeamLogo
                                teamId={nextOpponent.id}
                                logoUrl={nextOpponent.logoUrl}
                                fallbackName={nextOpponent.abbreviation}
                              />
                            ) : null}
                          </div>
                          <p className={`text-sm ${tx}`}>
                            vs {nextOpponent?.name ?? "—"}
                          </p>
                        </div>
                        <p
                          className={`text-xs font-bold ${daysUntilNextMatch <= 2 ? (dark ? "text-yellow-400" : "text-yellow-600") : sub}`}
                        >
                          {nextMatch
                            ? `${String(nextMatch.date.getDate()).padStart(2, "0")}/${String(nextMatch.date.getMonth() + 1).padStart(2, "0")}`
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Stats rápidos */}
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        className={`rounded-xl border p-3 text-center ${card}`}
                      >
                        <p
                          className={`text-xl font-black ${dark ? "text-green-400" : "text-green-600"}`}
                        >
                          {fmtMoney(balance)}
                        </p>
                        <p className={`text-xs ${sub}`}>Saldo</p>
                      </div>
                      <div
                        className={`rounded-xl border p-3 text-center ${card}`}
                      >
                        <p
                          className={`text-xl font-black ${dark ? "text-yellow-300" : "text-yellow-600"}`}
                        >
                          {myStanding?.points ?? 0}
                        </p>
                        <p className={`text-xs ${sub}`}>{myPos}º · Pts</p>
                      </div>
                      <div
                        className={`rounded-xl border p-3 text-center ${card}`}
                      >
                        <p className={`text-xl font-black ${tx}`}>
                          {myStanding?.played ?? 0}
                        </p>
                        <p className={`text-xs ${sub}`}>Jogos</p>
                      </div>
                    </div>

                    {/* Notícias */}
                    {news.slice(0, 3).map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-xl border p-3 ${card}`}
                      >
                        <div className="flex gap-2">
                          <span className="text-lg">
                            {n.type === "result"
                              ? "⚽"
                              : n.type === "injury"
                                ? "🤕"
                                : n.type === "training"
                                  ? "🏋️"
                                  : n.type === "contract"
                                    ? "📝"
                                    : "📢"}
                          </span>
                          <div>
                            <p className={`text-xs font-bold ${tx}`}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className={`text-xs ${sub}`}>{n.body}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* INSTALAÇÕES */}
            {activeTab === "facilities" && (
              <div className="space-y-4">
                <h2 className={`text-base font-bold ${tx}`}>
                  Instalações do Clube
                </h2>
                <div
                  className={`rounded-xl border p-4 flex justify-between items-center ${card}`}
                >
                  <span className={`text-sm ${sub}`}>Saldo em Caixa:</span>
                  <span
                    className={`font-bold text-lg ${dark ? "text-green-400" : "text-green-600"}`}
                  >
                    {balance >= 1000
                      ? `${(balance / 1000).toFixed(1)}M`
                      : `${balance}K`}
                  </span>
                </div>

                {[
                  {
                    id: "stadium",
                    name: "Estádio",
                    desc: "Aumenta a renda de bilheteria nos dias de jogo.",
                    icon: "🏟️",
                  },
                  {
                    id: "trainingCenter",
                    name: "Centro de Treinamento",
                    desc: "Melhora o desenvolvimento dos jogadores.",
                    icon: "🏋️",
                  },
                  {
                    id: "medicalCenter",
                    name: "Departamento Médico",
                    desc: "Reduz o tempo de lesões dos jogadores.",
                    icon: "🏥",
                  },
                  {
                    id: "youthAcademy",
                    name: "Categoria de Base",
                    desc: "Gera jovens talentos melhores para o clube.",
                    icon: "👦",
                  },
                  {
                    id: "scoutingNetwork",
                    name: "Rede de Olheiros",
                    desc: "Melhora as informações sobre jogadores adversários.",
                    icon: "🔍",
                  },
                ].map((fac) => {
                  const level = facilities[fac.id as keyof typeof facilities];
                  const maxLevel = 5;
                  const cost = level * 15000; // Increased cost
                  const canAfford = balance >= cost;
                  const isMax = level >= maxLevel;

                  return (
                    <div
                      key={fac.id}
                      className={`rounded-xl border p-4 ${card} flex flex-col gap-3`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{fac.icon}</div>
                          <div>
                            <h3 className={`font-bold text-sm ${tx}`}>
                              {fac.name}
                            </h3>
                            <p className={`text-xs ${sub}`}>{fac.desc}</p>
                          </div>
                        </div>
                        <div
                          className={`text-xs font-bold px-2 py-1 rounded-md ${dark ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-800"}`}
                        >
                          Nível {level}/{maxLevel}
                        </div>
                      </div>

                      {!isMax ? (
                        <button
                          onClick={() =>
                            upgradeFacility(
                              fac.id as keyof typeof facilities,
                              cost,
                            )
                          }
                          disabled={!canAfford}
                          className={`w-full py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm outline outline-2 outline-transparent ${canAfford ? "bg-blue-600 text-white hover:bg-blue-700 active:outline-blue-300" : "bg-gray-400 outline-gray-200 text-gray-100 cursor-not-allowed opacity-50"}`}
                        >
                          💸 Evoluir para Nível {level + 1} (
                          {cost >= 1000
                            ? `${(cost / 1000).toFixed(1)}M`
                            : `${cost}K`}
                          )
                        </button>
                      ) : (
                        <div
                          className={`w-full py-2.5 rounded-lg text-xs font-bold text-center ${dark ? "bg-green-900/40 text-green-400 border border-green-800" : "bg-green-100 text-green-700 border border-green-200"}`}
                        >
                          ⭐ Nível Máximo Alcançado
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* EQUIPE TÉCNICA */}
                <h2 className={`text-base font-bold mt-8 mb-4 ${tx}`}>
                  Equipe Técnica
                </h2>

                <div className="space-y-4">
                  <div className="flex flex-col mb-4">
                    <h3 className={`text-sm font-bold ${tx}`}>
                      Empregados ({myStaff?.length || 0})
                    </h3>
                    <div
                      className={`flex flex-wrap gap-2 mt-2 text-xs opacity-80 ${tx}`}
                    >
                      <span>
                        Auxiliar:{" "}
                        {myStaff?.filter((s) => s.role === "assistant")
                          .length || 0}
                        /1
                      </span>
                      <span>
                        Treinadores:{" "}
                        {myStaff?.filter((s) => s.role === "coach").length || 0}
                        /{facilities.trainingCenter}
                      </span>
                      <span>
                        Fisioterapeutas:{" "}
                        {myStaff?.filter((s) => s.role === "physio").length ||
                          0}
                        /{facilities.medicalCenter}
                      </span>
                      <span>
                        Olheiros:{" "}
                        {myStaff?.filter((s) => s.role === "scout").length || 0}
                        /{facilities.scoutingNetwork}
                      </span>
                    </div>
                  </div>
                  {myStaff && myStaff.length > 0 ? (
                    myStaff.map((st) => {
                      const flag =
                        st.nationality === "Brasil"
                          ? "🇧🇷"
                          : st.nationality === "Argentina"
                            ? "🇦🇷"
                            : st.nationality === "Uruguai"
                              ? "🇺🇾"
                              : st.nationality === "Portugal"
                                ? "🇵🇹"
                                : st.nationality === "Espanha"
                                  ? "🇪🇸"
                                  : st.nationality === "Itália"
                                    ? "🇮🇹"
                                    : st.nationality === "Alemanha"
                                      ? "🇩🇪"
                                      : st.nationality === "França"
                                        ? "🇫🇷"
                                        : st.nationality === "Croácia"
                                          ? "🇭🇷"
                                          : st.nationality === "Inglaterra"
                                            ? "🇬🇧"
                                            : "🌍";
                      return (
                        <div
                          key={st.id}
                          className={`rounded-xl border p-4 ${card} flex justify-between items-center`}
                        >
                          <div>
                            <p
                              className={`font-bold text-sm flex items-center gap-2 ${tx}`}
                            >
                              {flag} {st.name}
                            </p>
                            <p className={`text-xs ${sub}`}>
                              {st.role === "assistant"
                                ? "Auxiliar Técnico"
                                : st.role === "coach"
                                  ? "Treinador"
                                  : st.role === "physio"
                                    ? "Fisioterapeuta"
                                    : "Olheiro"}{" "}
                              - Nível {st.skill}
                            </p>
                            <p className={`text-xs ${sub}`}>
                              Salário: {st.salary}K / mês
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Deseja demitir ${st.name} por uma multa de ${st.salary * 2}K?`,
                                )
                              ) {
                                fireStaff(st.id, st.salary * 2);
                              }
                            }}
                            className="text-xs px-3 py-1.5 rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
                          >
                            Demitir
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className={`text-xs ${sub}`}>
                      Nenhum membro na equipe técnica.
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-6 mb-4 gap-2">
                    <h3 className={`text-sm font-bold ${tx}`}>
                      Mercado de Profissionais
                    </h3>
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, função ou nacionalidade..."
                      className={`text-xs px-3 py-2 rounded-lg border outline-none max-w-sm w-full ${
                        dark
                          ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500"
                          : "bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500"
                      }`}
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableStaff &&
                      availableStaff
                        .filter((st) => {
                          const normalize = (str: string) =>
                            str
                              .toLowerCase()
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "");
                          const q = normalize(staffSearch);
                          const roleName =
                            st.role === "assistant"
                              ? "auxiliar tecnico"
                              : st.role === "coach"
                                ? "treinador"
                                : st.role === "physio"
                                  ? "fisioterapeuta"
                                  : "olheiro";
                          return (
                            normalize(st.name).includes(q) ||
                            roleName.includes(q) ||
                            normalize(st.nationality).includes(q)
                          );
                        })
                        .map((st) => {
                          const flag =
                            st.nationality === "Brasil"
                              ? "🇧🇷"
                              : st.nationality === "Argentina"
                                ? "🇦🇷"
                                : st.nationality === "Uruguai"
                                  ? "🇺🇾"
                                  : st.nationality === "Portugal"
                                    ? "🇵🇹"
                                    : st.nationality === "Espanha"
                                      ? "🇪🇸"
                                      : st.nationality === "Itália"
                                        ? "🇮🇹"
                                        : st.nationality === "Alemanha"
                                          ? "🇩🇪"
                                          : st.nationality === "França"
                                            ? "🇫🇷"
                                            : st.nationality === "Croácia"
                                              ? "🇭🇷"
                                              : st.nationality === "Inglaterra"
                                                ? "🇬🇧"
                                                : "🌍";
                          let minLevelStr = "Amador";
                          if (st.skill >= 18) minLevelStr = "Nacional (Lvl 4+)";
                          else if (st.skill >= 15)
                            minLevelStr = "Intermediário (Lvl 3+)";
                          else if (st.skill >= 13)
                            minLevelStr = "Regional (Lvl 2+)";

                          return (
                            <div
                              key={st.id}
                              className={`rounded-xl border p-4 ${card} flex flex-col justify-between`}
                            >
                              <div className="mb-4">
                                <p
                                  className={`font-bold text-sm flex items-center gap-2 ${tx}`}
                                >
                                  {flag} {st.name}
                                </p>
                                <p className={`text-xs ${sub}`}>
                                  {st.role === "assistant"
                                    ? "Auxiliar Técnico"
                                    : st.role === "coach"
                                      ? "Treinador"
                                      : st.role === "physio"
                                        ? "Fisioterapeuta"
                                        : "Olheiro"}{" "}
                                  - Nível {st.skill}
                                </p>
                                <p className={`text-xs mt-1 font-medium ${tx}`}>
                                  Pede: {st.salary}K / mês
                                </p>
                                <p className={`text-xs mt-1 ${sub} opacity-75`}>
                                  Nível exigido: {minLevelStr}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  if (balance >= st.salary) {
                                    const success = hireStaff(st);
                                    if (!success) {
                                      alert(
                                        `Não foi possível contratar ${st.name}. Verifique as Notícias para mais detalhes.`,
                                      );
                                    }
                                  } else {
                                    alert(
                                      "Saldo insuficiente para cobrir o primeiro mês.",
                                    );
                                  }
                                }}
                                disabled={balance < st.salary}
                                className={`text-xs px-3 py-2 w-full rounded-lg font-bold transition-colors ${balance >= st.salary ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-400 text-gray-200 cursor-not-allowed"}`}
                              >
                                Contratar
                              </button>
                            </div>
                          );
                        })}
                  </div>
                </div>
              </div>
            )}

            {/* ELENCO */}
            {activeTab === "squad" && (
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Elenco</h2>
                <input
                  type="text"
                  placeholder="Buscar jogador..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm mb-3 ${dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"}`}
                />
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {(
                    [
                      { k: "overall", label: "OVR" },
                      { k: "position", label: "Pos" },
                      { k: "salary", label: "Salário" },
                      { k: "fatigue", label: "Cond" },
                      { k: "age", label: "Idade" },
                      { k: "name", label: "Nome" },
                    ] as { k: typeof squadSort; label: string }[]
                  ).map((o) => (
                    <button
                      key={o.k}
                      onClick={() => setSquadSort(o.k)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${squadSort === o.k ? (dark ? "bg-white text-black" : "bg-gray-900 text-white") : dark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className={`rounded-xl border p-3 mb-3 ${card}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-xs font-semibold ${sub}`}>Escalação</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setLineupMode("auto")}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${lineupMode === "auto" ? (dark ? "bg-white text-black" : "bg-gray-900 text-white") : dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"}`}
                      >
                        Auto
                      </button>
                      <button
                        onClick={() => {
                          setLineupMode("manual");
                          setLineup(autoLineup);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${lineupMode === "manual" ? (dark ? "bg-white text-black" : "bg-gray-900 text-white") : dark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600"}`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>
                  {lineupMode === "manual" && (
                    <p className={`text-xs ${sub}`}>
                      Toque para marcar titular.{" "}
                      <span
                        className={`font-bold ${activeLineup.length === 11 ? (dark ? "text-green-400" : "text-green-600") : dark ? "text-yellow-400" : "text-yellow-600"}`}
                      >
                        {activeLineup.length}/11
                      </span>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  {filteredPlayers.map((player) => {
                    const state = (playerStates || {})[player.id] ?? {
                      fatigue: 100,
                      morale: 75,
                      happiness: 75,
                      injuryWeeks: 0,
                    };
                    const injured = state.injuryWeeks > 0;
                    const isInLineup = activeLineup.includes(player.id);
                    return (
                      <div
                        key={player.id}
                        className={`rounded-xl border ${card} ${injured ? "border-red-500/40" : isInLineup && lineupMode === "manual" ? "border-green-500/40" : ""}`}
                      >
                        <button
                          onClick={() => {
                            if (lineupMode === "manual") {
                              if (selectedSlot !== null) {
                                const newLineup = [...activeLineup];
                                const existingIndex = newLineup.indexOf(player.id);
                                if (existingIndex !== -1) {
                                  const temp = newLineup[selectedSlot];
                                  newLineup[selectedSlot] = player.id;
                                  newLineup[existingIndex] = temp;
                                } else {
                                  newLineup[selectedSlot] = player.id;
                                  // filter out nulls to maintain lineup length constraints maybe? 
                                  // wait, activeLineup might contain undefined/null if less than 11.
                                }
                                setLineup(newLineup);
                                setSelectedSlot(null);
                              } else {
                                setLineupActionPlayer(player);
                              }
                            } else {
                              setSelectedPlayer(player);
                            }
                          }}
                          className="w-full flex items-center gap-3 p-3 text-left"
                        >
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${injured ? "bg-red-900/50 text-red-400" : isInLineup ? (dark ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700") : dark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-800"}`}
                          >
                            {player.position}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p
                                className={`text-sm font-semibold truncate ${tx} ${injured ? "line-through opacity-50" : ""}`}
                              >
                                {player.name}
                              </p>
                              <span
                                className={`text-sm font-black ml-2 flex-shrink-0 ${player.overall >= 80 ? (dark ? "text-green-400" : "text-green-600") : player.overall >= 70 ? (dark ? "text-blue-400" : "text-blue-600") : tx}`}
                              >
                                {player.overall}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-xs ${sub}`}>
                                {player.age}a
                              </span>
                              <div className="flex items-center gap-1">
                                <div
                                  className={`w-14 h-1.5 rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}
                                >
                                  <div
                                    className={`h-1.5 rounded-full ${state.fatigue >= 70 ? "bg-green-500" : state.fatigue >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                                    style={{ width: `${state.fatigue}%` }}
                                  />
                                </div>
                                <span
                                  className={`text-xs font-semibold ${fatigueColor(state.fatigue, dark)}`}
                                >
                                  {state.fatigue}%
                                </span>
                              </div>
                              <span
                                className={`text-xs ${moraleColor(state.morale, dark)}`}
                              >
                                {moraleLabel(state.morale)}
                              </span>
                              {injured && (
                                <span className="text-xs text-red-400">
                                  🤕 {state.injuryWeeks}sem
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                        <div
                          className={`flex items-center justify-between px-3 pb-2.5 border-t ${div} pt-1.5`}
                        >
                          <span className={`text-xs ${sub}`}>
                            {fmtMoney(player.salary)}/mês ·{" "}
                            {player.contractYears}a
                          </span>
                          <button
                            onClick={() => {
                              setShowContractModal(player);
                              setContractSalary(player.salary);
                              setContractYears(player.contractYears);
                            }}
                            className={`text-xs px-2.5 py-0.5 rounded-lg border ${dark ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"}`}
                          >
                            📝 Contrato
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TÁTICAS */}
            {activeTab === "tactics" && (
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Táticas</h2>
                <div className={`rounded-xl border p-3 mb-4 ${card}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${sub}`}
                    >
                      Formação
                    </p>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-black ${tx}`}>{formation}</p>
                      <button
                        onClick={() => setLineupMode("auto")}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-green-500"
                      >
                        Auto Escalar
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(
                      [
                        "4-4-2",
                        "4-3-3",
                        "4-2-3-1",
                        "3-5-2",
                        "5-3-2",
                        "4-5-1",
                        "4-1-4-1",
                        "4-3-3-F",
                        "3-4-3",
                        "4-4-2-D",
                        "5-4-1",
                        "4-2-2-2",
                      ] as Formation[]
                    ).map((f) => (
                      <button
                        key={f}
                        onClick={() => handleSetFormation(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${formation === f ? (dark ? "bg-white text-black border-white" : "bg-gray-900 text-white border-gray-900") : dark ? "border-gray-600 text-gray-400" : "border-gray-300 text-gray-600"}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const lineupPlayers = formationRows[formation]
                      .flat()
                      .map((slotPos, i) => {
                        const playerId = activeLineup[i];
                        if (!playerId) return null;
                        const p = selectedTeam.players.find(
                          (pl) => pl.id === playerId,
                        );
                        if (!p) return null;
                        return {
                          id: p.id,
                          name: p.name,
                          position: p.position,
                          positions: p.positions,
                          secondaryPositions: p.secondaryPositions,
                          overall: p.overall,
                          shirtNumber: i + 1,
                        };
                      });

                    return (
                      <FormationField
                        formation={formation}
                        dark={dark}
                        lineupPlayers={lineupPlayers}
                        selectedSlot={selectedSlot}
                        onSlotTap={handleSlotTap}
                      />
                    );
                  })()}
                  {lineupMode === "manual" ? (
                    <p className={`mt-2 text-center text-xs ${sub}`}>
                      {selectedSlot !== null
                        ? "Toque em outro jogador para trocar de posição"
                        : "Toque em um jogador para mover"}
                    </p>
                  ) : (
                    <p className={`mt-2 text-center text-[10px] ${sub}`}>
                      * Modo automático ativado. Mova jogadores para trocar para
                      manual.
                    </p>
                  )}
                </div>
                <div className={`rounded-xl border p-4 ${card}`}>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${sub} mb-2`}
                  >
                    Instruções
                  </p>
                  <TacticsPanel
                    tactics={tactics}
                    setTactics={setTactics}
                    dark={dark}
                  />
                </div>
              </div>
            )}

            {/* TREINO */}
            {activeTab === "training" && (
              <div>
                <h2 className={`text-base font-bold mb-1 ${tx}`}>Treino</h2>
                <p className={`text-xs ${sub} mb-4`}>
                  {currentDayName}, {currentDateStr}
                </p>
                {isMatchDay ? (
                  <div className={`rounded-xl border p-4 ${card} text-center`}>
                    <p className="text-3xl mb-2">🏟️</p>
                    <p className={`text-sm font-bold ${tx}`}>Dia de jogo</p>
                    <p className={`text-xs ${sub} mt-1`}>
                      Sem treino hoje. Foco total na partida.
                    </p>
                    <button
                      onClick={handlePlay}
                      className="mt-3 w-full bg-green-600 text-white py-3 rounded-xl text-sm font-bold"
                    >
                      Jogar agora
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      className={`rounded-xl border ${card} overflow-hidden mb-4`}
                    >
                      {SESSIONS.map((s) => (
                        <button
                          key={s.k}
                          onClick={() =>
                            setTodayTraining(todayTraining === s.k ? null : s.k)
                          }
                          className={`w-full flex items-center gap-3 px-4 py-3 border-b ${div} last:border-0 text-left transition-colors ${todayTraining === s.k ? (dark ? "bg-green-900/30" : "bg-green-50") : dark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base ${todayTraining === s.k ? (dark ? "bg-green-800" : "bg-green-200") : dark ? "bg-gray-700" : "bg-gray-100"}`}
                          >
                            {s.label.split(" ")[0]}
                          </div>
                          <div>
                            <p
                              className={`text-sm font-semibold ${todayTraining === s.k ? (dark ? "text-green-300" : "text-green-700") : tx}`}
                            >
                              {s.label.split(" ").slice(1).join(" ")}
                            </p>
                            <p className={`text-xs ${sub}`}>{s.desc}</p>
                          </div>
                          {todayTraining === s.k && (
                            <span
                              className={`ml-auto text-xs font-bold ${dark ? "text-green-400" : "text-green-600"}`}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTodayTraining(autoSuggestTraining())}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border ${dark ? "border-blue-700 text-blue-300" : "border-blue-400 text-blue-600"}`}
                      >
                        🤖 Auto
                      </button>
                      {seasonFinished ? (
                        <button
                          onClick={advanceSeason}
                          className="flex-1 py-3 rounded-xl text-sm font-bold bg-green-600 outline outline-2 outline-white text-white"
                        >
                          Próxima Temporada →
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2 w-full">
                          <button
                            onClick={() =>
                              advanceDay(todayTraining ?? undefined)
                            }
                            className="w-full py-3 rounded-xl text-sm font-bold bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white transition-colors"
                          >
                            Avançar dia →
                          </button>
                          <button
                            onClick={() => setShowSimConfirm(true)}
                            className="w-full py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-500 text-white transition-colors"
                          >
                            ⚡ Simular Resto da Temporada
                          </button>
                        </div>
                      )}
                    </div>
                    {todayTraining === "individual" && (
                      <div className="mt-4">
                        <IndividualTrainingScreen
                          dark={dark}
                          tx={tx}
                          sub={sub}
                          card={card}
                          div={div}
                          players={selectedTeam.players}
                          playerStates={playerStates}
                          plans={individualPlans}
                          onUpdatePlan={updateIndividualPlan}
                        />
                      </div>
                    )}
                    {selectedTeam.players.filter(
                      (p) => (playerStates[p.id]?.injuryWeeks ?? 0) > 0,
                    ).length > 0 && (
                      <div className={`rounded-xl border p-4 ${card} mt-4`}>
                        <p
                          className={`text-xs font-semibold uppercase tracking-wide ${sub} mb-2`}
                        >
                          🤕 Lesionados
                        </p>
                        {selectedTeam.players
                          .filter(
                            (p) => (playerStates[p.id]?.injuryWeeks ?? 0) > 0,
                          )
                          .map((p) => (
                            <div
                              key={p.id}
                              className="flex justify-between py-1.5"
                            >
                              <p className={`text-sm ${tx}`}>{p.name}</p>
                              <p className="text-xs text-red-400">
                                {(playerStates || {})[p.id].injuryWeeks} sem
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* FINANÇAS */}
            {activeTab === "finances" && (
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Finanças</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    {
                      label: "Saldo",
                      val: balance,
                      color: dark ? "text-green-400" : "text-green-600",
                    },
                    {
                      label: "Receita/mês",
                      val: monthlyIncome,
                      color: dark ? "text-blue-400" : "text-blue-600",
                    },
                    {
                      label: "Folha/mês",
                      val: wageBill,
                      color: dark ? "text-red-400" : "text-red-600",
                    },
                    {
                      label: "Resultado",
                      val: monthlyIncome - wageBill,
                      color:
                        monthlyIncome - wageBill >= 0
                          ? dark
                            ? "text-green-400"
                            : "text-green-600"
                          : dark
                            ? "text-red-400"
                            : "text-red-600",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-xl border p-4 ${card}`}
                    >
                      <p className={`text-xs ${sub} mb-1`}>{item.label}</p>
                      <p className={`text-xl font-black ${item.color}`}>
                        {fmtMoney(item.val)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className={`rounded-xl border p-4 ${card} mb-3`}>
                  <p className={`text-xs ${sub} mb-1`}>Nível do clube</p>
                  <p className={`text-sm font-bold ${tx}`}>
                    {levelLabel(selectedTeam.clubLevel)} (Nível{" "}
                    {selectedTeam.clubLevel})
                  </p>
                </div>
                <div className={`rounded-xl border overflow-hidden ${card}`}>
                  <div className={`px-4 py-2.5 border-b ${div}`}>
                    <p
                      className={`text-xs font-semibold uppercase tracking-wide ${sub}`}
                    >
                      Maiores salários
                    </p>
                  </div>
                  {[...selectedTeam.players]
                    .sort((a, b) => b.salary - a.salary)
                    .slice(0, 8)
                    .map((p) => (
                      <div
                        key={p.id}
                        className={`flex justify-between px-4 py-2.5 border-b ${div} last:border-0`}
                      >
                        <div>
                          <p className={`text-sm ${tx}`}>{p.name}</p>
                          <p className={`text-xs ${sub}`}>
                            {(p.positions ?? (p.secondaryPositions ? [p.position, ...p.secondaryPositions] : [p.position])).join(' / ')} · {statusLabel(p.status)}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-bold ${dark ? "text-red-400" : "text-red-600"}`}
                        >
                          {fmtMoney(p.salary)}/mês
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* LIGA */}
            {activeTab === "competitions" && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h2 className={`text-base font-bold ${tx}`}>
                    Campeonato {season}
                  </h2>
                  <select
                    title="Selecione a Liga"
                    value={viewLeagueId || selectedTeam.leagueId}
                    onChange={(e) => setViewLeagueId(e.target.value)}
                    className={`text-sm px-2 py-1 rounded-md border ${dark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300 text-black"}`}
                  >
                    {Object.entries(LEAGUES).map(([id, info]) => {
                      const cInfo = COUNTRIES[info.country];
                      const displayLabel = cInfo
                        ? `${cInfo.flag} ${info.name}`
                        : info.name;
                      return (
                        <option key={id} value={id}>
                          {displayLabel}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Abas Secundárias */}
                <div className={`flex border-b ${div} mb-4`}>
                  <button
                    onClick={() => setLeagueTab("classification")}
                    className={`flex-1 py-2 text-sm font-bold text-center border-b-2 transition-colors ${leagueTab === "classification" ? (dark ? "border-green-400 text-green-400" : "border-green-600 text-green-600") : "border-transparent text-gray-400 hover:text-gray-300"}`}
                  >
                    Classificação
                  </button>
                  <button
                    onClick={() => setLeagueTab("stats")}
                    className={`flex-1 py-2 text-sm font-bold text-center border-b-2 transition-colors ${leagueTab === "stats" ? (dark ? "border-green-400 text-green-400" : "border-green-600 text-green-600") : "border-transparent text-gray-400 hover:text-gray-300"}`}
                  >
                    Estatísticas
                  </button>
                  <button
                    onClick={() => setLeagueTab("champions")}
                    className={`flex-1 py-2 text-sm font-bold text-center border-b-2 transition-colors ${leagueTab === "champions" ? (dark ? "border-green-400 text-green-400" : "border-green-600 text-green-600") : "border-transparent text-gray-400 hover:text-gray-300"}`}
                  >
                    Champions
                  </button>
                </div>

                {leagueTab === "classification" && (
                  <>
                    <div
                      className={`rounded-xl border overflow-hidden ${card}`}
                    >
                      <div
                        className={`px-3 py-2 border-b ${div} grid text-xs font-semibold ${sub}`}
                        style={{
                          gridTemplateColumns:
                            "1.5rem 1fr 2rem 2rem 2rem 2rem 2rem 2.5rem",
                        }}
                      >
                        <span>#</span>
                        <span>Time</span>
                        <span className="text-center">J</span>
                        <span className="text-center">V</span>
                        <span className="text-center">E</span>
                        <span className="text-center">D</span>
                        <span className="text-center">SG</span>
                        <span className="text-center font-black">Pts</span>
                      </div>
                      {sortedStandings.map((row, idx) => {
                        const isMe = row.teamId === selectedTeam.id;
                        const gd = row.goalsFor - row.goalsAgainst;
                        const teamInfo = allTeams.find(
                          (t) => t.id === row.teamId,
                        );
                        return (
                          <div
                            key={row.teamId}
                            onClick={() =>
                              teamInfo && setShowTeamModal(teamInfo)
                            }
                            className={`px-3 py-2.5 border-b ${div} last:border-0 grid items-center text-xs cursor-pointer transition-colors ${isMe ? (dark ? "bg-green-900/30 hover:bg-green-900/40" : "bg-green-50 hover:bg-green-100") : dark ? "hover:bg-gray-800" : "hover:bg-gray-50"}`}
                            style={{
                              gridTemplateColumns:
                                "1.5rem 1fr 2rem 2rem 2rem 2rem 2rem 2.5rem",
                            }}
                          >
                            <span
                              className={`font-bold ${idx < 4 ? (dark ? "text-green-400" : "text-green-600") : idx >= 17 ? (dark ? "text-red-400" : "text-red-600") : sub}`}
                            >
                              {idx + 1}
                            </span>
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <div className="w-5 h-5 flex-shrink-0">
                                <TeamLogo
                                  teamId={row.teamId}
                                  logoUrl={teamInfo?.logoUrl}
                                  fallbackName={row.teamName}
                                />
                              </div>
                              <span
                                className={`font-semibold truncate ${isMe ? (dark ? "text-green-300" : "text-green-700") : tx}`}
                              >
                                {row.teamName}
                              </span>
                            </div>
                            <span className={`text-center ${sub}`}>
                              {row.played}
                            </span>
                            <span
                              className={`text-center ${dark ? "text-green-400" : "text-green-600"}`}
                            >
                              {row.won}
                            </span>
                            <span
                              className={`text-center ${dark ? "text-yellow-400" : "text-yellow-600"}`}
                            >
                              {row.drawn}
                            </span>
                            <span
                              className={`text-center ${dark ? "text-red-400" : "text-red-600"}`}
                            >
                              {row.lost}
                            </span>
                            <span className={`text-center ${sub}`}>
                              {gd >= 0 ? `+${gd}` : gd}
                            </span>
                            <span
                              className={`text-center font-black ${isMe ? (dark ? "text-green-300" : "text-green-700") : tx}`}
                            >
                              {row.points}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className={`text-xs ${sub} mt-2 text-center`}>
                      Verde = Promovidos/Libertadores · Vermelho = Rebaixamento
                    </p>
                  </>
                )}

                {leagueTab === "stats" && (
                  <div className={`rounded-xl border overflow-hidden ${card}`}>
                    <div className={`flex border-b ${div}`}>
                      <button
                        onClick={() => setPlayerStatsTab("goals")}
                        className={`flex-1 py-1.5 text-xs font-bold text-center border-b-2 transition-colors ${playerStatsTab === "goals" ? (dark ? "border-green-400 text-green-400" : "border-green-600 text-green-600") : "border-transparent text-gray-400 hover:text-gray-300"}`}
                      >
                        ⚽ Gols
                      </button>
                      <button
                        onClick={() => setPlayerStatsTab("assists")}
                        className={`flex-1 py-1.5 text-xs font-bold text-center border-b-2 transition-colors ${playerStatsTab === "assists" ? (dark ? "border-blue-400 text-blue-400" : "border-blue-600 text-blue-600") : "border-transparent text-gray-400 hover:text-gray-300"}`}
                      >
                        👟 Assistências
                      </button>
                      <button
                        onClick={() => setPlayerStatsTab("cards")}
                        className={`flex-1 py-1.5 text-xs font-bold text-center border-b-2 transition-colors ${playerStatsTab === "cards" ? (dark ? "border-yellow-400 text-yellow-400" : "border-yellow-600 text-yellow-600") : "border-transparent text-gray-400 hover:text-gray-300"}`}
                      >
                        🟨 Cartões
                      </button>
                    </div>
                    <div
                      className={`px-3 py-2 border-b ${div} grid text-xs font-semibold ${sub}`}
                      style={{
                        gridTemplateColumns:
                          "1.5rem 1fr 1fr " +
                          (playerStatsTab === "cards" ? "3rem 3rem" : "3rem"),
                      }}
                    >
                      <span>#</span>
                      <span>Jogador</span>
                      <span>Clube</span>
                      {playerStatsTab === "goals" && (
                        <span className="text-right">Gols</span>
                      )}
                      {playerStatsTab === "assists" && (
                        <span className="text-right">Ast</span>
                      )}
                      {playerStatsTab === "cards" && (
                        <>
                          <span className="text-center">Amarelos</span>
                          <span className="text-center">Vermelhos</span>
                        </>
                      )}
                    </div>
                    {(() => {
                      const currentLid = viewLeagueId || selectedTeam.leagueId;
                      const playersInLeague = allTeams
                        .filter((t) => t.leagueId === currentLid)
                        .flatMap((t) =>
                          t.players.map((p) => ({
                            ...p,
                            teamInfo: t,
                            stats: (playerStats || {})[p.id] || {
                              goals: 0,
                              assists: 0,
                              yellowCards: 0,
                              redCards: 0,
                              matches: 0,
                            },
                          })),
                        );

                      let sortedPlayers = [];
                      if (playerStatsTab === "goals") {
                        sortedPlayers = playersInLeague
                          .filter((p) => p.stats.goals > 0)
                          .sort((a, b) => b.stats.goals - a.stats.goals)
                          .slice(0, 50);
                      } else if (playerStatsTab === "assists") {
                        sortedPlayers = playersInLeague
                          .filter((p) => p.stats.assists > 0)
                          .sort((a, b) => b.stats.assists - a.stats.assists)
                          .slice(0, 50);
                      } else {
                        sortedPlayers = playersInLeague
                          .filter(
                            (p) =>
                              p.stats.yellowCards > 0 || p.stats.redCards > 0,
                          )
                          .sort(
                            (a, b) =>
                              b.stats.redCards * 3 +
                              b.stats.yellowCards -
                              (a.stats.redCards * 3 + a.stats.yellowCards),
                          )
                          .slice(0, 50);
                      }

                      if (sortedPlayers.length === 0) {
                        return (
                          <div className="p-4 text-center text-sm text-gray-500">
                            Nenhuma estatística registrada ainda.
                          </div>
                        );
                      }

                      return sortedPlayers.map((row, idx) => {
                        const isMe = row.teamInfo.id === selectedTeam.id;
                        return (
                          <div
                            key={row.id}
                            className={`px-3 py-2.5 border-b ${div} last:border-0 grid items-center text-xs ${isMe ? (dark ? "bg-green-900/30" : "bg-green-50") : ""}`}
                            style={{
                              gridTemplateColumns:
                                "1.5rem 1fr 1fr " +
                                (playerStatsTab === "cards"
                                  ? "3rem 3rem"
                                  : "3rem"),
                            }}
                          >
                            <span className={`font-bold ${sub}`}>
                              {idx + 1}
                            </span>
                            <span className={`font-semibold truncate ${tx}`}>
                              {row.name}
                            </span>
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              <div className="w-4 h-4 flex-shrink-0">
                                <TeamLogo
                                  teamId={row.teamInfo.id}
                                  logoUrl={row.teamInfo.logoUrl}
                                  fallbackName={row.teamInfo.name}
                                />
                              </div>
                              <span className={`truncate ${sub}`}>
                                {row.teamInfo.name}
                              </span>
                            </div>

                            {playerStatsTab === "goals" && (
                              <span
                                className={`text-right text-blue-500 font-bold`}
                              >
                                {row.stats.goals}
                              </span>
                            )}
                            {playerStatsTab === "assists" && (
                              <span
                                className={`text-right text-purple-500 font-bold`}
                              >
                                {row.stats.assists}
                              </span>
                            )}
                            {playerStatsTab === "cards" && (
                              <>
                                <span
                                  className={`text-center text-yellow-500 font-bold`}
                                >
                                  {row.stats.yellowCards}
                                </span>
                                <span
                                  className={`text-center text-red-500 font-bold`}
                                >
                                  {row.stats.redCards}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {leagueTab === "champions" && <UCLScreen />}
              </div>
            )}

            {/* MERCADO */}
            {activeTab === "transfers" && (
              <div className="space-y-4">
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Mercado</h2>
                <MarketScreen />
                {selectedTeam.players.filter((p) => p.contractYears <= 1)
                  .length > 0 && (
                  <div className={`rounded-xl border ${card}`}>
                    <div className={`px-4 py-2.5 border-b ${div}`}>
                      <p
                        className={`text-xs font-semibold uppercase tracking-wide ${sub}`}
                      >
                        ⚠️ Contratos a vencer
                      </p>
                    </div>
                    {selectedTeam.players
                      .filter((p) => p.contractYears <= 1)
                      .map((p) => (
                        <div
                          key={p.id}
                          className={`flex justify-between items-center px-4 py-2.5 border-b ${div} last:border-0`}
                        >
                          <div>
                            <p className={`text-sm ${tx}`}>{p.name}</p>
                            <p className={`text-xs ${sub}`}>
                              {(p.positions ?? (p.secondaryPositions ? [p.position, ...p.secondaryPositions] : [p.position])).join(' / ')} · OVR {p.overall}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setShowContractModal(p);
                              setContractSalary(p.salary);
                              setContractYears(2);
                            }}
                            className={`text-xs px-3 py-1.5 rounded-lg border ${dark ? "border-yellow-700 text-yellow-400" : "border-yellow-400 text-yellow-600"}`}
                          >
                            Renovar
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* NOTÍCIAS */}
            {activeTab === "news" && (
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Notícias</h2>
                {news.length === 0 ? (
                  <p className={`text-sm ${sub}`}>Nenhuma notícia ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {news.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-xl border p-3 ${card}`}
                      >
                        <div className="flex gap-3">
                          <span className="text-xl flex-shrink-0">
                            {n.type === "result"
                              ? "⚽"
                              : n.type === "injury"
                                ? "🤕"
                                : n.type === "training"
                                  ? "🏋️"
                                  : n.type === "contract"
                                    ? "📝"
                                    : "📢"}
                          </span>
                          <div>
                            <div className="flex gap-2 mb-0.5">
                              <p className={`text-xs font-bold ${tx}`}>
                                {n.title}
                              </p>
                              <span className={`text-xs ${sub}`}>
                                · {n.date}
                              </span>
                            </div>
                            {n.body && (
                              <p className={`text-xs ${sub}`}>{n.body}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HISTÓRICO */}
            {activeTab === "history" && (
              <div>
                <h2 className={`text-base font-bold mb-3 ${tx}`}>Histórico</h2>
                {matchHistory.length === 0 ? (
                  <p className={`text-sm ${sub}`}>Nenhuma partida disputada.</p>
                ) : (
                  <div className="space-y-2">
                    {matchHistory.map((m, i) => {
                      const isWin = m.homeGoals > m.awayGoals,
                        isDraw = m.homeGoals === m.awayGoals;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${card}`}
                        >
                          <span
                            className={`w-10 text-center text-xs font-black px-2 py-1 rounded-lg ${isWin ? "bg-green-600 text-white" : isDraw ? "bg-yellow-600 text-white" : "bg-red-600 text-white"}`}
                          >
                            {isWin ? "VIT" : isDraw ? "EMP" : "DER"}
                          </span>
                          <span className={`text-xs ${sub} w-12`}>
                            {m.date}
                          </span>
                          <span
                            className={`flex-1 text-sm font-semibold ${tx}`}
                          >
                            {selectedTeam.abbreviation} {m.homeGoals}–
                            {m.awayGoals} {m.opponent.slice(0, 12)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM NAV */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-40 ${dark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"} border-t`}
        >
          <div className="flex overflow-x-auto max-w-2xl mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center flex-shrink-0 px-3 py-2 min-w-[64px] ${activeTab === tab.key ? (dark ? "text-green-400" : "text-green-600") : dark ? "text-gray-500" : "text-gray-400"}`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                <span className="text-xs mt-0.5 font-medium whitespace-nowrap">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {lineupActionPlayer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/60 p-4">
          <div className={`w-full max-w-sm rounded-2xl overflow-hidden ${dark ? "bg-gray-800 text-white" : "bg-white text-gray-900"} shadow-2xl`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-bold text-center">
              Ações: {lineupActionPlayer.name}
            </div>
            <div className="p-4 space-y-3">
              {activeLineup.includes(lineupActionPlayer.id) ? (
                <>
                  <button
                    onClick={() => {
                      if (lineupActionPlayer.slotIndex !== undefined) {
                         setSelectedSlot(lineupActionPlayer.slotIndex);
                      } else {
                         setSelectedSlot(activeLineup.indexOf(lineupActionPlayer.id));
                      }
                      setLineupActionPlayer(null);
                    }}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${dark ? "bg-indigo-600 hover:bg-indigo-500" : "bg-indigo-500 hover:bg-indigo-600"} text-white`}
                  >
                    ↔️ Mover no campo
                  </button>
                  <button
                    onClick={() => {
                      setSubstituteTarget(lineupActionPlayer.id);
                      setLineupActionPlayer(null);
                    }}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${dark ? "bg-blue-600 hover:bg-blue-500" : "bg-blue-500 hover:bg-blue-600"} text-white`}
                  >
                    🔄 Substituir
                  </button>
                  <button
                    onClick={() => {
                      let base = lineupMode === "auto" ? [...activeLineup] : [...lineup];
                      const index = base.indexOf(lineupActionPlayer.id);
                      if (index !== -1) {
                         base[index] = null;
                      }
                      setLineup(base);
                      if (lineupMode === "auto") setLineupMode("manual");
                      setLineupActionPlayer(null);
                    }}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${dark ? "bg-red-600 hover:bg-red-500" : "bg-red-500 hover:bg-red-600"} text-white`}
                  >
                    ➖ Remover da Escalação
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    let base = lineupMode === "auto" ? [...activeLineup] : [...lineup];
                    const emptyIndex = base.indexOf(null);
                    if (emptyIndex !== -1) {
                      base[emptyIndex] = lineupActionPlayer.id;
                      setLineup(base);
                      if (lineupMode === "auto") setLineupMode("manual");
                      setLineupActionPlayer(null);
                    } else if (base.length < 11) {
                      setLineup([...base, lineupActionPlayer.id]);
                      if (lineupMode === "auto") setLineupMode("manual");
                      setLineupActionPlayer(null);
                    } else {
                      // Already 11 players, substitute instead
                      setSubstituteTarget(lineupActionPlayer.id);
                      setLineupActionPlayer(null);
                    }
                  }}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${dark ? "bg-green-600 hover:bg-green-500" : "bg-green-500 hover:bg-green-600"} text-white`}
                >
                  {(lineupMode === "auto" ? [...activeLineup] : [...lineup]).indexOf(null) !== -1 || (lineupMode === "auto" ? [...activeLineup] : [...lineup]).length < 11 ? "➕ Adicionar à Escalação" : "🔄 Substituir por quem?"}
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedPlayer(lineupActionPlayer);
                  setLineupActionPlayer(null);
                }}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 border ${dark ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"}`}
              >
                📊 Ver Perfil
              </button>
              <button
                onClick={() => setLineupActionPlayer(null)}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${dark ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"}`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {substituteTarget !== null && selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl overflow-hidden ${dark ? "bg-gray-800 text-white" : "bg-white text-gray-900"} shadow-2xl`}>
            <div className={`p-4 border-b flex justify-between items-center ${dark ? "border-gray-700" : "border-gray-200"}`}>
              <h3 className="font-bold">
                {activeLineup.includes(substituteTarget) ? "Trocar por:" : "Entrar no lugar de:"}
              </h3>
              <button onClick={() => setSubstituteTarget(null)} className="text-2xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {selectedTeam.players
                .filter(p => p.id !== substituteTarget)
                .filter(p => {
                  const isActive = activeLineup.includes(substituteTarget);
                  if (isActive) {
                    return !activeLineup.includes(p.id); // Show bench
                  } else {
                    return activeLineup.includes(p.id); // Show starters
                  }
                })
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const isActive = activeLineup.includes(substituteTarget);
                      let newLineup = [...activeLineup];
                      if (isActive) {
                        const targetIndex = newLineup.indexOf(substituteTarget);
                        if (targetIndex !== -1) {
                          newLineup[targetIndex] = p.id;
                        }
                      } else {
                        const replacedIndex = newLineup.indexOf(p.id);
                        if (replacedIndex !== -1) {
                          newLineup[replacedIndex] = substituteTarget;
                        }
                      }
                      setLineup(newLineup);
                      if (lineupMode === "auto") {
                        setLineupMode("manual");
                      }
                      setSubstituteTarget(null);
                    }}
                    className={`w-full flex items-center gap-3 p-3 text-left rounded-lg ${dark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${dark ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-800"}`}>
                      {p.position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{p.name}</p>
                    </div>
                    <span className={`font-black text-sm ${p.overall >= 80 ? (dark ? "text-green-400" : "text-green-600") : dark ? "text-blue-400" : "text-blue-600"}`}>
                      {p.overall}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
