import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { teams as defaultTeams, Team, Player, LEAGUES, loadActivePatchToMemory } from "@/lib/teams";
import { TeamLogo } from "@/components/TeamLogo";
import { 
  PatchData, PatchMeta, PatchCompetition, PatchTeam, PatchPlayer,
  importPatch, exportPatch, downloadBlob,
  savePatchToStorage, listInstalledPatches, getActivePatch,
  setActivePatch, deletePatch, getDefaultBrasilPatch,
} from "@/lib/patchSystem";
import localforage from "localforage";

type Section = "patches" | "competitions" | "clubs" | "players";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtMoney(v: number) { return v >= 1000 ? `${(v/1000).toFixed(1)}M` : `${v}K`; }

// ─── COMPONENTE ──────────────────────────────────────────────────────────────

export default function Editor() {
  const { isDarkMode } = useDarkMode();
  const [, navigate] = useLocation();
  const dark = isDarkMode;

  const [section, setSection] = useState<Section>("patches");
  const [search, setSearch] = useState("");
  const [localTeams, setLocalTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(0);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [installedPatches, setInstalledPatches] = useState<PatchData[]>([]);
  const [activePatch, setActivePatchState] = useState<PatchData | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportingPatch, setExportingPatch] = useState<PatchData | null>(null);
  const [showNewComp, setShowNewComp] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [newComp, setNewComp] = useState<Partial<PatchCompetition>>({
    type: 'league', legs: 2, matchDays: ['tuesday','wednesday','sunday'], startMonth: 1
  });
  const [showNewClub, setShowNewClub] = useState(false);
  const [editingClubId, setEditingClubId] = useState<number | null>(null);
  const [newClub, setNewClub] = useState<Partial<Team>>({
    clubLevel: 3, balance: 20000000, monthlyIncome: 2000000, objective: 'Manter-se', players: []
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [localPlayers, setLocalPlayers] = useState<Record<number, Player[]>>({});
  const [localCompetitions, setLocalCompetitions] = useState<PatchCompetition[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const patches = await listInstalledPatches();
        setInstalledPatches(patches);

        const ap = await getActivePatch();
        setActivePatchState(ap);

        try {
          let comps: PatchCompetition[] = [];
          const draftComp = await localforage.getItem('editor_local_competitions');
          if (draftComp) {
            const parsed = typeof draftComp === 'string' ? JSON.parse(draftComp) : draftComp;
            comps = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
          } else if (ap && Array.isArray(ap.competitions)) {
             comps = ap.competitions.filter(Boolean);
          }
          setLocalCompetitions(comps);
        } catch {}

        let tms: Team[] = [];
        try {
          const draftTeams = await localforage.getItem('editor_local_teams');
          if (draftTeams) {
            tms = typeof draftTeams === 'string' ? JSON.parse(draftTeams) : draftTeams as any;
          } else if (ap && Array.isArray(ap.teams)) {
            tms = ap.teams.map(t => {
              const teamPlayers = ap.players.filter(p => p.teamId === t.id);
              return {
                id: t.id,
                name: t.name,
                abbreviation: t.abbreviation,
                city: t.city,
                clubLevel: t.clubLevel || 3,
                balance: t.balance || 20000000,
                monthlyIncome: t.monthlyIncome || 2000000,
                objective: t.objective || 'Manter-se',
                leagueId: (t as any).leagueId || (t.competitions && t.competitions[0]) || '',
                players: teamPlayers as any[]
              } as Team;
            });
          } else {
            tms = [];
          }
        } catch {
          tms = [];
        }
        setLocalTeams(tms);
        if (tms.length > 0) {
          setSelectedTeamId(tms[0].id);
        }

        try {
          const draftPlayers = await localforage.getItem('editor_local_players');
          if (draftPlayers) {
            setLocalPlayers(typeof draftPlayers === 'string' ? JSON.parse(draftPlayers) : draftPlayers as any);
          } else if (ap) {
            const map: Record<number, Player[]> = {};
            ap.players.forEach(p => {
              if (!map[p.teamId]) map[p.teamId] = [];
              map[p.teamId].push(p as any);
            });
            setLocalPlayers(map);
          }
        } catch {}
      } finally {
        setInitialized(true);
      }
    }
    init();
  }, []);

  const saveState = async (comps: PatchCompetition[], players: Record<number, Player[]>, teamsList: Team[]) => {
    if (!initialized) return;
    await localforage.setItem('editor_local_competitions', comps);
    await localforage.setItem('editor_local_players', players);
    await localforage.setItem('editor_local_teams', teamsList);
  };

  useEffect(() => {
    saveState(localCompetitions, localPlayers, localTeams);
  }, [localCompetitions, localPlayers, localTeams, initialized]);

  const loadPatchIntoEditor = async (ap: PatchData | null) => {
    setActivePatchState(ap);
    
    // Competitions
    let comps: PatchCompetition[] = [];
    if (ap && Array.isArray(ap.competitions)) {
      comps = ap.competitions.filter(Boolean);
    }
    setLocalCompetitions(comps);

    // Teams
    let tms: Team[] = [];
    if (ap && Array.isArray(ap.teams)) {
      tms = ap.teams.map(t => {
        const teamPlayers = ap.players.filter(p => p.teamId === t.id);
        return {
          id: t.id,
          name: t.name,
          abbreviation: t.abbreviation,
          city: t.city,
          clubLevel: t.clubLevel || 3,
          balance: t.balance || 20000000,
          monthlyIncome: t.monthlyIncome || 2000000,
          objective: t.objective || 'Manter-se',
          leagueId: (t as any).leagueId || (t.competitions && t.competitions[0]) || '',
          players: teamPlayers as any[]
        } as Team;
      });
    }
    setLocalTeams(tms);
    if (tms.length > 0) {
      setSelectedTeamId(tms[0].id);
    } else {
      setSelectedTeamId(0);
    }

    // Players
    const map: Record<number, Player[]> = {};
    if (ap && Array.isArray(ap.players)) {
      ap.players.forEach(p => {
        if (!map[p.teamId]) map[p.teamId] = [];
        map[p.teamId].push(p as any);
      });
    }
    setLocalPlayers(map);

    // Save to localforage immediately so they don't get overwritten
    await localforage.setItem('editor_local_competitions', comps);
    await localforage.setItem('editor_local_teams', tms);
    await localforage.setItem('editor_local_players', map);

    await loadActivePatchToMemory();
  };



  const fileRef = useRef<HTMLInputElement>(null);

  const bg    = dark ? "bg-gray-950" : "bg-gray-50";
  const card  = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const tx    = dark ? "text-white"  : "text-gray-900";
  const sub   = dark ? "text-gray-400" : "text-gray-500";
  const inp   = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                     : "bg-white border-gray-300 text-gray-900 placeholder-gray-400";
  const divider = dark ? "border-gray-800" : "border-gray-200";

  const currentTeam = localTeams.find(t => t?.id === selectedTeamId) ?? localTeams[0];
  const teamPlayers = currentTeam ? (localPlayers[selectedTeamId] ?? currentTeam.players ?? []) : [];

  const filteredPlayers = teamPlayers.filter(p =>
    p?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p?.position?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTeams = localTeams.filter(t =>
    t?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t?.city?.toLowerCase().includes(search.toLowerCase()) ||
    t?.abbreviation?.toLowerCase().includes(search.toLowerCase())
  );

  // ── IMPORTAR PATCH ────────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const patch = await importPatch(file);
      await savePatchToStorage(patch);
      setInstalledPatches(await listInstalledPatches());
      alert(`Patch "${patch.meta.name}" importado com sucesso!`);
    } catch (err: any) {
      setImportError(err.message ?? 'Erro ao importar patch.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ── EXPORTAR PATCH ────────────────────────────────────────────────────────
  async function handleExport(patch: PatchData) {
    try {
      const blob = await exportPatch(patch);
      const filename = `${patch.meta.name.replace(/\s+/g,'_').toLowerCase()}_v${patch.meta.version}.emp`;
      downloadBlob(blob, filename);
    } catch (err: any) {
      alert('Erro ao exportar: ' + err.message);
    }
  }

  // ── SALVAR E ATIVAR PATCH DO JOGO ATUAL ───────────────────────────────────
  async function handleSaveAndActivate() {
    const patch: PatchData = {
      meta: {
        name: activePatch?.meta.name || 'Edições do Editor',
        version: activePatch?.meta.version || '1.0',
        author: activePatch?.meta.author || 'Usuário',
        season: activePatch?.meta.season || 2026,
        country: activePatch?.meta.country || 'Brasil',
        description: activePatch?.meta.description || 'Alterações diretas feitas no Editor.',
        createdAt: activePatch?.meta.createdAt || new Date().toISOString(),
      },
      competitions: localCompetitions,
      teams: localTeams.map(t => ({
        id: Number(t.id), name: t.name, abbreviation: t.abbreviation,
        city: t.city, country: 'Brasil',
        clubLevel: t.clubLevel, balance: t.balance,
        monthlyIncome: t.monthlyIncome, objective: t.objective,
        primaryColor: '#ffffff', secondaryColor: '#000000',
        competitions: (t as any).competitions || ((t as any).leagueId ? [(t as any).leagueId] : []),
        logoUrl: (t as any).logoUrl,
      })),
      players: localTeams.flatMap(t =>
        (localPlayers[t.id] ?? t.players ?? []).map(p => ({
          id: p.id, teamId: Number(t.id), name: p.name, position: p.position,
          age: p.age, height: p.height, overall: p.overall, potential: p.potential,
          pace: p.pace, shooting: p.shooting, passing: p.passing,
          dribbling: p.dribbling, defense: p.defense, physical: p.physical,
          salary: p.salary, contractYears: p.contractYears, nationality: 'Brasileiro',
        }))
      ),
    };
    // Save to editor draft
    await saveState(localCompetitions, localPlayers, localTeams);
    
    if (activePatch) {
      await setActivePatch(patch);
      setActivePatchState(patch);
    } else {
      await setActivePatch(null);
      setActivePatchState(null);
    }
    await loadActivePatchToMemory();
    alert("Alterações salvas e ativadas com sucesso!");
  }

  // ── CRIAR PATCH DO JOGO ATUAL ─────────────────────────────────────────────
  async function handleExportCurrentData() {
    const patch: PatchData = {
      meta: {
        name: 'Meu Patch',
        version: '1.0',
        author: 'Usuário',
        season: 2026,
        country: 'Brasil',
        description: 'Patch criado a partir dos dados atuais do jogo.',
        createdAt: new Date().toISOString(),
      },
      competitions: localCompetitions,
      teams: localTeams.map(t => ({
        id: Number(t.id), name: t.name, abbreviation: t.abbreviation,
        city: t.city, country: 'Brasil',
        clubLevel: t.clubLevel, balance: t.balance,
        monthlyIncome: t.monthlyIncome, objective: t.objective,
        primaryColor: '#ffffff', secondaryColor: '#000000',
        competitions: (t as any).competitions || ((t as any).leagueId ? [(t as any).leagueId] : []),
        logoUrl: (t as any).logoUrl,
      })),
      players: localTeams.flatMap(t =>
        (localPlayers[t.id] ?? t.players ?? []).map(p => ({
          id: p.id, teamId: Number(t.id), name: p.name, position: p.position,
          age: p.age, height: p.height, overall: p.overall, potential: p.potential,
          pace: p.pace, shooting: p.shooting, passing: p.passing,
          dribbling: p.dribbling, defense: p.defense, physical: p.physical,
          salary: p.salary, contractYears: p.contractYears, nationality: 'Brasileiro',
        }))
      ),
    };
    await handleExport(patch);
  }

  // ── ATUALIZAR JOGADOR ────────────────────────────────────────────────────
  function savePlayerEdit(updated: Player) {
    setLocalPlayers(prev => {
      const currentList = prev[selectedTeamId] ?? currentTeam?.players ?? [];
      const exists = currentList.some(p => p.id === updated.id);
      const newList = exists 
        ? currentList.map(p => p.id === updated.id ? updated : p)
        : [...currentList, updated];
      return {
        ...prev,
        [selectedTeamId]: newList,
      };
    });
    setEditingPlayer(null);
  }

  // ── ATUALIZAR/CRIAR CLUBE ───────────────────────────────────────────────
  function handleSaveClub() {
    if (!newClub.name || !newClub.abbreviation || !newClub.city) {
      alert("Preencha os campos obrigatórios (Nome, Sigla e Cidade).");
      return;
    }
    const c: Team = {
      id: editingClubId || Date.now(),
      name: newClub.name,
      abbreviation: newClub.abbreviation.toUpperCase(),
      city: newClub.city,
      clubLevel: newClub.clubLevel || 3,
      balance: newClub.balance || 20000000,
      monthlyIncome: newClub.monthlyIncome || 2000000,
      objective: newClub.objective || 'Manter-se',
      players: newClub.players || [],
    };
    if ((newClub as any).leagueId) {
      (c as any).leagueId = (newClub as any).leagueId;
    }

    if (editingClubId) {
      setLocalTeams(prev => prev.map(club => club.id === editingClubId ? { ...club, ...c } : club));
    } else {
      setLocalTeams(prev => {
        const nextList = [...prev, c];
        if (selectedTeamId === 0) {
          setSelectedTeamId(c.id);
        }
        return nextList;
      });
    }
    setShowNewClub(false);
    setEditingClubId(null);
    setNewClub({ clubLevel: 3, balance: 20000000, monthlyIncome: 2000000, objective: 'Manter-se', players: [] });
  }

  function handleEditClub(club: Team) {
    setEditingClubId(club.id);
    setNewClub(club);
    setShowNewClub(true);
  }

  function handleDeleteClub(clubId: number) {
    if (confirm("Tem certeza que deseja excluir este clube e todos os seus jogadores?")) {
      setLocalTeams(prev => {
        const remaining = prev.filter(c => c.id !== clubId);
        if (selectedTeamId === clubId) {
          setSelectedTeamId(remaining[0]?.id || 0);
        }
        return remaining;
      });
      setLocalPlayers(prev => {
        const copy = { ...prev };
        delete copy[clubId];
        return copy;
      });
    }
  }

  function handleSaveCompetition() {
    if (!newComp.name || !newComp.shortName || !newComp.teamCount) {
      alert("Preencha os campos obrigatórios (nome, sigla e número de vezes).");
      return;
    }
    const c: PatchCompetition = {
      id: editingCompId || `custom_${Date.now()}`,
      name: newComp.name,
      shortName: newComp.shortName,
      type: newComp.type as any,
      country: newComp.country || '',
      teamCount: newComp.teamCount,
      rounds: newComp.rounds,
      groupSize: newComp.groupSize,
      legs: newComp.legs as 1|2,
      matchDays: newComp.matchDays || ['tuesday','wednesday','sunday'],
      startMonth: newComp.startMonth || 1,
      qualified: newComp.qualified,
      relegated: newComp.relegated,
    };
    if (editingCompId) {
      setLocalCompetitions(prev => prev.map(comp => comp.id === editingCompId ? c : comp));
    } else {
      setLocalCompetitions(prev => [...prev, c]);
    }
    setShowNewComp(false);
    setEditingCompId(null);
    setNewComp({ type: 'league', legs: 2, matchDays: ['tuesday','wednesday','sunday'], startMonth: 1 });
  }

  function handleEditComp(comp: PatchCompetition) {
    setEditingCompId(comp.id);
    setNewComp(comp);
    setShowNewComp(true);
  }

  function handleDeleteComp(compId: string) {
    setLocalCompetitions(prev => prev.filter(c => c.id !== compId));
  }

  const POSITIONS = ["GK","CB","LB","RB","CDM","CM","CAM","LM","RM","LW","RW","ST"];

  return (
    <div className={`min-h-screen flex flex-col ${bg}`}>

      {/* INPUT OCULTO */}
      <input ref={fileRef} type="file" accept=".emp,.zip,.json" className="hidden" onChange={handleImport}/>

      {/* MODAL EDIÇÃO DE JOGADOR */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">
          <div className={`w-full max-w-lg rounded-t-2xl border-t border-x p-5 overflow-y-auto max-h-[90vh] ${card}`}>
            <div className="flex justify-between items-center mb-4">
              <p className={`text-base font-bold ${tx}`}>Editar: {editingPlayer.name || "Novo Jogador"}</p>
              <div className="flex gap-2">
                <button onClick={() => savePlayerEdit(editingPlayer)}
                  className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg">Salvar</button>
                <button onClick={() => {
                  if (confirm("Tem certeza que deseja excluir este jogador?")) {
                    setLocalPlayers(prev => {
                      const currentList = prev[selectedTeamId] ?? currentTeam?.players ?? [];
                      const newList = currentList.filter(p => p.id !== editingPlayer.id);
                      return {
                        ...prev,
                        [selectedTeamId]: newList,
                      };
                    });
                    setEditingPlayer(null);
                  }
                }} className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg">Excluir</button>
                <button onClick={() => setEditingPlayer(null)}
                  className={`px-3 py-2 text-xs rounded-lg border ${dark?"border-gray-700 text-gray-400":"border-gray-300 text-gray-500"}`}>✕</button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Nome */}
              <div>
                <p className={`text-xs ${sub} mb-1`}>Nome</p>
                <input value={editingPlayer.name}
                  onChange={e=>setEditingPlayer({...editingPlayer,name:e.target.value})}
                  className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
              </div>

              {/* Posição + Idade */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className={`text-xs ${sub} mb-1`}>Posição</p>
                  <select value={editingPlayer.position}
                    onChange={e=>setEditingPlayer({...editingPlayer,position:e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}>
                    {POSITIONS.map(pos=><option key={pos}>{pos}</option>)}
                  </select>
                </div>
                <div>
                  <p className={`text-xs ${sub} mb-1`}>Idade</p>
                  <input type="number" min={15} max={45} value={editingPlayer.age}
                    onChange={e=>setEditingPlayer({...editingPlayer,age:Number(e.target.value)})}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                </div>
              </div>

              {/* OVR + Potencial */}
              {[
                {label:"OVR",key:"overall"},{label:"Potencial",key:"potential"},
                {label:"Velocidade",key:"pace"},{label:"Finalização",key:"shooting"},
                {label:"Passe",key:"passing"},{label:"Drible",key:"dribbling"},
                {label:"Defesa",key:"defense"},{label:"Físico",key:"physical"},
              ].map(({label,key})=>(
                <div key={key}>
                  <div className="flex justify-between mb-0.5">
                    <p className={`text-xs ${sub}`}>{label}</p>
                    <p className={`text-xs font-bold ${tx}`}>{(editingPlayer as any)[key]}</p>
                  </div>
                  <input type="range" min={1} max={99}
                    value={(editingPlayer as any)[key]}
                    onChange={e=>setEditingPlayer({...editingPlayer,[key]:Number(e.target.value)})}
                    className="w-full h-1.5 rounded accent-green-500"/>
                </div>
              ))}

              {/* Salário + Contrato */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className={`text-xs ${sub} mb-1`}>Salário (K/mês)</p>
                  <input type="number" min={1} value={editingPlayer.salary}
                    onChange={e=>setEditingPlayer({...editingPlayer,salary:Number(e.target.value)})}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                </div>
                <div>
                  <p className={`text-xs ${sub} mb-1`}>Contrato (anos)</p>
                  <select value={editingPlayer.contractYears}
                    onChange={e=>setEditingPlayer({...editingPlayer,contractYears:Number(e.target.value)})}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}>
                    {[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className={`sticky top-0 z-40 ${dark?"bg-gray-950 border-gray-800":"bg-white border-gray-200"} border-b px-4 py-4 flex items-center justify-between`}>
        <button onClick={()=>navigate("/")} className={`text-sm font-medium ${sub}`}>← Voltar</button>
        <h1 className={`text-base font-bold ${tx}`}>Editor</h1>
        <div className="flex gap-2">
          <button onClick={handleSaveAndActivate}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold bg-green-600 text-white`}>
            Salvar e Ativar
          </button>
          <button onClick={handleExportCurrentData}
            className={`text-xs px-3 py-1.5 rounded-lg border ${dark?"border-gray-700 text-gray-300":"border-gray-300 text-gray-600"}`}>
            Exportar .emp
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className={`flex border-b ${divider} ${dark?"bg-gray-950":"bg-white"}`}>
        {([
          {key:"patches",     label:"📦 Patches"},
          {key:"competitions",label:"🏆 Competições"},
          {key:"clubs",       label:"🏟️ Clubes"},
          {key:"players",     label:"👤 Jogadores"},
        ] as {key:Section;label:string}[]).map(tab=>(
          <button key={tab.key} onClick={()=>{setSection(tab.key);setSearch("");}}
            className={`flex-1 py-3 text-xs font-semibold whitespace-nowrap px-1 ${
              section===tab.key
                ? dark?"border-b-2 border-white text-white":"border-b-2 border-gray-900 text-gray-900"
                : sub
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-10 max-w-lg mx-auto w-full px-4 pt-4">

        {/* ── PATCHES ─────────────────────────────────────────────────── */}
        {section==="patches" && (
          <div className="space-y-4">
            <h2 className={`text-sm font-bold ${tx}`}>Gerenciar Patches</h2>

            {/* Info */}
            <div className={`rounded-xl border p-4 ${card}`}>
              <p className={`text-xs font-bold ${tx} mb-1`}>O que é um patch .emp?</p>
              <p className={`text-xs ${sub}`}>
                Um arquivo <span className="font-mono font-bold">.emp</span> (Elite Manager Patch) contém dados
                de competições, clubes e jogadores. Permite adicionar ligas reais ao jogo sem alterar o código.
                Crie, compartilhe e aplique patches da comunidade.
              </p>
            </div>

            {/* Importar */}
            <div className={`rounded-xl border p-4 ${card}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${sub} mb-3`}>Importar patch</p>
              {importError && (
                <div className="rounded-lg bg-red-900/30 border border-red-700 px-3 py-2 mb-3">
                  <p className="text-xs text-red-400">{importError}</p>
                </div>
              )}
              <button onClick={()=>fileRef.current?.click()}
                disabled={importing}
                className={`w-full py-3 rounded-xl text-sm font-bold border-2 border-dashed ${
                  dark?"border-gray-600 text-gray-400":"border-gray-300 text-gray-500"
                }`}>
                {importing ? "Importando..." : "📂 Selecionar arquivo .emp"}
              </button>
            </div>

            {/* Patch ativo */}
            {activePatch && (
              <div className={`rounded-xl border p-4 ${dark?"border-green-800 bg-green-900/20":"border-green-300 bg-green-50"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide ${dark?"text-green-400":"text-green-700"} mb-1`}>✅ Patch ativo</p>
                    <p className={`text-sm font-bold ${tx}`}>{activePatch.meta.name}</p>
                    <p className={`text-xs ${sub}`}>v{activePatch.meta.version} · {activePatch.meta.author} · {activePatch.meta.season}</p>
                    <p className={`text-xs ${sub} mt-0.5`}>{activePatch.meta.description}</p>
                  </div>
                  <button onClick={async ()=>{await setActivePatch(null);setActivePatchState(null);await loadActivePatchToMemory();}}
                    className="text-xs text-red-400 ml-2">Remover</button>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-center">
                  <div><p className={`font-bold ${tx}`}>{activePatch.teams.length}</p><p className={sub}>Clubes</p></div>
                  <div><p className={`font-bold ${tx}`}>{activePatch.players.length}</p><p className={sub}>Jogadores</p></div>
                  <div><p className={`font-bold ${tx}`}>{activePatch.competitions.length}</p><p className={sub}>Competições</p></div>
                </div>
              </div>
            )}

            {/* Patches instalados */}
            <div className={`rounded-xl border ${card}`}>
              <div className={`px-4 py-2.5 border-b ${divider}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${sub}`}>
                  Patches instalados ({installedPatches.length})
                </p>
              </div>
              {installedPatches.length === 0 ? (
                <p className={`px-4 py-3 text-xs ${sub}`}>Nenhum patch instalado.</p>
              ) : (
                installedPatches.map(patch => (
                  <div key={patch.meta.name} className={`px-4 py-3 border-b ${divider} last:border-0`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-sm font-bold ${tx}`}>{patch.meta.name}</p>
                        <p className={`text-xs ${sub}`}>v{patch.meta.version} · {patch.meta.country} · {patch.meta.season}</p>
                        <div className="flex gap-3 mt-1 text-xs">
                          <span className={sub}>{patch.teams.length} clubes</span>
                          <span className={sub}>{patch.players.length} jogadores</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 ml-2 flex-shrink-0">
                        <button onClick={async ()=>{await setActivePatch(patch);await loadPatchIntoEditor(patch);}}
                          className={`text-xs px-3 py-1 rounded-lg ${activePatch?.meta.name===patch.meta.name?"bg-green-600 text-white":dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>
                          {activePatch?.meta.name===patch.meta.name?"✓ Ativo":"Ativar"}
                        </button>
                        <button onClick={()=>handleExport(patch)}
                          className={`text-xs px-3 py-1 rounded-lg ${dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>
                          Exportar
                        </button>
                        <button onClick={async ()=>{
                          await deletePatch(patch.meta.name);
                          setInstalledPatches(await listInstalledPatches());
                          const currentActive = await getActivePatch();
                          if (!currentActive) {
                            setActivePatchState(null);
                            await loadActivePatchToMemory();
                          }
                        }}
                          className="text-xs text-red-400">Apagar</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Criar patch do zero */}
            <button onClick={handleExportCurrentData}
              className={`w-full py-3 rounded-xl text-sm font-bold border ${dark?"border-gray-600 text-gray-300":"border-gray-300 text-gray-600"}`}>
              📦 Exportar dados atuais como .emp
            </button>

            {/* Configurações Avançadas de Database */}
            <div className={`rounded-xl border p-4 ${card} border-red-500/20 space-y-3`}>
              <p className={`text-xs font-bold text-red-500 uppercase tracking-wide mb-1`}>⚠️ Configurações Avançadas</p>
              <p className={`text-xs ${sub}`}>
                Apague todos os dados existentes para criar um banco de dados totalmente em branco do zero. Ou restaure os times e competições originais de fábrica.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                {showClearConfirm ? (
                  <div className="p-3 border border-red-500/50 rounded-xl bg-red-950/20 text-center space-y-3">
                     <p className="text-xs text-red-500 font-bold px-2 leading-relaxed">
                       Tem certeza absoluta que deseja EXCLUIR TODOS OS TIMES, jogadores e competições existentes do jogo? Esta ação é irreversível!
                     </p>
                     <div className="flex gap-2">
                       <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-2 text-xs font-bold text-gray-400 bg-gray-500/10 rounded-lg outline-none hover:bg-gray-500/20 transition-colors">Cancelar</button>
                       <button onClick={async () => {
                          await localforage.removeItem('editor_local_competitions');
                          await localforage.removeItem('editor_local_players');
                          await localforage.removeItem('editor_local_teams');
                          await setActivePatch(null);
                          setActivePatchState(null);
                          setLocalCompetitions([]);
                          setLocalPlayers({});
                          setLocalTeams([]);
                          setSelectedTeamId(0);
                          setShowClearConfirm(false);
                          alert("Todos os times e competições foram excluídos! Você pode começar a criar sua liga do zero.");
                       }} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg outline-none cursor-pointer transition-colors">Confirmar Exclusão</button>
                     </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full py-3 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors">
                    🗑️ Excluir Todos os Times (Criar do Zero)
                  </button>
                )}


              </div>
            </div>
          </div>
        )}

        {/* ── COMPETIÇÕES ─────────────────────────────────────────────── */}
        {section==="competitions" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-bold ${tx}`}>Competições</h2>
              <button onClick={()=>{
                setEditingCompId(null);
                setNewComp({type:'league',legs:2,matchDays:['tuesday','wednesday','sunday'], startMonth: 1});
                setShowNewComp(s=>!s);
              }}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg">
                + Nova
              </button>
            </div>

            {showNewComp && (
              <div className={`rounded-xl border p-4 mb-4 ${card}`}>
                <p className={`text-xs font-bold ${tx} mb-3`}>{editingCompId ? 'Editar competição' : 'Nova competição'}</p>
                <div className="space-y-2">
                  <input placeholder="Nome (ex: Brasileirão Série A)"
                    value={newComp.name??""} onChange={e=>setNewComp({...newComp,name:e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                  <input placeholder="Sigla (ex: Brasileirão)"
                    value={newComp.shortName??""} onChange={e=>setNewComp({...newComp,shortName:e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newComp.type} onChange={e=>setNewComp({...newComp,type:e.target.value as any})}
                      className={`px-3 py-2 rounded-lg border text-sm ${inp}`}>
                      <option value="league">Liga (pontos corridos)</option>
                      <option value="knockout">Copa (mata-mata)</option>
                      <option value="groups_knockout">Grupos + Mata-mata</option>
                    </select>
                    <input placeholder="Nº de times" type="number"
                      value={newComp.teamCount??""} onChange={e=>setNewComp({...newComp,teamCount:Number(e.target.value)})}
                      className={`px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                  </div>
                  {newComp.type==="league"&&(
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      <input placeholder="Rodadas" type="number"
                        value={newComp.rounds??""} onChange={e=>setNewComp({...newComp,rounds:Number(e.target.value)})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                      <input placeholder="Rebaixados" type="number"
                        value={newComp.relegated?.bottom??""} onChange={e=>setNewComp({...newComp,relegated:{bottom:Number(e.target.value)}})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                      <input placeholder="Classificados" type="number"
                        value={newComp.qualified?.top??""} onChange={e=>setNewComp({...newComp,qualified:{top:Number(e.target.value),into:newComp.qualified?.into||''}})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                      <input placeholder="Classif. para"
                        value={newComp.qualified?.into??""} onChange={e=>setNewComp({...newComp,qualified:{top:newComp.qualified?.top||0,into:e.target.value}})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                    </div>
                  )}
                  {newComp.type==="groups_knockout"&&(
                    <input placeholder="Tamanho do grupo (ex: 4)" type="number"
                      value={newComp.groupSize??""} onChange={e=>setNewComp({...newComp,groupSize:Number(e.target.value)})}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <select value={newComp.startMonth||1} onChange={e=>setNewComp({...newComp,startMonth:Number(e.target.value)})}
                      className={`px-3 py-2 rounded-lg border text-sm ${inp}`}>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=><option key={m} value={m}>Mês de início: {m}</option>)}
                    </select>
                    <input placeholder="País" value={newComp.country??""}
                      onChange={e=>setNewComp({...newComp,country:e.target.value})}
                      className={`px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className={`text-xs ${sub} mb-1`}>Jogo de volta</p>
                      <div className="flex gap-2">
                        {[1,2].map(n=>(
                          <button key={n} onClick={()=>setNewComp({...newComp,legs:n as 1|2})}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${newComp.legs===n?(dark?"bg-white text-black":"bg-gray-900 text-white"):dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>
                            {n===1?"Não":"Sim"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-bold mt-2"
                    onClick={handleSaveCompetition}>
                    {editingCompId ? 'Salvar competição' : 'Adicionar competição'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de competições do patch */}
            <div className={`rounded-xl border ${card}`}>
              {localCompetitions.map((comp,i)=>(
                <div key={comp.id} className={`px-4 py-3 border-b ${divider} last:border-0`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-bold ${tx}`}>{comp.name}</p>
                      <p className={`text-xs ${sub}`}>
                        {comp.type==="league"?"Liga":comp.type==="knockout"?"Copa":"Grupos+Mata-mata"} ·
                        {comp.teamCount} times · {comp.legs===2?"Ida e volta":"Jogo único"}
                      </p>
                      <p className={`text-xs ${sub}`}>
                        Dias: {comp.matchDays.map(d=>d==="tuesday"?"Ter":d==="wednesday"?"Qua":"Dom").join(", ")}
                      </p>
                      {comp.rounds&&<p className={`text-xs ${sub}`}>{comp.rounds} rodadas</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>
                        {comp.country}
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditComp(comp)} className={`text-xs px-2 py-1 rounded border ${dark?"border-gray-600 text-gray-300":"border-gray-300 text-gray-600"}`}>Editar</button>
                        <button onClick={() => handleDeleteComp(comp.id)} className="text-xs px-2 py-1 rounded border border-red-500/50 text-red-500">Excluir</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CLUBES ──────────────────────────────────────────────────── */}
        {section==="clubs" && (
          <div>
            <div className="flex items-center justify-between mb-3">
               <h2 className={`text-sm font-bold ${tx}`}>Clubes ({filteredTeams.length})</h2>
               <button onClick={()=>{
                 setEditingClubId(null);
                 setNewClub({clubLevel: 3, balance: 20000000, monthlyIncome: 2000000, objective: 'Manter-se', players: []});
                 setShowNewClub(s=>!s);
               }}
                 className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg">
                 + Novo Clube
               </button>
            </div>

            {showNewClub && (
              <div className={`rounded-xl border p-4 mb-4 ${card}`}>
                <p className={`text-xs font-bold ${tx} mb-3`}>{editingClubId ? 'Editar Clube' : 'Novo Clube'}</p>
                <div className="space-y-3">
                  <div>
                    <p className={`text-xs ${sub} mb-1`}>Nome do Clube</p>
                    <input placeholder="ex: Flamengo"
                      value={newClub.name??""} onChange={e=>setNewClub({...newClub,name:e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className={`text-xs ${sub} mb-1`}>Sigla (Máx. 3 letras)</p>
                      <input placeholder="ex: FLA" maxLength={3}
                        value={newClub.abbreviation??""} onChange={e=>setNewClub({...newClub,abbreviation:e.target.value.toUpperCase()})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                    </div>
                    <div>
                      <p className={`text-xs ${sub} mb-1`}>Cidade</p>
                      <input placeholder="ex: Rio de Janeiro"
                        value={newClub.city??""} onChange={e=>setNewClub({...newClub,city:e.target.value})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className={`text-xs ${sub} mb-1`}>Competição</p>
                      <select value={(newClub as any).leagueId || ""} onChange={e=>setNewClub({...newClub, leagueId: e.target.value} as any)}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}>
                        <option value="">Nenhuma / Customizada</option>
                        {localCompetitions.map(comp => (
                          <option key={comp.id} value={comp.id}>{comp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className={`text-xs ${sub} mb-1`}>Nível do Clube</p>
                      <select value={newClub.clubLevel||3} onChange={e=>setNewClub({...newClub,clubLevel:Number(e.target.value) as any})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}>
                        <option value={1}>Nível 1 (Elite)</option>
                        <option value={2}>Nível 2</option>
                        <option value={3}>Nível 3</option>
                        <option value={4}>Nível 4</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className={`text-xs ${sub} mb-1`}>Orçamento Inicial ($)</p>
                      <input type="number" placeholder="Orçamento"
                        value={newClub.balance??""} onChange={e=>setNewClub({...newClub,balance:Number(e.target.value)})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                    </div>
                    <div>
                      <p className={`text-xs ${sub} mb-1`}>Renda Mensal ($)</p>
                      <input type="number" placeholder="Renda Mensal"
                        value={newClub.monthlyIncome??""} onChange={e=>setNewClub({...newClub,monthlyIncome:Number(e.target.value)})}
                        className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                    </div>
                  </div>
                  <div>
                    <p className={`text-xs ${sub} mb-1`}>Objetivo da Temporada</p>
                    <input placeholder="ex: Ser campeão"
                      value={newClub.objective??""} onChange={e=>setNewClub({...newClub,objective:e.target.value})}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold mt-2 cursor-pointer"
                      onClick={handleSaveClub}>
                      {editingClubId ? 'Salvar Clube' : 'Adicionar Clube'}
                    </button>
                    <button className={`flex-1 py-2 border rounded-lg text-sm font-bold mt-2 cursor-pointer ${dark?"border-gray-700 text-gray-300":"border-gray-300 text-gray-600"}`}
                      onClick={() => { setShowNewClub(false); setEditingClubId(null); }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <input type="text" placeholder="Buscar clube..." value={search}
              onChange={e=>setSearch(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm mb-3 ${inp}`}/>
            
            {filteredTeams.length === 0 ? (
              <p className={`text-xs ${sub} text-center py-8`}>Nenhum clube cadastrado nesta busca.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  filteredTeams.reduce((acc, t) => {
                    const lid = (t as any).leagueId || 'unknown';
                    if(!acc[lid]) acc[lid]=[];
                    acc[lid].push(t);
                    return acc;
                  }, {} as Record<string, Team[]>)
                ).map(([lid, tms]) => {
                  const lname = LEAGUES[lid]?.name || localCompetitions.find(c => c.id === lid)?.name || lid;
                  return (
                    <div key={lid} className={`rounded-xl border overflow-hidden ${card}`}>
                      <div className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wider ${sub} border-b ${divider} bg-black/5 dark:bg-white/5`}>
                        {lname}
                      </div>
                      {tms.map(team=>(
                        <button key={team?.id} onClick={()=>{setSelectedTeamId(team?.id as number);setSection("players");setSearch("");}}
                          className={`w-full flex items-center gap-3 px-4 py-3 border-b ${divider} last:border-0 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}>
                          <div className="w-10 h-10 flex-shrink-0"><TeamLogo teamId={team?.id as number} logoUrl={(team as any).logoUrl} fallbackName={team?.name} /></div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${tx}`}>{team?.name}</p>
                            <p className={`text-xs ${sub}`}>{team?.city} · Nível {team?.clubLevel}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-xs font-bold ${dark?"text-green-400":"text-green-600"}`}>{fmtMoney(team.balance)}</p>
                            <p className={`text-xs ${sub}`}>{(localPlayers[team.id] ?? team.players ?? []).length} jog.</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleEditClub(team)}
                              className={`p-1.5 rounded-lg border text-xs ${dark?"border-gray-700 text-gray-300 hover:bg-gray-800":"border-gray-300 text-gray-600 hover:bg-gray-100"}`} title="Editar Clube">
                              ✏️
                            </button>
                            <button onClick={() => handleDeleteClub(team.id)}
                              className={`p-1.5 rounded-lg border border-red-500/50 text-red-500 text-xs hover:bg-red-500/10`} title="Excluir Clube">
                              🗑️
                            </button>
                          </div>
                          <span className={`text-xs ${sub} ml-1`}>›</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── JOGADORES ────────────────────────────────────────────────── */}
        {section==="players" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <select value={selectedTeamId}
                onChange={e=>{setSelectedTeamId(Number(e.target.value));setSearch("");}}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-semibold ${inp}`}>
                <option value={0}>Selecione um Clube</option>
                {localTeams.map(t=>(t ? <option key={t.id} value={t.id}>{t.name}</option> : null))}
              </select>
              {selectedTeamId > 0 && (
                <button onClick={() => {
                  setEditingPlayer({
                    id: Date.now(),
                    name: "",
                    position: "ST",
                    age: 22,
                    overall: 65,
                    potential: 78,
                    height: 180,
                    pace: 65,
                    shooting: 65,
                    passing: 65,
                    dribbling: 65,
                    defense: 60,
                    physical: 65,
                    fatigue: 0,
                    morale: 100,
                    happiness: 100,
                    status: "rotation",
                    salary: 10,
                    contractYears: 2,
                    personality: "professional",
                  });
                }} className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer">
                  + Novo Jogador
                </button>
              )}
            </div>

            {currentTeam && (
              <div className={`rounded-xl border p-3 mb-3 flex items-center justify-between ${card}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10"><TeamLogo teamId={currentTeam.id} logoUrl={currentTeam.logoUrl} fallbackName={currentTeam.name} /></div>
                  <div>
                    <p className={`text-sm font-bold ${tx}`}>{currentTeam.name}</p>
                    <p className={`text-xs ${sub}`}>{teamPlayers.length} jogadores · Nível {currentTeam.clubLevel}</p>
                  </div>
                </div>
              </div>
            )}

            <input type="text" placeholder="Buscar jogador..." value={search}
              onChange={e=>setSearch(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm mb-3 ${inp}`}/>

            <div className={`rounded-xl border ${card}`}>
              {filteredPlayers.map(player=>(
                player ? (<button key={player.id} onClick={()=>setEditingPlayer({...player})}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b ${divider} last:border-0 text-left`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${dark?"bg-gray-700 text-gray-200":"bg-gray-100 text-gray-700"}`}>
                    {player.position}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${tx}`}>{player.name}</p>
                    <p className={`text-xs ${sub}`}>{player.age}a · {player.height}cm · {fmtMoney(player.salary)}/mês</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-black ${player.overall>=80?(dark?"text-green-400":"text-green-600"):player.overall>=70?(dark?"text-blue-400":"text-blue-600"):tx}`}>{player.overall}</p>
                    <p className={`text-xs ${dark?"text-blue-300":"text-blue-600"}`}>{player.potential}</p>
                  </div>
                  <span className={`text-xs ${sub} ml-1`}>›</span>
                </button>) : null
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
