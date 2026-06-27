// ─── SISTEMA DE PATCHES .emp ──────────────────────────────────────────────────
// .emp = Elite Manager Patch (ZIP renomeado com JSONs internos)

import JSZip from 'jszip';

export interface PatchMeta {
  name: string;
  version: string;
  author: string;
  season: number;
  country: string;
  description: string;
  createdAt: string;
}

export interface PatchCompetition {
  id: string;
  name: string;
  shortName: string;
  type: 'league' | 'knockout' | 'groups_knockout';
  country: string;
  teamCount: number;
  rounds?: number;
  groupSize?: number;
  legs: 1 | 2;
  matchDays: string[];
  startMonth: number;  // 1-12
  qualified?: { top: number; into: string };
  relegated?: { bottom: number };
}

export interface PatchTeam {
  id: number;
  name: string;
  abbreviation: string;
  city: string;
  country: string;
  clubLevel: 1 | 2 | 3 | 4;
  balance: number;
  monthlyIncome: number;
  objective: string;
  primaryColor: string;
  secondaryColor: string;
  competitions: string[];  // IDs das competições
  logoUrl?: string;
}

export interface PatchPlayer {
  id: number;
  teamId: number;
  name: string;
  position: string;
  age: number;
  height: number;
  overall: number;
  potential: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  salary: number;
  contractYears: number;
  nationality: string;
}

export interface PatchData {
  meta: PatchMeta;
  competitions: PatchCompetition[];
  teams: PatchTeam[];
  players: PatchPlayer[];
}

import localforage from 'localforage';

const PATCH_STORAGE_KEY = 'elite_manager_patches';
const ACTIVE_PATCH_KEY  = 'elite_manager_active_patch';

// ─── EXPORT .emp ──────────────────────────────────────────────────────────────

export async function exportPatch(data: PatchData): Promise<Blob> {
  const zip = new JSZip();
  zip.file('meta.json',         JSON.stringify(data.meta,         null, 2));
  zip.file('competitions.json', JSON.stringify(data.competitions, null, 2));
  zip.file('teams.json',        JSON.stringify(data.teams,        null, 2));
  zip.file('players.json',      JSON.stringify(data.players,      null, 2));
  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

// ─── IMPORT .emp ──────────────────────────────────────────────────────────────

export async function importPatch(file: File): Promise<PatchData> {
  // First, try parsing as raw JSON in case it's a single JSON file (even if renamed to .emp/.zip)
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.meta && data.teams && data.players) {
      return data as PatchData;
    }
    // Alternatively, it could be a JSON array of Teams from older versions
    if (Array.isArray(data) && data.length > 0 && data[0].players) {
       const legacyTeams: any[] = data;
       const patchTeams: PatchTeam[] = [];
       const patchPlayers: PatchPlayer[] = [];
       
       for (const t of legacyTeams) {
         patchTeams.push({
            id: t.id,
            name: t.name,
            abbreviation: t.abbreviation || t.name.substring(0,3).toUpperCase(),
            city: t.city || 'Desconhecida',
            country: 'Brasil', // Default
            clubLevel: t.clubLevel || 3,
            balance: t.balance || 20000000,
            monthlyIncome: t.monthlyIncome || 2000000,
            objective: t.objective || 'Manter-se',
            primaryColor: '#ffffff',
            secondaryColor: '#000000',
            competitions: ['brasileirao_2026'],
            logoUrl: t.logoUrl,
         });
         if (t.players) {
           for (const p of t.players) {
             patchPlayers.push({
               id: p.id,
               teamId: t.id,
               name: p.name,
               position: p.position,
               age: p.age,
               height: p.height || 180,
               overall: p.overall,
               potential: p.potential || p.overall,
               pace: p.pace || 50,
               shooting: p.shooting || 50,
               passing: p.passing || 50,
               dribbling: p.dribbling || 50,
               defense: p.defense || 50,
               physical: p.physical || 50,
               status: p.status || 'rotation',
               salary: p.salary || 10000,
               contractYears: p.contractYears || 2,
               personality: p.personality || 'professional',
             });
           }
         }
       }
       return {
         meta: {
           name: file.name.replace('.json', ''),
           version: "1.0",
           author: "Legacy Import",
           season: 2026,
           country: "Brasil",
           description: "Imported from legacy JSON format",
           createdAt: new Date().toISOString()
         },
         competitions: [], // Might need to just provide default empty or fallback
         teams: patchTeams,
         players: patchPlayers
       };
    }
  } catch (e) {
    // Not valid JSON, proceed to assume it's a JSZip archive
  }

  const zip = await JSZip.loadAsync(file);

  async function readJSON<T>(name: string): Promise<T> {
    const f = zip.file(name);
    if (!f) throw new Error(`Arquivo ${name} não encontrado no patch.`);
    const text = await f.async('string');
    return JSON.parse(text) as T;
  }

  const meta         = await readJSON<PatchMeta>('meta.json');
  const competitions = await readJSON<PatchCompetition[]>('competitions.json');
  const teams        = await readJSON<PatchTeam[]>('teams.json');
  const players      = await readJSON<PatchPlayer[]>('players.json');

  return { meta, competitions, teams, players };
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────

export async function savePatchToStorage(patch: PatchData): Promise<void> {
  const existing = await listInstalledPatches();
  const idx = existing.findIndex(p => p.meta.name === patch.meta.name);
  if (idx >= 0) existing[idx] = patch; else existing.push(patch);
  await localforage.setItem(PATCH_STORAGE_KEY, existing);
}

export async function listInstalledPatches(): Promise<PatchData[]> {
  try {
    const raw = await localforage.getItem<PatchData[]>(PATCH_STORAGE_KEY);
    return raw || [];
  } catch { return []; }
}

export async function getActivePatch(): Promise<PatchData | null> {
  try {
    const raw = await localforage.getItem<PatchData>(ACTIVE_PATCH_KEY);
    return raw || null;
  } catch { return null; }
}

export async function setActivePatch(patch: PatchData | null): Promise<void> {
  if (patch) {
    await localforage.setItem(ACTIVE_PATCH_KEY, patch);
  } else {
    await localforage.removeItem(ACTIVE_PATCH_KEY);
  }
}

export async function deletePatch(name: string): Promise<void> {
  const existing = (await listInstalledPatches()).filter(p => p.meta.name !== name);
  await localforage.setItem(PATCH_STORAGE_KEY, existing);
  const active = await getActivePatch();
  if (active?.meta.name === name) await setActivePatch(null);
}

// ─── DOWNLOAD HELPER ──────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CRIAR PATCH DO ZERO (a partir dos dados atuais do jogo) ─────────────────

export function buildPatchFromCurrentData(
  meta: Omit<PatchMeta, 'createdAt'>,
  competitions: PatchCompetition[],
  teams: PatchTeam[],
  players: PatchPlayer[],
): PatchData {
  return {
    meta: { ...meta, createdAt: new Date().toISOString() },
    competitions,
    teams,
    players,
  };
}

// ─── PATCH PADRÃO (Mundo 2026) ────────────────────────────────────────────────

import { LEAGUES, COUNTRIES } from './teams';
import { generateStructuredFictionalLeague } from '../src/mockData';

export function getDefaultBrasilPatch(): PatchData {
  return {
    meta: {
      name: 'Banco Limpo',
      version: '1.0',
      author: 'Elite Manager',
      season: 2026,
      country: 'Mundo',
      description: 'Banco de dados sem times por padrão.',
      createdAt: new Date().toISOString(),
    },
    competitions: [],
    teams: [],
    players: [],
  };
}
