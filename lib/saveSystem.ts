// ─── SISTEMA DE SAVE ──────────────────────────────────────────────────────────

export interface SaveSlot {
  id: number;           // 1, 2 ou 3
  teamId: number;
  teamName: string;
  teamAbbr: string;
  round: number;
  season: number;
  balance: number;
  date: string;         // ISO string do momento do save
  exists: boolean;
}

export interface Facilities {
  stadium: number;
  trainingCenter: number;
  medicalCenter: number;
  youthAcademy: number;
  scoutingNetwork: number;
}

export interface StaffMember {
  id: number;
  name: string;
  role: 'assistant' | 'coach' | 'physio' | 'scout';
  skill: number;
  salary: number;
  nationality: string;
}

export interface GameSaveData {
  teamId: number;
  playerStates: Record<number, { fatigue: number; morale: number; happiness: number; injuryWeeks: number }>;
  playerStats?: Record<number, { goals: number; assists: number; yellowCards: number; redCards: number; matches: number }>;
  playerHistory?: Record<number, { year: number; club: string; comp: string; matches: number; goals: number; assists: number; avg: string }[]>;
  tactics: any;
  matchHistory: any[];
  currentRound: number;
  balance: number;
  monthlyIncome: number;
  standings: any[];
  news: any[];
  trainingFocus: string;
  trainingIntensity: string;
  season: number;
  savedAt: string;
  facilities?: Facilities;
  myStaff?: StaffMember[];
  availableStaff?: StaffMember[];
  individualPlans?: any;
  [key: string]: any;
}

const SAVE_PREFIX = 'elite_manager_save_';
const SETTINGS_KEY = 'elite_manager_settings';
const LAST_SLOT_KEY = 'elite_manager_last_slot';

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export interface GameSettings {
  autoSave: 'off' | 'after_match' | 'monthly';
  autoSaveSlot: number;        // slot para auto-save (1–3)
  language: 'pt' | 'en';
  darkMode: boolean;
  matchSpeed: 1 | 2 | 4;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  showInjuryAlerts: boolean;
  showFinanceAlerts: boolean;
  currency: 'BRL' | 'USD' | 'EUR';
  dateFormat: 'dd/mm' | 'mm/dd';
}

export const defaultSettings: GameSettings = {
  autoSave: 'after_match',
  autoSaveSlot: 1,
  language: 'pt',
  darkMode: true,
  matchSpeed: 1,
  soundEnabled: false,
  notificationsEnabled: true,
  showInjuryAlerts: true,
  showFinanceAlerts: true,
  currency: 'BRL',
  dateFormat: 'dd/mm',
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: GameSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── SLOTS ────────────────────────────────────────────────────────────────────

export function getSlotInfo(slot: number): SaveSlot {
  try {
    const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}_meta`);
    if (!raw) return { id: slot, teamId: 0, teamName: '', teamAbbr: '', round: 0, season: 2026, balance: 0, date: '', exists: false };
    const data = JSON.parse(raw);
    return { ...data, id: slot, exists: true };
  } catch {
    return { id: slot, teamId: 0, teamName: '', teamAbbr: '', round: 0, season: 2026, balance: 0, date: '', exists: false };
  }
}

export function getAllSlots(): SaveSlot[] {
  return [1, 2, 3].map(getSlotInfo);
}

export function getLastSlot(): number {
  return Number(localStorage.getItem(LAST_SLOT_KEY) ?? 0);
}

import localforage from 'localforage';
import { teams as defaultTeams } from "./teams";

// ─── SALVAR ───────────────────────────────────────────────────────────────────

export async function saveGame(slot: number, data: GameSaveData, teamName: string, teamAbbr: string): Promise<void> {
  const meta: SaveSlot = {
    id: slot,
    teamId: data.teamId,
    teamName,
    teamAbbr,
    round: data.currentRound,
    season: data.season,
    balance: data.balance,
    date: new Date().toISOString(),
    exists: true,
  };
  localStorage.setItem(`${SAVE_PREFIX}${slot}_meta`, JSON.stringify(meta));
  await localforage.setItem(`${SAVE_PREFIX}${slot}_data`, data);
  localStorage.setItem(LAST_SLOT_KEY, String(slot));
}

// ─── CARREGAR ─────────────────────────────────────────────────────────────────

export async function loadGame(slot: number): Promise<GameSaveData | null> {
  try {
    const data = await localforage.getItem<any>(`${SAVE_PREFIX}${slot}_data`);
    if (!data) {
      // Falback try to load from localStorage for backwards compatibility
      const raw = localStorage.getItem(`${SAVE_PREFIX}${slot}_data`);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate to localforage
        await localforage.setItem(`${SAVE_PREFIX}${slot}_data`, parsed);
        localStorage.removeItem(`${SAVE_PREFIX}${slot}_data`);
        return parsed;
      }
      return null;
    }
    
    // Retro-fit logos para jogos salvos anteriormente
    if (data.teams) {
      data.teams = data.teams.map((t: any) => {
        const def = defaultTeams.find(x => x?.id === t.id);
        if (def && def.logoUrl && !t.logoUrl) {
           t.logoUrl = def.logoUrl;
        } else if (def && def.logoUrl && t.logoUrl !== def.logoUrl) {
           // Also update if the logo URL differs (to pick up newer logo fixes)
           t.logoUrl = def.logoUrl;
        }
        return t;
      });
    }
    
    return data;
  } catch {
    return null;
  }
}

// ─── APAGAR ───────────────────────────────────────────────────────────────────

export async function deleteSlot(slot: number): Promise<void> {
  localStorage.removeItem(`${SAVE_PREFIX}${slot}_meta`);
  localStorage.removeItem(`${SAVE_PREFIX}${slot}_data`); // for older saves
  await localforage.removeItem(`${SAVE_PREFIX}${slot}_data`);
  const last = getLastSlot();
  if (last === slot) localStorage.removeItem(LAST_SLOT_KEY);
}

// ─── FORMATAR DATA ────────────────────────────────────────────────────────────

export function formatSaveDate(iso: string, fmt: 'dd/mm' | 'mm/dd' = 'dd/mm'): string {
  try {
    const d = new Date(iso);
    const day   = String(d.getDate()).padStart(2,'0');
    const month = String(d.getMonth()+1).padStart(2,'0');
    const year  = d.getFullYear();
    const time  = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return fmt === 'dd/mm'
      ? `${day}/${month}/${year} ${time}`
      : `${month}/${day}/${year} ${time}`;
  } catch {
    return iso;
  }
}
