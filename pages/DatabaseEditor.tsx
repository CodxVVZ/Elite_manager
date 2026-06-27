import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { 
  ArrowLeft, Plus, Trash2, Edit, Search, Users, Database, 
  Download, Upload, AlertTriangle, Check, ShieldCheck, RefreshCw 
} from "lucide-react";
import { 
  PatchCompetition, PatchTeam, PatchPlayer, PatchData,
  getActivePatch, setActivePatch, savePatchToStorage, listInstalledPatches
} from "@/lib/patchSystem";
import { loadActivePatchToMemory, Team, Player, PlayerStatus, PlayerPersonality } from "@/lib/teams";
import localforage from "localforage";

// ─── MATHEMATICAL FORMULAS FOR PLAYER ATTRIBUTES ──────────────────────────────

export function calculateOverall(
  pos: string, 
  attr: { pace: number; shooting: number; passing: number; dribbling: number; defense: number; physical: number }
): number {
  let ovr = 50;
  const { pace, shooting, passing, dribbling, defense, physical } = attr;
  switch (pos) {
    case 'GK':
      ovr = defense * 0.45 + physical * 0.25 + passing * 0.15 + pace * 0.1 + dribbling * 0.05;
      break;
    case 'CB':
      ovr = defense * 0.45 + physical * 0.35 + passing * 0.1 + pace * 0.1;
      break;
    case 'LB':
    case 'RB':
      ovr = pace * 0.3 + defense * 0.3 + passing * 0.2 + dribbling * 0.1 + physical * 0.1;
      break;
    case 'CDM':
      ovr = defense * 0.35 + physical * 0.25 + passing * 0.25 + pace * 0.1 + dribbling * 0.05;
      break;
    case 'CM':
      ovr = passing * 0.35 + dribbling * 0.2 + defense * 0.15 + physical * 0.15 + shooting * 0.1 + pace * 0.05;
      break;
    case 'CAM':
      ovr = passing * 0.3 + dribbling * 0.3 + shooting * 0.2 + pace * 0.15 + physical * 0.05;
      break;
    case 'LM':
    case 'RM':
      ovr = pace * 0.35 + dribbling * 0.25 + passing * 0.2 + shooting * 0.15 + physical * 0.05;
      break;
    case 'LW':
    case 'RW':
      ovr = pace * 0.35 + dribbling * 0.3 + shooting * 0.2 + passing * 0.1 + physical * 0.05;
      break;
    case 'ST':
      ovr = shooting * 0.45 + physical * 0.2 + pace * 0.2 + dribbling * 0.1 + passing * 0.05;
      break;
    default:
      ovr = (pace + shooting + passing + dribbling + defense + physical) / 6;
  }
  return Math.min(99, Math.max(10, Math.round(ovr)));
}

export function calculatePotential(overall: number, age: number): number {
  let bonus = 0;
  if (age <= 21) {
    bonus = Math.max(4, 25 - age);
  } else if (age <= 25) {
    bonus = Math.max(1, 26 - age);
  } else if (age <= 28) {
    bonus = 1;
  }
  return Math.min(99, overall + bonus);
}

export function suggestSalary(overall: number, clubLevel: number): number {
  // Level 1: Small (Multiplier 1x), Level 4: Elite (Multiplier 4x)
  const base = Math.max(1000, Math.round(Math.pow(overall / 40, 4.2) * 800 * clubLevel));
  // Round to nearest 500
  return Math.round(base / 500) * 500;
}

// ─── DATABASE LOAD & SAVE INTERFACE ───────────────────────────────────────────

async function loadFromDatabase() {
  const ap = await getActivePatch();
  let competitions: PatchCompetition[] = [];
  let teamsList: Team[] = [];
  let playersRecord: Record<number, Player[]> = {};

  if (ap) {
    competitions = (ap.competitions || []).filter(Boolean);
    teamsList = (ap.teams || []).filter(Boolean).map(t => {
      const teamPlayers = (ap.players || []).filter(Boolean).filter(p => p.teamId === t.id).map(p => ({
        ...p,
        status: (p.status as PlayerStatus) || 'rotation',
        personality: (p.personality as PlayerPersonality) || 'professional'
      }));
      return {
        id: t.id,
        name: t.name,
        abbreviation: t.abbreviation || t.name.substring(0,3).toUpperCase(),
        city: t.city || 'Desconhecida',
        clubLevel: t.clubLevel || 3,
        balance: t.balance || 20000000,
        monthlyIncome: t.monthlyIncome || 2000000,
        objective: t.objective || 'Manter-se',
        primaryColor: t.primaryColor || '#ffffff',
        secondaryColor: t.secondaryColor || '#000000',
        leagueId: (t as any).leagueId || (t.competitions && t.competitions[0]) || '',
        players: teamPlayers,
      } as unknown as Team;
    });

    teamsList.forEach(t => {
      playersRecord[t.id] = t.players || [];
    });
  } else {
    const draftComp = await localforage.getItem<PatchCompetition[]>('editor_local_competitions');
    if (draftComp) {
      competitions = draftComp.filter(Boolean);
    }
    
    const draftTeams = await localforage.getItem<Team[]>('editor_local_teams');
    const draftPlayers = await localforage.getItem<Record<number, Player[]>>('editor_local_players');

    if (draftTeams) {
      teamsList = draftTeams.filter(Boolean).map(t => ({
        ...t,
        players: draftPlayers?.[t.id] ?? t.players ?? []
      }));
    }

    if (draftPlayers) {
      playersRecord = draftPlayers;
    } else {
      teamsList.forEach(t => {
        playersRecord[t.id] = t.players || [];
      });
    }
  }

  return { competitions, teamsList, playersRecord };
}

async function saveToDatabase(
  competitions: PatchCompetition[],
  teamsList: Team[],
  playersRecord: Record<number, Player[]>
) {
  const ap = await getActivePatch();
  
  // Clean arrays of undefined/nulls
  const cleanCompetitions = competitions.filter(Boolean);
  const cleanTeams = teamsList.filter(Boolean);

  // Recalculate teamCount dynamically for each competition based on assigned teams
  const finalizedCompetitions = cleanCompetitions.map(comp => {
    const count = cleanTeams.filter(t => (t as any).leagueId === comp.id || (t.competitions && t.competitions.includes(comp.id))).length;
    return {
      ...comp,
      teamCount: count
    };
  });

  // Flat players array for patch format
  const patchPlayers: PatchPlayer[] = [];
  Object.entries(playersRecord).forEach(([tId, plist]) => {
    if (!plist) return;
    plist.filter(Boolean).forEach(p => {
      patchPlayers.push({
        id: p.id,
        teamId: Number(tId),
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
        salary: p.salary || 10000,
        contractYears: p.contractYears || 2,
        nationality: p.nationality || 'Brasileiro'
      });
    });
  });

  const patchTeams: PatchTeam[] = cleanTeams.map(t => ({
    id: Number(t.id),
    name: t.name,
    abbreviation: t.abbreviation || t.name.substring(0,3).toUpperCase(),
    city: t.city || 'Desconhecida',
    country: 'Brasil',
    clubLevel: t.clubLevel || 3,
    balance: t.balance || 20000000,
    monthlyIncome: t.monthlyIncome || 2000000,
    objective: t.objective || 'Manter-se',
    primaryColor: (t as any).primaryColor || '#ffffff',
    secondaryColor: (t as any).secondaryColor || '#000000',
    competitions: (t as any).competitions || ((t as any).leagueId ? [(t as any).leagueId] : []),
    logoUrl: (t as any).logoUrl || '',
  }));

  const updatedPatch: PatchData = {
    meta: {
      name: ap?.meta?.name || "ImportedBackup",
      version: ap?.meta?.version || "1.0",
      author: ap?.meta?.author || "Editor de Banco de Dados",
      season: ap?.meta?.season || 2026,
      country: ap?.meta?.country || "Brasil",
      description: ap?.meta?.description || "Banco de dados ativo importado",
      createdAt: new Date().toISOString(),
    },
    competitions: finalizedCompetitions,
    teams: patchTeams,
    players: patchPlayers,
  };

  await setActivePatch(updatedPatch);
  await savePatchToStorage(updatedPatch);

  // Always write editor local draft keys to keep completely in sync
  await localforage.setItem('editor_local_competitions', finalizedCompetitions);
  
  const draftTeams = cleanTeams.map(t => ({
    ...t,
    players: playersRecord[t.id] ?? []
  }));
  await localforage.setItem('editor_local_teams', draftTeams);
  await localforage.setItem('editor_local_players', playersRecord);

  // Instantly load changes to active memory
  await loadActivePatchToMemory();
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DatabaseEditor() {
  const { isDarkMode } = useDarkMode();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dark = isDarkMode;
  const bg = dark ? "bg-gray-950 text-white" : "bg-white text-gray-900";
  const cardBg = dark ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-200 border";
  const sub = dark ? "text-gray-400" : "text-gray-500";
  const inputStyle = dark 
    ? "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
    : "w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-green-500";

  // Navigation / View modes:
  // 'leagues' (list of leagues)
  // 'league' (selected league with its list of clubs)
  // 'club' (selected club details + squad list)
  const [viewMode, setViewMode] = useState<'leagues' | 'league' | 'club'>('leagues');

  // Loaded DB lists
  const [competitions, setCompetitions] = useState<PatchCompetition[]>([]);
  const [teamsList, setTeamsList] = useState<Team[]>([]);
  const [playersRecord, setPlayersRecord] = useState<Record<number, Player[]>>({});
  const [loading, setLoading] = useState(true);

  // Auto-save Indicator state
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Selected entities for drilldown navigation
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('');
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);

  // Forms / Modals state
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [leagueForm, setLeagueForm] = useState({ id: '', name: '', country: 'Brasil', type: 'league' as 'league' | 'knockout' });
  
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [clubForm, setClubForm] = useState({
    name: '',
    abbreviation: '',
    stadiumName: '',
    stadiumCapacity: 30000,
    city: '',
    clubLevel: 3 as ClubLevel,
    balance: 20000000,
    monthlyIncome: 2000000,
    objective: 'Ficar no meio da tabela',
    primaryColor: '#004cff',
    secondaryColor: '#ffffff',
    leagueId: ''
  });

  // Player editing modal
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Partial<Player> | null>(null);
  const [playerForm, setPlayerForm] = useState({
    id: 0,
    name: '',
    position: 'ST',
    age: 23,
    height: 180,
    nationality: 'Brasileiro',
    pace: 75,
    shooting: 75,
    passing: 75,
    dribbling: 75,
    defense: 50,
    physical: 75,
    status: 'rotation' as PlayerStatus,
    personality: 'professional' as PlayerPersonality,
    contractYears: 3,
    salary: 50000
  });

  // Search & Filter squad list
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerPosFilter, setPlayerPosFilter] = useState('ALL');

  // Load database on mount
  useEffect(() => {
    async function init() {
      try {
        const data = await loadFromDatabase();
        setCompetitions(data.competitions);
        setTeamsList(data.teamsList);
        setPlayersRecord(data.playersRecord);
      } catch (err) {
        console.error("Erro ao iniciar DB editor:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Central trigger function to save immediately and update visual state
  const triggerAutoSave = async (
    comps: PatchCompetition[],
    tms: Team[],
    playrs: Record<number, Player[]>
  ) => {
    setSaveState('saving');
    try {
      await saveToDatabase(comps, tms, playrs);
      setSaveState('saved');
      // Set to idle after 1.5 seconds for clean effect
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (e) {
      console.error("Erro ao salvar dados automaticamente:", e);
      setSaveState('idle');
    }
  };

  // ─── LEAGUE FUNCTIONS ────────────────────────────────────────────────────────

  const handleCreateLeague = async () => {
    if (!leagueForm.id.trim() || !leagueForm.name.trim()) {
      alert("Por favor, preencha o código curto e o nome da liga.");
      return;
    }
    const cleanId = leagueForm.id.trim().toUpperCase();
    if (competitions.some(c => c.id === cleanId)) {
      alert("Já existe uma liga/competição com este código curto.");
      return;
    }

    const newLeague: PatchCompetition = {
      id: cleanId,
      name: leagueForm.name.trim(),
      shortName: leagueForm.name.trim(),
      country: leagueForm.country,
      type: leagueForm.type,
      legs: 2,
      matchDays: ['tuesday', 'wednesday', 'sunday'],
      startMonth: 1,
      teamCount: 0
    };

    const updatedComps = [...competitions, newLeague];
    setCompetitions(updatedComps);
    setShowCreateLeague(false);
    setLeagueForm({ id: '', name: '', country: 'Brasil', type: 'league' });
    
    await triggerAutoSave(updatedComps, teamsList, playersRecord);
  };

  const handleDeleteLeague = async (leagueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta liga? Todos os times vinculados perderão a liga associada.")) {
      return;
    }

    const updatedComps = competitions.filter(c => c.id !== leagueId);
    setCompetitions(updatedComps);

    // Unlink teams associated with deleted league
    const updatedTeams = teamsList.map(t => {
      if ((t as any).leagueId === leagueId) {
        return { ...t, leagueId: '' };
      }
      return t;
    });
    setTeamsList(updatedTeams);

    if (selectedLeagueId === leagueId) {
      setViewMode('leagues');
      setSelectedLeagueId('');
    }

    await triggerAutoSave(updatedComps, updatedTeams, playersRecord);
  };

  // ─── CLUB FUNCTIONS ──────────────────────────────────────────────────────────

  // Auto suggest abbreviation from club name
  const handleClubNameChange = (val: string) => {
    const suggestedAbbrev = val.trim().substring(0, 3).toUpperCase();
    setClubForm(prev => ({
      ...prev,
      name: val,
      abbreviation: prev.abbreviation === prev.name.trim().substring(0, 3).toUpperCase() || !prev.abbreviation 
        ? suggestedAbbrev 
        : prev.abbreviation
    }));
  };

  const handleCreateClub = async () => {
    if (!clubForm.name.trim() || !clubForm.leagueId) {
      alert("Por favor, preencha o nome do clube e selecione uma liga.");
      return;
    }

    const newClubId = Date.now(); // Unique temporary timestamp ID
    const newClubObj: Team = {
      id: newClubId,
      name: clubForm.name.trim(),
      abbreviation: clubForm.abbreviation.trim() || clubForm.name.trim().substring(0, 3).toUpperCase(),
      city: clubForm.city.trim() || 'Desconhecida',
      clubLevel: clubForm.clubLevel,
      balance: Number(clubForm.balance) || 1000000,
      monthlyIncome: Number(clubForm.monthlyIncome) || 100000,
      objective: clubForm.objective || 'Manter-se na liga',
      players: []
    };
    (newClubObj as any).leagueId = clubForm.leagueId;
    (newClubObj as any).primaryColor = clubForm.primaryColor;
    (newClubObj as any).secondaryColor = clubForm.secondaryColor;

    const updatedTeams = [...teamsList, newClubObj];
    setTeamsList(updatedTeams);

    const updatedPlayersRecord = {
      ...playersRecord,
      [newClubId]: []
    };
    setPlayersRecord(updatedPlayersRecord);

    setShowCreateClub(false);
    setClubForm({
      name: '',
      abbreviation: '',
      stadiumName: '',
      stadiumCapacity: 30000,
      city: '',
      clubLevel: 3,
      balance: 20000000,
      monthlyIncome: 2000000,
      objective: 'Ficar no meio da tabela',
      primaryColor: '#004cff',
      secondaryColor: '#ffffff',
      leagueId: clubForm.leagueId
    });

    await triggerAutoSave(competitions, updatedTeams, updatedPlayersRecord);
  };

  const handleDeleteClub = async (clubId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este clube removerá também todos os seus jogadores. Deseja continuar?")) {
      return;
    }

    const updatedTeams = teamsList.filter(t => t.id !== clubId);
    setTeamsList(updatedTeams);

    const updatedPlayersRecord = { ...playersRecord };
    delete updatedPlayersRecord[clubId];
    setPlayersRecord(updatedPlayersRecord);

    if (selectedClubId === clubId) {
      setViewMode('league');
      setSelectedClubId(null);
    }

    await triggerAutoSave(competitions, updatedTeams, updatedPlayersRecord);
  };

  const handleUpdateClubField = async (field: keyof Team | 'leagueId' | 'primaryColor' | 'secondaryColor', value: any) => {
    if (!selectedClubId) return;

    const updatedTeams = teamsList.map(t => {
      if (t.id === selectedClubId) {
        // Suggest abbreviation if name changed
        if (field === 'name') {
          const suggestedAbbrev = (value as string).trim().substring(0, 3).toUpperCase();
          const oldSuggested = t.name.trim().substring(0, 3).toUpperCase();
          const abbrev = t.abbreviation === oldSuggested ? suggestedAbbrev : t.abbreviation;
          return { ...t, name: value, abbreviation: abbrev };
        }
        return { ...t, [field]: value };
      }
      return t;
    });

    setTeamsList(updatedTeams);
    await triggerAutoSave(competitions, updatedTeams, playersRecord);
  };

  // ─── PLAYER FUNCTIONS ────────────────────────────────────────────────────────

  // Suggested values based on form changes
  const handlePlayerFormAttrChange = (field: string, val: number) => {
    setPlayerForm(prev => {
      const updated = { ...prev, [field]: val };
      const computedOvr = calculateOverall(updated.position, updated);
      const computedPot = calculatePotential(computedOvr, updated.age);
      // Auto-suggest salary if not customized by user yet (or provide update option)
      const suggestedSal = suggestSalary(computedOvr, currentClub?.clubLevel || 3);
      
      return {
        ...updated,
        overall: computedOvr,
        potential: computedPot,
        salary: prev.salary === suggestSalary(calculateOverall(prev.position, prev), currentClub?.clubLevel || 3)
          ? suggestedSal
          : prev.salary
      };
    });
  };

  const handlePlayerFormPosChange = (val: string) => {
    setPlayerForm(prev => {
      const updated = { ...prev, position: val };
      const computedOvr = calculateOverall(val, updated);
      const computedPot = calculatePotential(computedOvr, updated.age);
      const suggestedSal = suggestSalary(computedOvr, currentClub?.clubLevel || 3);

      return {
        ...updated,
        overall: computedOvr,
        potential: computedPot,
        salary: prev.salary === suggestSalary(calculateOverall(prev.position, prev), currentClub?.clubLevel || 3)
          ? suggestedSal
          : prev.salary
      };
    });
  };

  const handlePlayerFormAgeChange = (val: number) => {
    setPlayerForm(prev => {
      const computedPot = calculatePotential(prev.overall, val);
      return { ...prev, age: val, potential: computedPot };
    });
  };

  const handleOpenAddPlayer = () => {
    if (!selectedClubId) return;
    const initialForm = {
      id: 0, // 0 denotes "Create new"
      name: '',
      position: 'ST',
      age: 22,
      height: 182,
      nationality: 'Brasileiro',
      pace: 70,
      shooting: 70,
      passing: 65,
      dribbling: 70,
      defense: 45,
      physical: 68,
      status: 'rotation' as PlayerStatus,
      personality: 'professional' as PlayerPersonality,
      contractYears: 2,
      salary: 0
    };
    
    // Compute suggested salary & initial overall/potential
    const initialOvr = calculateOverall(initialForm.position, initialForm);
    const initialPot = calculatePotential(initialOvr, initialForm.age);
    initialForm.salary = suggestSalary(initialOvr, currentClub?.clubLevel || 3);

    setPlayerForm({
      ...initialForm,
      overall: initialOvr,
      potential: initialPot
    });
    setEditingPlayer(null);
    setShowPlayerModal(true);
  };

  const handleOpenEditPlayer = (p: Player) => {
    setPlayerForm({
      id: p.id,
      name: p.name,
      position: p.position,
      age: p.age,
      height: p.height || 180,
      nationality: (p as any).nationality || 'Brasileiro',
      pace: p.pace || 50,
      shooting: p.shooting || 50,
      passing: p.passing || 50,
      dribbling: p.dribbling || 50,
      defense: p.defense || 50,
      physical: p.physical || 50,
      status: p.status || 'rotation',
      personality: p.personality || 'professional',
      contractYears: p.contractYears || 2,
      salary: p.salary || 10000,
      overall: p.overall,
      potential: p.potential
    });
    setEditingPlayer(p);
    setShowPlayerModal(true);
  };

  const handleSavePlayer = async () => {
    if (!selectedClubId) return;
    if (!playerForm.name.trim()) {
      alert("O jogador precisa de um nome.");
      return;
    }

    const currentClubPlayers = playersRecord[selectedClubId] || [];
    let updatedPlayers: Player[] = [];

    if (editingPlayer) {
      // Edit existing player
      updatedPlayers = currentClubPlayers.map(p => {
        if (p.id === editingPlayer.id) {
          return {
            ...p,
            name: playerForm.name.trim(),
            position: playerForm.position,
            age: Number(playerForm.age),
            height: Number(playerForm.height),
            nationality: playerForm.nationality,
            pace: Number(playerForm.pace),
            shooting: Number(playerForm.shooting),
            passing: Number(playerForm.passing),
            dribbling: Number(playerForm.dribbling),
            defense: Number(playerForm.defense),
            physical: Number(playerForm.physical),
            overall: Number(playerForm.overall),
            potential: Number(playerForm.potential),
            status: playerForm.status,
            personality: playerForm.personality,
            contractYears: Number(playerForm.contractYears),
            salary: Number(playerForm.salary)
          } as unknown as Player;
        }
        return p;
      });
    } else {
      // Create new player
      const newPlayerObj: Player = {
        id: Date.now() + Math.floor(Math.random() * 1000), // unique timestamp + rand ID
        name: playerForm.name.trim(),
        position: playerForm.position,
        age: Number(playerForm.age),
        height: Number(playerForm.height),
        overall: Number(playerForm.overall),
        potential: Number(playerForm.potential),
        pace: Number(playerForm.pace),
        shooting: Number(playerForm.shooting),
        passing: Number(playerForm.passing),
        dribbling: Number(playerForm.dribbling),
        defense: Number(playerForm.defense),
        physical: Number(playerForm.physical),
        fatigue: 100,
        morale: 80,
        happiness: 80,
        status: playerForm.status,
        personality: playerForm.personality,
        contractYears: Number(playerForm.contractYears),
        injuryWeeks: 0
      };
      (newPlayerObj as any).nationality = playerForm.nationality;
      (newPlayerObj as any).salary = Number(playerForm.salary);

      updatedPlayers = [...currentClubPlayers, newPlayerObj];
    }

    const updatedPlayersRecord = {
      ...playersRecord,
      [selectedClubId]: updatedPlayers
    };
    setPlayersRecord(updatedPlayersRecord);
    setShowPlayerModal(false);

    // Refresh memory and save
    await triggerAutoSave(competitions, teamsList, updatedPlayersRecord);
  };

  const handleDeletePlayer = async (pId: number) => {
    if (!selectedClubId) return;
    if (!confirm("Tem certeza que deseja excluir este jogador?")) {
      return;
    }

    const currentClubPlayers = playersRecord[selectedClubId] || [];
    const updatedPlayers = currentClubPlayers.filter(p => p.id !== pId);

    const updatedPlayersRecord = {
      ...playersRecord,
      [selectedClubId]: updatedPlayers
    };
    setPlayersRecord(updatedPlayersRecord);

    await triggerAutoSave(competitions, teamsList, updatedPlayersRecord);
  };

  // ─── BACKUP & IMPORT HELPER ──────────────────────────────────────────────────

  const handleExportBackup = () => {
    try {
      const apMeta = competitions[0]?.country || 'Database';
      const backupData = {
        meta: {
          name: "EliteManagerBackup_" + apMeta,
          version: "1.0",
          author: "Editor de Banco de Dados",
          season: 2026,
          country: "Brasil",
          description: "Backup de segurança exportado do Editor",
          createdAt: new Date().toISOString()
        },
        competitions,
        teams: teamsList.map(t => ({
          id: t.id,
          name: t.name,
          abbreviation: t.abbreviation,
          city: t.city,
          country: 'Brasil',
          clubLevel: t.clubLevel,
          balance: t.balance,
          monthlyIncome: t.monthlyIncome,
          objective: t.objective,
          primaryColor: (t as any).primaryColor || '#ffffff',
          secondaryColor: (t as any).secondaryColor || '#000000',
          competitions: (t as any).competitions || ((t as any).leagueId ? [(t as any).leagueId] : []),
        })),
        players: Object.entries(playersRecord).flatMap(([teamId, squad]) => 
          squad.map(p => ({
            id: p.id,
            teamId: Number(teamId),
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
            salary: p.salary || 10000,
            contractYears: p.contractYears || 2,
            nationality: (p as any).nationality || 'Brasileiro'
          }))
        )
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `elitemanager_db_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Erro ao exportar backup: " + err.message);
    }
  };

  const handleImportBackupClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("[Import] Seletor de arquivo acionado. Arquivo escolhido:", file.name, "Tamanho:", file.size, "bytes.");

    try {
      let data: any;
      console.log("[Import] Iniciando a leitura do arquivo JSON...");
      try {
        const text = await file.text();
        console.log("[Import] Arquivo lido com sucesso. Tamanho do texto:", text.length, "bytes.");
        console.log("[Import] Efetuando parse do texto JSON...");
        data = JSON.parse(text);
        console.log("[Import] Parse concluído com sucesso. Chaves encontradas no objeto:", Object.keys(data));
      } catch (jsonErr: any) {
        console.error("[Import] Erro crítico no parse do JSON. O arquivo não é um JSON válido:", jsonErr);
        const errorMsg = "Arquivo inválido, não é um JSON válido";
        showToast(errorMsg, "error");
        alert(errorMsg);
        return;
      }

      console.log("[Import] Validando presença dos campos obrigatórios: meta, competitions, teams, players...");
      const requiredFields = ["meta", "competitions", "teams", "players"];
      const missingFields = requiredFields.filter(field => !data || !(field in data));

      if (missingFields.length > 0) {
        console.error("[Import] Validação de campos falhou. Campos ausentes:", missingFields);
        const errorMsg = `Formato incorreto, faltam campos: [${missingFields.join(", ")}]`;
        showToast(errorMsg, "error");
        alert(errorMsg);
        return;
      }

      console.log("[Import] Validação de campos obrigatórios passou com sucesso.");

      if (!confirm("Isso irá substituir os dados atuais do jogo pelo backup selecionado. Deseja continuar?")) {
        console.log("[Import] Importação cancelada pelo usuário na caixa de confirmação.");
        return;
      }

      console.log("[Import] Usuário confirmou a substituição. Iniciando mapeamento e conversão de ligas/competições...");
      const importedComps: PatchCompetition[] = data.competitions;
      
      console.log("[Import] Mapeando e normalizando os clubes/times...");
      const importedTeams: Team[] = data.teams.map((t: any) => ({
        id: t.id,
        name: t.name,
        abbreviation: t.abbreviation || t.name.substring(0,3).toUpperCase(),
        city: t.city || 'Desconhecida',
        clubLevel: t.clubLevel || 3,
        balance: t.balance || 20000000,
        monthlyIncome: t.monthlyIncome || 2000000,
        objective: t.objective || 'Manter-se',
        primaryColor: t.primaryColor || '#ffffff',
        secondaryColor: t.secondaryColor || '#000000',
        leagueId: t.leagueId || (t.competitions && t.competitions[0]) || '',
        players: []
      }));

      console.log(`[Import] Ligas mapeadas: ${importedComps.length}. Clubes mapeados: ${importedTeams.length}. Iniciando processamento dos jogadores...`);
      const importedPlayersRecord: Record<number, Player[]> = {};
      importedTeams.forEach(t => {
        importedPlayersRecord[t.id] = [];
      });

      data.players.forEach((p: any) => {
        const teamId = p.teamId;
        if (!importedPlayersRecord[teamId]) {
          importedPlayersRecord[teamId] = [];
        }
        importedPlayersRecord[teamId].push({
          id: p.id,
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
          personality: p.personality || 'professional',
          contractYears: p.contractYears || 2,
          salary: p.salary || 10000,
          fatigue: 100,
          morale: 80,
          happiness: 80,
          injuryWeeks: 0
        } as unknown as Player);
      });

      // Populate teams lists too
      importedTeams.forEach(t => {
        t.players = importedPlayersRecord[t.id];
      });

      const totalPlayersCount = data.players.length;
      console.log(`[Import] Jogadores mapeados: ${totalPlayersCount}. Processamento em memória concluído.`);

      console.log("[Import] Gravando o backup importado duravelmente no banco de dados ativo (localStorage + localforage)...");
      await saveToDatabase(importedComps, importedTeams, importedPlayersRecord);
      console.log("[Import] Gravação concluída com sucesso.");

      console.log("[Import] Atualizando estados locais do React para forçar a atualização imediata da tela...");
      setCompetitions(importedComps);
      setTeamsList(importedTeams);
      setPlayersRecord(importedPlayersRecord);

      // Reset selection and navigation to root so we don't crash viewing a deleted entity
      console.log("[Import] Resetando navegação interna e filtros de drilldown para a página raiz de ligas...");
      setViewMode('leagues');
      setSelectedLeagueId('');
      setSelectedClubId(null);

      const successMsg = `Importado: ${importedComps.length} ligas, ${importedTeams.length} times, ${totalPlayersCount} jogadores`;
      console.log(`[Import] Importação concluída com sucesso completo! ${successMsg}`);
      showToast(successMsg, "success");
      alert(successMsg);
    } catch (err: any) {
      console.error("[Import] Erro crítico detalhado capturado durante a importação do banco de dados:", err);
      const errorMsg = "Erro ao ler backup JSON: " + (err.message || "Erro desconhecido");
      showToast(errorMsg, "error");
      alert(errorMsg);
    } finally {
      // Clear value of the file input element to allow re-uploading the same file successfully
      e.target.value = "";
      console.log("[Import] Evento finalizado. Input de arquivo liberado.");
    }
  };

  // ─── DERIVED STATES & SEARCHES ────────────────────────────────────────────────

  const currentLeague = useMemo(() => {
    return competitions.find(c => c.id === selectedLeagueId);
  }, [competitions, selectedLeagueId]);

  const currentClub = useMemo(() => {
    return teamsList.find(t => t.id === selectedClubId);
  }, [teamsList, selectedClubId]);

  // List of clubs inside selected league
  const clubsInSelectedLeague = useMemo(() => {
    return teamsList.filter(t => (t as any).leagueId === selectedLeagueId || (t.competitions && t.competitions.includes(selectedLeagueId)));
  }, [teamsList, selectedLeagueId]);

  // List of players inside selected club with active filters
  const filteredSquad = useMemo(() => {
    if (!selectedClubId) return [];
    const rawList = playersRecord[selectedClubId] || [];
    return rawList.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(playerSearch.toLowerCase());
      const matchPos = playerPosFilter === 'ALL' || p.position === playerPosFilter;
      return matchSearch && matchPos;
    });
  }, [playersRecord, selectedClubId, playerSearch, playerPosFilter]);

  // ─── ALERTS AND WARNINGS (VALOR DE NEGÓCIO IMPORTANTE) ─────────────────────────

  const warnings = useMemo(() => {
    if (!currentClub) return [];
    const list: string[] = [];
    const squad = playersRecord[currentClub.id] || [];

    // Less than 15 players
    if (squad.length < 15) {
      list.push(`O elenco possui menos de 15 jogadores (atualmente: ${squad.length}). O jogo pode ficar instável.`);
    }

    // No goalkeeper (GK)
    const hasGk = squad.some(p => p.position === 'GK');
    if (!hasGk) {
      list.push("O elenco não possui goleiros (GK) cadastrados.");
    }

    // Duplicate club name in same league
    const duplicateName = clubsInSelectedLeague.some(t => t.id !== currentClub.id && t.name.trim().toLowerCase() === currentClub.name.trim().toLowerCase());
    if (duplicateName) {
      list.push(`Já existe outro clube com o nome "${currentClub.name}" cadastrado nesta mesma liga.`);
    }

    return list;
  }, [currentClub, playersRecord, clubsInSelectedLeague]);

  // Render Loader if loading initial DB
  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${bg}`}>
        <RefreshCw className="w-8 h-8 text-green-500 animate-spin mb-3" />
        <p className="text-sm font-bold">Carregando Banco de Dados do Jogo...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${bg} pb-10`}>
      {/* ─── HEADER ─── */}
      <header className={`border-b ${dark ? "border-gray-800 bg-gray-900/50" : "border-gray-200 bg-gray-50"} sticky top-0 z-40 backdrop-blur-md px-4 py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (viewMode === 'club') {
                setViewMode('league');
                setSelectedClubId(null);
              } else if (viewMode === 'league') {
                setViewMode('leagues');
                setSelectedLeagueId('');
              } else {
                navigate("/");
              }
            }}
            className={`p-2 rounded-lg transition-colors ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-green-500" />
              Editor de Banco de Dados
            </h1>
            <p className="text-[10px] opacity-70">Estrutura ativa do jogo</p>
          </div>
        </div>

        {/* Dynamic visual check indicators */}
        <div className="flex items-center gap-3">
          {saveState === 'saving' && (
            <div className="flex items-center gap-1.5 text-yellow-500 text-xs font-semibold px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Salvando...</span>
            </div>
          )}
          {saveState === 'saved' && (
            <div className="flex items-center gap-1 text-green-500 text-xs font-bold px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
              <Check className="w-3 h-3" />
              <span>Salvo automaticamente</span>
            </div>
          )}
          {saveState === 'idle' && (
            <div className="flex items-center gap-1 text-gray-400 text-xs font-normal px-2 py-1 rounded bg-gray-500/5">
              <ShieldCheck className="w-3 h-3 text-green-500" />
              <span>Sincronizado</span>
            </div>
          )}

          {/* Backup dropdown / buttons */}
          <button 
            onClick={handleExportBackup} 
            title="Exportar .json de Backup"
            className={`p-2 rounded-lg transition-colors border ${dark ? "bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-700"}`}
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={handleImportBackupClick} 
            title="Importar .json de Backup"
            className={`p-2 rounded-lg transition-colors border ${dark ? "bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-300" : "bg-white border-gray-200 hover:bg-gray-100 text-gray-700"}`}
          >
            <Upload className="w-4 h-4" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".json" 
            className="hidden" 
            onChange={handleImportBackupFile} 
          />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 mt-6">
        
        {/* ─── MAIN BREADCRUMB ─── */}
        <div className={`mb-5 flex items-center gap-1.5 text-xs ${sub}`}>
          <span className="hover:underline cursor-pointer font-medium" onClick={() => { setViewMode('leagues'); setSelectedLeagueId(''); setSelectedClubId(null); }}>
            Ligas
          </span>
          {selectedLeagueId && (
            <>
              <span>/</span>
              <span className="hover:underline cursor-pointer font-medium" onClick={() => { setViewMode('league'); setSelectedClubId(null); }}>
                {currentLeague?.name}
              </span>
            </>
          )}
          {selectedClubId && currentClub && (
            <>
              <span>/</span>
              <span className="font-semibold text-green-500">
                {currentClub.name}
              </span>
            </>
          )}
        </div>

        {/* ─── VIEW 1: LEAGUE LIST ─── */}
        {viewMode === 'leagues' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Ligas & Competições</h2>
                <p className="text-xs text-gray-400">Ligas cadastradas no banco de dados.</p>
              </div>
              <button 
                onClick={() => setShowCreateLeague(true)}
                className="px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-green-600/10"
              >
                <Plus className="w-4 h-4" />
                Criar Liga
              </button>
            </div>

            {/* FORMULARIO CRIAÇÃO DE LIGA */}
            {showCreateLeague && (
              <div className={`${cardBg} p-5 rounded-2xl space-y-4 shadow-sm border border-green-500/20`}>
                <h3 className="text-sm font-bold border-b pb-2 mb-2">Nova Liga / Competição</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Código Curto (ID único)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: BR_A"
                      className={inputStyle}
                      value={leagueForm.id}
                      onChange={e => setLeagueForm(prev => ({ ...prev, id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Nome da Liga</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Brasileirão Série A"
                      className={inputStyle}
                      value={leagueForm.name}
                      onChange={e => setLeagueForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">País</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Brasil"
                      className={inputStyle}
                      value={leagueForm.country}
                      onChange={e => setLeagueForm(prev => ({ ...prev, country: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Tipo de Formato</label>
                    <select 
                      className={inputStyle}
                      value={leagueForm.type}
                      onChange={e => setLeagueForm(prev => ({ ...prev, type: e.target.value as 'league' | 'knockout' }))}
                    >
                      <option value="league">Liga de Pontos Corridos</option>
                      <option value="knockout">Copa Eliminatória (Mata-Mata)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button 
                    onClick={() => setShowCreateLeague(false)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border ${dark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-100"}`}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateLeague}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold"
                  >
                    Criar Liga
                  </button>
                </div>
              </div>
            )}

            {/* LISTA DE LIGAS */}
            {competitions.length === 0 ? (
              <div className={`${cardBg} rounded-2xl p-10 text-center text-gray-400 space-y-4`}>
                <Database className="w-12 h-12 text-gray-500 mx-auto" />
                <div>
                  <p className="text-sm font-bold">Nenhuma liga cadastrada</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Crie a sua primeira liga/competição para começar a cadastrar os clubes e formar elencos.</p>
                </div>
                <button 
                  onClick={() => setShowCreateLeague(true)}
                  className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg"
                >
                  Crie uma liga primeiro
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {competitions.map(comp => {
                  const clubCount = teamsList.filter(t => (t as any).leagueId === comp.id || (t.competitions && t.competitions.includes(comp.id))).length;
                  return (
                    <div 
                      key={comp.id}
                      onClick={() => { setSelectedLeagueId(comp.id); setViewMode('league'); }}
                      className={`${cardBg} p-5 rounded-2xl cursor-pointer hover:border-green-500 transition-all group relative`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-600/10 text-green-500 tracking-wider">
                            {comp.id}
                          </span>
                          <h3 className="text-base font-bold mt-1 group-hover:text-green-500 transition-colors">
                            {comp.name}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">{comp.country} · {comp.type === 'league' ? 'Liga' : 'Copa'}</p>
                        </div>
                        <button 
                          onClick={(e) => handleDeleteLeague(comp.id, e)}
                          className={`p-1.5 rounded-lg border border-transparent ${dark ? "hover:border-red-500/20 hover:bg-red-500/10 text-gray-500 hover:text-red-400" : "hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500"} transition-colors`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs border-t pt-3 border-gray-800">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span>{clubCount} Clubes cadastrados</span>
                        </span>
                        <span className="text-green-500 font-semibold group-hover:underline">Visualizar →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CRIAR CLUBE BAR - DESABILITADO SE NÃO HOUVER LIGA (VALOR DE NEGÓCIO IMPORTANTE) */}
            <div className={`${cardBg} p-5 rounded-2xl text-center space-y-3 border`}>
              <h3 className="text-sm font-bold">Novo Clube</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">Para adicionar times, é necessário vinculá-los a uma liga existente.</p>
              
              {competitions.length === 0 ? (
                <div>
                  <button 
                    disabled 
                    className="px-6 py-2 rounded-xl bg-gray-700 text-gray-400 cursor-not-allowed text-xs font-semibold inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Clube
                  </button>
                  <p className="text-[11px] text-red-400 mt-2 font-semibold">Crie uma liga primeiro</p>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setClubForm(prev => ({ ...prev, leagueId: competitions[0]?.id || '' }));
                    setShowCreateClub(true);
                  }}
                  className="px-6 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Criar Clube
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── VIEW 2: CLUB LIST IN SELECTED LEAGUE ─── */}
        {viewMode === 'league' && currentLeague && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-green-500">{currentLeague.country}</span>
                <h2 className="text-xl font-bold">{currentLeague.name}</h2>
                <p className="text-xs text-gray-400">Clubes que disputam esta competição.</p>
              </div>
              <button 
                onClick={() => {
                  setClubForm(prev => ({ ...prev, leagueId: selectedLeagueId }));
                  setShowCreateClub(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Clube nesta Liga
              </button>
            </div>

            {/* FORMULARIO CRIAÇÃO DE CLUBE */}
            {showCreateClub && (
              <div className={`${cardBg} p-5 rounded-2xl space-y-4 border border-green-500/20`}>
                <h3 className="text-sm font-bold border-b pb-2">Novo Clube</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Nome do Time</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Flamengo"
                      className={inputStyle}
                      value={clubForm.name}
                      onChange={e => handleClubNameChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Abreviação</label>
                    <input 
                      type="text" 
                      placeholder="Ex: FLA"
                      maxLength={3}
                      className={inputStyle}
                      value={clubForm.abbreviation}
                      onChange={e => setClubForm(prev => ({ ...prev, abbreviation: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Cidade</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Rio de Janeiro"
                      className={inputStyle}
                      value={clubForm.city}
                      onChange={e => setClubForm(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Liga / Competição (OBRIGATÓRIO)</label>
                    <select 
                      disabled
                      className={inputStyle}
                      value={clubForm.leagueId}
                    >
                      {competitions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Nível de Clube</label>
                    <select 
                      className={inputStyle}
                      value={clubForm.clubLevel}
                      onChange={e => setClubForm(prev => ({ ...prev, clubLevel: Number(e.target.value) as ClubLevel }))}
                    >
                      <option value={1}>1 - Pequeno</option>
                      <option value={2}>2 - Médio</option>
                      <option value={3}>3 - Grande</option>
                      <option value={4}>4 - Elite</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Orçamento Financeiro ($)</label>
                    <input 
                      type="number" 
                      className={inputStyle}
                      value={clubForm.balance}
                      onChange={e => setClubForm(prev => ({ ...prev, balance: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Objetivo da Diretoria</label>
                    <input 
                      type="text" 
                      className={inputStyle}
                      value={clubForm.objective}
                      onChange={e => setClubForm(prev => ({ ...prev, objective: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Cor Principal</label>
                      <input 
                        type="color" 
                        className="w-12 h-9 p-0.5 rounded cursor-pointer border bg-transparent"
                        value={clubForm.primaryColor}
                        onChange={e => setClubForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Cor Secundária</label>
                      <input 
                        type="color" 
                        className="w-12 h-9 p-0.5 rounded cursor-pointer border bg-transparent"
                        value={clubForm.secondaryColor}
                        onChange={e => setClubForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button 
                    onClick={() => setShowCreateClub(false)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border ${dark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-100"}`}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreateClub}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-semibold"
                  >
                    Criar Clube
                  </button>
                </div>
              </div>
            )}

            {/* LISTA DE TIMES DA LIGA */}
            {clubsInSelectedLeague.length === 0 ? (
              <div className={`${cardBg} rounded-2xl p-10 text-center text-gray-400 space-y-4`}>
                <Users className="w-12 h-12 text-gray-500 mx-auto" />
                <div>
                  <p className="text-sm font-bold">Nenhum clube cadastrado</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Essa liga está vazia. Adicione o seu primeiro time para preencher o campeonato.</p>
                </div>
                <button 
                  onClick={() => setShowCreateClub(true)}
                  className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg"
                >
                  Criar Primeiro Clube
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clubsInSelectedLeague.map(club => {
                  const squad = playersRecord[club.id] || [];
                  const colorLeft = (club as any).primaryColor || '#004cff';
                  const colorRight = (club as any).secondaryColor || '#ffffff';
                  return (
                    <div 
                      key={club.id}
                      onClick={() => { setSelectedClubId(club.id); setViewMode('club'); }}
                      className={`${cardBg} p-5 rounded-2xl cursor-pointer hover:border-green-500 transition-all flex justify-between items-start relative group overflow-hidden`}
                    >
                      {/* Left accent strip for club colors */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 flex flex-col">
                        <div className="flex-1" style={{ backgroundColor: colorLeft }} />
                        <div className="flex-1" style={{ backgroundColor: colorRight }} />
                      </div>

                      <div className="pl-3">
                        <h3 className="text-base font-bold group-hover:text-green-500 transition-colors">
                          {club.name} <span className="text-xs text-gray-400">({club.abbreviation})</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">{club.city} · Nível {club.clubLevel}</p>
                        
                        <div className="mt-3 flex gap-3 text-xs">
                          <span>
                            <strong className={dark ? "text-gray-200" : "text-gray-800"}>{squad.length}</strong> jogadores
                          </span>
                          <span>·</span>
                          <span>
                            Orçamento: <strong className={dark ? "text-gray-200" : "text-gray-800"}>${(club.balance / 1000000).toFixed(1)}M</strong>
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => handleDeleteClub(club.id, e)}
                        className={`p-1.5 rounded-lg border border-transparent ${dark ? "hover:border-red-500/20 hover:bg-red-500/10 text-gray-500 hover:text-red-400" : "hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-500"} transition-colors`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── VIEW 3: CLUB DETAILS AND SQUAD (DETALHES DO CLUBE) ─── */}
        {viewMode === 'club' && currentClub && (
          <div className="space-y-6 animate-fade-in">
            {/* VOLTAR BAR */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-semibold text-green-500">{currentLeague?.name}</span>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full inline-block border border-gray-700" style={{ backgroundColor: (currentClub as any).primaryColor }} />
                  {currentClub.name}
                </h2>
                <p className="text-xs text-gray-400">Edite os dados do clube e gerencie o elenco.</p>
              </div>

              <button 
                onClick={(e) => handleDeleteClub(currentClub.id, e)}
                className={`px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-semibold flex items-center gap-1`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Clube
              </button>
            </div>

            {/* ALERTA/WARNING SECTION (VALOR DE NEGÓCIO IMPORTANTE) */}
            {warnings.length > 0 && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span>Avisos Importantes</span>
                </div>
                {warnings.map((w, idx) => (
                  <p key={idx} className="text-xs leading-relaxed flex items-start gap-1">
                    <span>•</span> <span>{w}</span>
                  </p>
                ))}
              </div>
            )}

            {/* FORMULÁRIO DE EDIÇÃO DO CLUBE */}
            <div className={`${cardBg} p-5 rounded-2xl space-y-4`}>
              <h3 className="text-sm font-bold border-b pb-2">Informações do Clube</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1">Nome do Time</label>
                  <input 
                    type="text" 
                    className={inputStyle}
                    value={currentClub.name}
                    onChange={e => handleUpdateClubField('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Abreviação</label>
                  <input 
                    type="text" 
                    maxLength={3}
                    className={inputStyle}
                    value={currentClub.abbreviation}
                    onChange={e => handleUpdateClubField('abbreviation', e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Cidade</label>
                  <input 
                    type="text" 
                    className={inputStyle}
                    value={currentClub.city}
                    onChange={e => handleUpdateClubField('city', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Estádio</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Arena do Dragão"
                    className={inputStyle}
                    value={(currentClub as any).stadiumName || ''}
                    onChange={e => handleUpdateClubField('stadiumName' as any, e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Capacidade do Estádio</label>
                  <input 
                    type="number" 
                    placeholder="Ex: 45000"
                    className={inputStyle}
                    value={(currentClub as any).stadiumCapacity || ''}
                    onChange={e => handleUpdateClubField('stadiumCapacity' as any, Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Liga / Competição</label>
                  <select 
                    className={inputStyle}
                    value={(currentClub as any).leagueId || ''}
                    onChange={e => handleUpdateClubField('leagueId' as any, e.target.value)}
                  >
                    <option value="">Sem liga associada</option>
                    {competitions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Nível de Clube</label>
                  <select 
                    className={inputStyle}
                    value={currentClub.clubLevel}
                    onChange={e => handleUpdateClubField('clubLevel', Number(e.target.value) as ClubLevel)}
                  >
                    <option value={1}>1 - Pequeno</option>
                    <option value={2}>2 - Médio</option>
                    <option value={3}>3 - Grande</option>
                    <option value={4}>4 - Elite</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Objetivo da Diretoria</label>
                  <input 
                    type="text" 
                    className={inputStyle}
                    value={currentClub.objective}
                    onChange={e => handleUpdateClubField('objective', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Orçamento ($)</label>
                  <input 
                    type="number" 
                    className={inputStyle}
                    value={currentClub.balance}
                    onChange={e => handleUpdateClubField('balance', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Faturamento Mensal ($)</label>
                  <input 
                    type="number" 
                    className={inputStyle}
                    value={currentClub.monthlyIncome}
                    onChange={e => handleUpdateClubField('monthlyIncome', Number(e.target.value))}
                  />
                </div>
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Cor Principal</label>
                    <input 
                      type="color" 
                      className="w-12 h-9 p-0.5 rounded cursor-pointer border bg-transparent"
                      value={(currentClub as any).primaryColor || '#ffffff'}
                      onChange={e => handleUpdateClubField('primaryColor', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Cor Secundária</label>
                    <input 
                      type="color" 
                      className="w-12 h-9 p-0.5 rounded cursor-pointer border bg-transparent"
                      value={(currentClub as any).secondaryColor || '#000000'}
                      onChange={e => handleUpdateClubField('secondaryColor', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO JOGADORES DO ELENCO */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold">Elenco do Clube ({filteredSquad.length})</h3>
                  <p className="text-xs text-gray-400">Cadastre e ajuste jogadores para essa equipe.</p>
                </div>
                <button 
                  onClick={handleOpenAddPlayer}
                  className="px-3.5 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold flex items-center gap-2 self-start sm:self-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Jogador
                </button>
              </div>

              {/* BARRA BUSCA E FILTRO */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por nome do jogador..."
                    className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-300 border"}`}
                    value={playerSearch}
                    onChange={e => setPlayerSearch(e.target.value)}
                  />
                </div>
                <select 
                  className={`px-3 py-2 text-xs rounded-xl ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-300 border"}`}
                  value={playerPosFilter}
                  onChange={e => setPlayerPosFilter(e.target.value)}
                >
                  <option value="ALL">Todas as Posições</option>
                  <option value="GK">GK - Goleiro</option>
                  <option value="CB">CB - Zagueiro</option>
                  <option value="LB">LB - Lateral Esquerdo</option>
                  <option value="RB">RB - Lateral Direito</option>
                  <option value="CDM">CDM - Volante</option>
                  <option value="CM">CM - Meia Central</option>
                  <option value="CAM">CAM - Meia Armador</option>
                  <option value="LM">LM - Meia Esquerda</option>
                  <option value="RM">RM - Meia Direita</option>
                  <option value="LW">LW - Ponta Esquerda</option>
                  <option value="RW">RW - Ponta Direita</option>
                  <option value="ST">ST - Centroavante</option>
                </select>
              </div>

              {/* LISTA ELENCO */}
              {filteredSquad.length === 0 ? (
                <div className={`${cardBg} p-8 rounded-2xl text-center text-gray-400`}>
                  <p className="text-sm font-bold">Nenhum jogador encontrado</p>
                  <p className="text-xs text-gray-500 mt-1">Crie um novo atleta no botão acima para compor seu plantel.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredSquad.map(player => (
                    <div 
                      key={player.id}
                      onClick={() => handleOpenEditPlayer(player)}
                      className={`${cardBg} px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-green-500 transition-all cursor-pointer group`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-600/10 text-green-500 font-bold flex items-center justify-center text-xs">
                          {player.position}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold group-hover:text-green-500 transition-colors">
                            {player.name}
                          </h4>
                          <p className="text-[10px] text-gray-400">
                            {player.age} anos · {player.height || 180}cm · {(player as any).nationality || 'Brasileiro'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5">
                        <div className="flex items-center gap-4 text-xs text-center">
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">OVR</p>
                            <span className="font-extrabold text-green-500">{player.overall}</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">POT</p>
                            <span className="font-extrabold text-yellow-500">{player.potential}</span>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold">SALÁRIO</p>
                            <span className="font-bold text-gray-300">
                              {player.salary >= 1000 ? `${(player.salary/1000).toFixed(1)}K` : `${player.salary}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleOpenEditPlayer(player); }}
                            className={`p-1.5 rounded-lg border border-transparent ${dark ? "hover:border-green-500/20 hover:bg-green-500/10 text-gray-400 hover:text-green-500" : "hover:border-green-200 hover:bg-green-50 text-gray-500 hover:text-green-600"} transition-colors`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeletePlayer(player.id); }}
                            className={`p-1.5 rounded-lg border border-transparent ${dark ? "hover:border-red-500/20 hover:bg-red-500/10 text-gray-400 hover:text-red-400" : "hover:border-red-200 hover:bg-red-50 text-gray-500 hover:text-red-500"} transition-colors`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── MODAL: ADD / EDIT PLAYER FORM (FORMULÁRIO DE JOGADOR) ─── */}
      {showPlayerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`${dark ? "bg-gray-900 border border-gray-800 text-white" : "bg-white text-gray-900"} rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl`}>
            
            <div className="px-5 py-4 border-b border-gray-800 bg-gray-950/20 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingPlayer ? `Editar Jogador: ${editingPlayer.name}` : "Adicionar Novo Jogador"}
              </h3>
              <button 
                onClick={() => setShowPlayerModal(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
              {/* Nome */}
              <div>
                <label className="text-xs font-semibold block mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  placeholder="Ex: Neymar Jr"
                  className={inputStyle}
                  value={playerForm.name}
                  onChange={e => setPlayerForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Row: Posicao, Idade, Altura, Nacionalidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold block mb-1">Posição</label>
                  <select 
                    className={inputStyle}
                    value={playerForm.position}
                    onChange={e => handlePlayerFormPosChange(e.target.value)}
                  >
                    <option value="GK">GK - Goleiro</option>
                    <option value="CB">CB - Zagueiro</option>
                    <option value="LB">LB - Lateral Esquerdo</option>
                    <option value="RB">RB - Lateral Direito</option>
                    <option value="CDM">CDM - Volante</option>
                    <option value="CM">CM - Meia Central</option>
                    <option value="CAM">CAM - Meia Armador</option>
                    <option value="LM">LM - Meia Esquerda</option>
                    <option value="RM">RM - Meia Direita</option>
                    <option value="LW">LW - Ponta Esquerda</option>
                    <option value="RW">RW - Ponta Direita</option>
                    <option value="ST">ST - Centroavante</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Idade</label>
                  <input 
                    type="number" 
                    min={15}
                    max={45}
                    className={inputStyle}
                    value={playerForm.age}
                    onChange={e => handlePlayerFormAgeChange(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Altura (cm)</label>
                  <input 
                    type="number" 
                    className={inputStyle}
                    value={playerForm.height}
                    onChange={e => setPlayerForm(prev => ({ ...prev, height: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Nacionalidade</label>
                  <input 
                    type="text" 
                    className={inputStyle}
                    value={playerForm.nationality}
                    onChange={e => setPlayerForm(prev => ({ ...prev, nationality: e.target.value }))}
                  />
                </div>
              </div>

              {/* OVERALL E POTENCIAL CALCULADOS AUTOMATICAMENTE */}
              <div className="p-3.5 rounded-xl bg-green-500/5 border border-green-500/15 flex items-center justify-around text-center">
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Overall Calculado</span>
                  <span className="text-2xl font-black text-green-500">{playerForm.overall}</span>
                </div>
                <div className="w-px h-8 bg-gray-800" />
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Potencial Previsto</span>
                  <span className="text-2xl font-black text-yellow-500">{playerForm.potential}</span>
                </div>
                <div className="w-px h-8 bg-gray-800" />
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Salário Sugerido</span>
                  <button 
                    onClick={() => {
                      const suggest = suggestSalary(playerForm.overall, currentClub?.clubLevel || 3);
                      setPlayerForm(prev => ({ ...prev, salary: suggest }));
                    }}
                    className="text-xs text-green-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    ${playerForm.salary >= 1000 ? `${(playerForm.salary/1000).toFixed(0)}K` : playerForm.salary} (Sugerir)
                  </button>
                </div>
              </div>

              {/* 6 SLIDERS DE ATRIBUTOS (1-99) */}
              <div className="space-y-3.5 pt-2">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Atributos de Habilidade</h4>
                
                {/* PACE */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Ritmo / Velocidade (PAC)</span>
                    <span className="text-green-500">{playerForm.pace}</span>
                  </div>
                  <input 
                    type="range" min="1" max="99" 
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    value={playerForm.pace}
                    onChange={e => handlePlayerFormAttrChange('pace', Number(e.target.value))}
                  />
                </div>

                {/* SHOOTING */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Chute / Finalização (SHO)</span>
                    <span className="text-green-500">{playerForm.shooting}</span>
                  </div>
                  <input 
                    type="range" min="1" max="99" 
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    value={playerForm.shooting}
                    onChange={e => handlePlayerFormAttrChange('shooting', Number(e.target.value))}
                  />
                </div>

                {/* PASSING */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Passe / Visão (PAS)</span>
                    <span className="text-green-500">{playerForm.passing}</span>
                  </div>
                  <input 
                    type="range" min="1" max="99" 
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    value={playerForm.passing}
                    onChange={e => handlePlayerFormAttrChange('passing', Number(e.target.value))}
                  />
                </div>

                {/* DRIBBLING */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Drible / Agilidade (DRI)</span>
                    <span className="text-green-500">{playerForm.dribbling}</span>
                  </div>
                  <input 
                    type="range" min="1" max="99" 
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    value={playerForm.dribbling}
                    onChange={e => handlePlayerFormAttrChange('dribbling', Number(e.target.value))}
                  />
                </div>

                {/* DEFENSE */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Defesa / Marcação (DEF)</span>
                    <span className="text-green-500">{playerForm.defense}</span>
                  </div>
                  <input 
                    type="range" min="1" max="99" 
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    value={playerForm.defense}
                    onChange={e => handlePlayerFormAttrChange('defense', Number(e.target.value))}
                  />
                </div>

                {/* PHYSICAL */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Físico / Força (PHY)</span>
                    <span className="text-green-500">{playerForm.physical}</span>
                  </div>
                  <input 
                    type="range" min="1" max="99" 
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                    value={playerForm.physical}
                    onChange={e => handlePlayerFormAttrChange('physical', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Status, Personalidade, Contrato, Salário */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold block mb-1">Status no Elenco</label>
                  <select 
                    className={inputStyle}
                    value={playerForm.status}
                    onChange={e => setPlayerForm(prev => ({ ...prev, status: e.target.value as PlayerStatus }))}
                  >
                    <option value="star">Estrela (Star)</option>
                    <option value="starter">Titular (Starter)</option>
                    <option value="rotation">Rotação (Rotation)</option>
                    <option value="reserve">Reserva (Reserve)</option>
                    <option value="prospect">Promessa (Prospect)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Personalidade</label>
                  <select 
                    className={inputStyle}
                    value={playerForm.personality}
                    onChange={e => setPlayerForm(prev => ({ ...prev, personality: e.target.value as PlayerPersonality }))}
                  >
                    <option value="leader">Líder (Leader)</option>
                    <option value="professional">Profissional</option>
                    <option value="temperamental">Temperamental</option>
                    <option value="quiet">Calmo (Quiet)</option>
                    <option value="ambitious">Ambicioso</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Anos de Contrato (1-5)</label>
                  <select 
                    className={inputStyle}
                    value={playerForm.contractYears}
                    onChange={e => setPlayerForm(prev => ({ ...prev, contractYears: Number(e.target.value) }))}
                  >
                    <option value={1}>1 Ano</option>
                    <option value={2}>2 Anos</option>
                    <option value={3}>3 Anos</option>
                    <option value={4}>4 Anos</option>
                    <option value={5}>5 Anos</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">Salário ($)</label>
                  <input 
                    type="number" 
                    className={inputStyle}
                    value={playerForm.salary}
                    onChange={e => setPlayerForm(prev => ({ ...prev, salary: Number(e.target.value) }))}
                  />
                </div>
              </div>

            </div>

            <div className="px-5 py-4 border-t border-gray-800 bg-gray-950/20 flex justify-end gap-2">
              <button 
                onClick={() => setShowPlayerModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${dark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-100"}`}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSavePlayer}
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold"
              >
                Salvar Jogador
              </button>
            </div>

          </div>
        </div>
      )}

      {toast && (
        <div id="import-toast" className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-bounce ${
          toast.type === 'success' 
            ? 'bg-green-500/10 border-green-500/30 text-green-500' 
            : 'bg-red-500/10 border-red-500/30 text-red-500'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
