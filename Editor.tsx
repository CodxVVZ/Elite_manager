import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { teams as defaultTeams, Team, Player } from "@/lib/teams";
import { teamLogos } from "@/lib/teamLogos";
import {
  PatchData, PatchMeta, PatchCompetition, PatchTeam, PatchPlayer,
  importPatch, exportPatch, downloadBlob,
  savePatchToStorage, listInstalledPatches, getActivePatch,
  setActivePatch, deletePatch, getDefaultBrasilPatch,
} from "@/lib/patchSystem";

type Section = "patches" | "competitions" | "clubs" | "players";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmtMoney(v: number) { return v >= 1000 ? `${(v/1000).toFixed(1)}M` : `${v}K`; }

const defaultBrasilPatch = getDefaultBrasilPatch();

// ─── COMPONENTE ──────────────────────────────────────────────────────────────

import { TeamLogo } from "@/components/TeamLogo";

export default function Editor() {
  const { isDarkMode } = useDarkMode();
  const [, navigate] = useLocation();
  const dark = isDarkMode;

  const [section, setSection] = useState<Section>("patches");
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(defaultTeams[0]?.id || 1);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [installedPatches, setInstalledPatches] = useState<PatchData[]>([]);
  const [activePatch, setActivePatchState] = useState<PatchData | null>(null);

  useEffect(() => {
    listInstalledPatches().then(setInstalledPatches);
    getActivePatch().then(setActivePatchState);
  }, []);

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [exportingPatch, setExportingPatch] = useState<PatchData | null>(null);
  const [showNewComp, setShowNewComp] = useState(false);
  const [newComp, setNewComp] = useState<Partial<PatchCompetition>>({
    type: 'league', legs: 2, matchDays: ['tuesday','wednesday','sunday'],
  });
  const [localPlayers, setLocalPlayers] = useState<Record<number, Player[]>>({});

  const fileRef = useRef<HTMLInputElement>(null);

  const bg    = dark ? "bg-gray-950" : "bg-gray-50";
  const card  = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const tx    = dark ? "text-white"  : "text-gray-900";
  const sub   = dark ? "text-gray-400" : "text-gray-500";
  const inp   = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                     : "bg-white border-gray-300 text-gray-900 placeholder-gray-400";
  const divider = dark ? "border-gray-800" : "border-gray-200";

  const currentTeam = defaultTeams.find(t => t.id === selectedTeamId) ?? defaultTeams[0];
  const teamPlayers = localPlayers[selectedTeamId] ?? currentTeam?.players ?? [];

  const filteredPlayers = teamPlayers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.position.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTeams = defaultTeams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.city.toLowerCase().includes(search.toLowerCase()) ||
    t.abbreviation.toLowerCase().includes(search.toLowerCase())
  );

  // ── IMPORTAR PATCH ────────────────────────────────────────────────────────
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const patch = await importPatch(file);
      savePatchToStorage(patch);
      setInstalledPatches(listInstalledPatches());
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
      competitions: defaultBrasilPatch.competitions,
      teams: defaultTeams.map(t => ({
        id: t.id, name: t.name, abbreviation: t.abbreviation,
        city: t.city, country: 'Brasil',
        clubLevel: t.clubLevel, balance: t.balance,
        monthlyIncome: t.monthlyIncome, objective: t.objective,
        primaryColor: '#ffffff', secondaryColor: '#000000',
        competitions: ['brasileirao_2026'],
      })),
      players: defaultTeams.flatMap(t =>
        (localPlayers[t.id] ?? t.players ?? []).map(p => ({
          id: p.id, teamId: t.id, name: p.name, position: p.position,
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
    setLocalPlayers(prev => ({
      ...prev,
      [selectedTeamId]: (prev[selectedTeamId] ?? currentTeam?.players ?? []).map(p =>
        p.id === updated.id ? updated : p
      ),
    }));
    setEditingPlayer(null);
  }

  const POSITIONS = ["GK","CB","LB","RB","CDM","CM","CAM","LM","RM","LW","RW","ST"];

  return (
    <div className={`min-h-screen flex flex-col ${bg}`}>

      {/* INPUT OCULTO */}
      <input ref={fileRef} type="file" accept=".emp,.zip" className="hidden" onChange={handleImport}/>

      {/* MODAL EDIÇÃO DE JOGADOR */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center">
          <div className={`w-full max-w-lg rounded-t-2xl border-t border-x p-5 overflow-y-auto max-h-[90vh] ${card}`}>
            <div className="flex justify-between items-center mb-4">
              <p className={`text-base font-bold ${tx}`}>Editar: {editingPlayer.name}</p>
              <div className="flex gap-2">
                <button onClick={() => savePlayerEdit(editingPlayer)}
                  className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg">Salvar</button>
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
        <button onClick={handleExportCurrentData}
          className={`text-xs px-3 py-1.5 rounded-lg border ${dark?"border-gray-700 text-gray-300":"border-gray-300 text-gray-600"}`}>
          Exportar .emp
        </button>
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
                  <button onClick={()=>{setActivePatch(null);setActivePatchState(null);}}
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
                        <button onClick={()=>{setActivePatch(patch);setActivePatchState(patch);}}
                          className={`text-xs px-3 py-1 rounded-lg ${activePatch?.meta.name===patch.meta.name?"bg-green-600 text-white":dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>
                          {activePatch?.meta.name===patch.meta.name?"✓ Ativo":"Ativar"}
                        </button>
                        <button onClick={()=>handleExport(patch)}
                          className={`text-xs px-3 py-1 rounded-lg ${dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>
                          Exportar
                        </button>
                        <button onClick={()=>{deletePatch(patch.meta.name);setInstalledPatches(listInstalledPatches());}}
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
          </div>
        )}

        {/* ── COMPETIÇÕES ─────────────────────────────────────────────── */}
        {section==="competitions" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-bold ${tx}`}>Competições</h2>
              <button onClick={()=>setShowNewComp(s=>!s)}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg">
                + Nova
              </button>
            </div>

            {showNewComp && (
              <div className={`rounded-xl border p-4 mb-4 ${card}`}>
                <p className={`text-xs font-bold ${tx} mb-3`}>Nova competição</p>
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
                    <input placeholder="Nº de rodadas" type="number"
                      value={newComp.rounds??""} onChange={e=>setNewComp({...newComp,rounds:Number(e.target.value)})}
                      className={`w-full px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                  )}
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
                    <input placeholder="País" value={newComp.country??""}
                      onChange={e=>setNewComp({...newComp,country:e.target.value})}
                      className={`px-3 py-2 rounded-lg border text-sm ${inp}`}/>
                  </div>
                  <button className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-bold"
                    onClick={()=>{setShowNewComp(false);setNewComp({type:'league',legs:2,matchDays:['tuesday','wednesday','sunday']});}}>
                    Adicionar competição
                  </button>
                </div>
              </div>
            )}

            {/* Lista de competições do patch padrão */}
            <div className={`rounded-xl border ${card}`}>
              {defaultBrasilPatch.competitions.map((comp,i)=>(
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${dark?"bg-gray-700 text-gray-300":"bg-gray-100 text-gray-600"}`}>
                      {comp.country}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CLUBES ──────────────────────────────────────────────────── */}
        {section==="clubs" && (
          <div>
            <h2 className={`text-sm font-bold mb-3 ${tx}`}>Clubes</h2>
            <input type="text" placeholder="Buscar clube..." value={search}
              onChange={e=>setSearch(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm mb-3 ${inp}`}/>
            <div className={`rounded-xl border ${card}`}>
              {filteredTeams.map(team=>(
                <button key={team.id} onClick={()=>{setSelectedTeamId(team.id);setSection("players");setSearch("");}}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b ${divider} last:border-0 text-left`}>
                  <div className="w-10 h-10 flex-shrink-0"><TeamLogo teamId={team.id} fallbackName={team.name} /></div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${tx}`}>{team.name}</p>
                    <p className={`text-xs ${sub}`}>{team.city} · Nível {team.clubLevel}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-bold ${dark?"text-green-400":"text-green-600"}`}>{fmtMoney(team.balance)}</p>
                    <p className={`text-xs ${sub}`}>{team.players.length} jog.</p>
                  </div>
                  <span className={`text-xs ${sub} ml-1`}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── JOGADORES ────────────────────────────────────────────────── */}
        {section==="players" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <select value={selectedTeamId}
                onChange={e=>{setSelectedTeamId(Number(e.target.value));setSearch("");}}
                className={`flex-1 px-3 py-2 rounded-xl border text-sm font-semibold ${inp}`}>
                {defaultTeams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className={`rounded-xl border p-3 mb-3 flex items-center gap-3 ${card}`}>
              <div className="w-10 h-10"><TeamLogo teamId={currentTeam.id} fallbackName={currentTeam.name} /></div>
              <div>
                <p className={`text-sm font-bold ${tx}`}>{currentTeam.name}</p>
                <p className={`text-xs ${sub}`}>{teamPlayers.length} jogadores · Nível {currentTeam.clubLevel}</p>
              </div>
            </div>

            <input type="text" placeholder="Buscar jogador..." value={search}
              onChange={e=>setSearch(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm mb-3 ${inp}`}/>

            <div className={`rounded-xl border ${card}`}>
              {filteredPlayers.map(player=>(
                <button key={player.id} onClick={()=>setEditingPlayer({...player})}
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
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
