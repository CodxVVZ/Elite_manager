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

export function savePatchToStorage(patch: PatchData): void {
  const existing = listInstalledPatches();
  const idx = existing.findIndex(p => p.meta.name === patch.meta.name);
  if (idx >= 0) existing[idx] = patch; else existing.push(patch);
  localStorage.setItem(PATCH_STORAGE_KEY, JSON.stringify(existing));
}

export function listInstalledPatches(): PatchData[] {
  try {
    const raw = localStorage.getItem(PATCH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getActivePatch(): PatchData | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PATCH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setActivePatch(patch: PatchData | null): void {
  if (patch) localStorage.setItem(ACTIVE_PATCH_KEY, JSON.stringify(patch));
  else localStorage.removeItem(ACTIVE_PATCH_KEY);
}

export function deletePatch(name: string): void {
  const existing = listInstalledPatches().filter(p => p.meta.name !== name);
  localStorage.setItem(PATCH_STORAGE_KEY, JSON.stringify(existing));
  const active = getActivePatch();
  if (active?.meta.name === name) setActivePatch(null);
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

// ─── PATCH PADRÃO (Brasil 2026) ───────────────────────────────────────────────

export const defaultBrasilPatch: Omit<PatchData, 'teams'|'players'> = {
  meta: {
    name: 'Brasil 2026',
    version: '1.0',
    author: 'Elite Manager',
    season: 2026,
    country: 'Brasil',
    description: 'Futebol brasileiro — Brasileirão Série A, Copa do Brasil e Libertadores',
    createdAt: new Date().toISOString(),
  },
  competitions: [
    {
      id: 'brasileirao_2026',
      name: 'Brasileirão Série A',
      shortName: 'Brasileirão',
      type: 'league',
      country: 'Brasil',
      teamCount: 20,
      rounds: 38,
      legs: 2,
      matchDays: ['tuesday','wednesday','sunday'],
      startMonth: 4,
      qualified: { top: 6, into: 'libertadores_2026' },
      relegated: { bottom: 4 },
    },
    {
      id: 'copa_brasil_2026',
      name: 'Copa do Brasil',
      shortName: 'Copa BR',
      type: 'knockout',
      country: 'Brasil',
      teamCount: 64,
      legs: 2,
      matchDays: ['wednesday'],
      startMonth: 2,
    },
    {
      id: 'libertadores_2026',
      name: 'CONMEBOL Libertadores',
      shortName: 'Libertadores',
      type: 'groups_knockout',
      country: 'América do Sul',
      teamCount: 32,
      groupSize: 4,
      legs: 2,
      matchDays: ['tuesday','wednesday'],
      startMonth: 3,
    },
  ],
};
