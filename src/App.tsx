import React, { useState, useEffect } from "react";
import { 
  Database, 
  HelpCircle, 
  Plus, 
  Cpu, 
  Download, 
  Upload, 
  Search, 
  Trash2, 
  Save, 
  RefreshCw, 
  TrendingUp, 
  Sparkles, 
  User, 
  Shield, 
  Award, 
  DollarSign, 
  Coins, 
  FileJson, 
  CheckCircle, 
  Info,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { getInitialLeagues, createRNG, attrsByPos, generateStructuredFictionalLeague } from "./mockData";
import { League, Team, Player, PlayerStatus, PlayerPersonality } from "./types";

export default function App() {
  // Database States
  const [leagues, setLeagues] = useState<League[]>(() => {
    const saved = localStorage.getItem("fm_database_studio_leagues");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return getInitialLeagues();
  });

  // Local storage synchronization
  useEffect(() => {
    localStorage.setItem("fm_database_studio_leagues", JSON.stringify(leagues));
  }, [leagues]);

  // UI Selection States
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>(() => leagues[0]?.id || "");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(() => leagues[0]?.teams[0]?.id || null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState("");
  const [posFilter, setPosFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // AI Generation States
  const [genCountry, setGenCountry] = useState("Portugal");
  const [genTheme, setGenTheme] = useState("Clubs reais e jogadores fictícios realistas");
  const [numTeamsToGen, setNumTeamsToGen] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"explorer" | "generator" | "export" | "tutorial">("explorer");

  // Temporary States for Player Editing
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Get active items
  const activeLeague = leagues.find(l => l.id === selectedLeagueId);
  const activeTeam = activeLeague?.teams.find(t => t.id === selectedTeamId);
  const activePlayerList = activeTeam?.players || [];

  // Filtered Players
  const filteredPlayers = activePlayerList.filter(player => {
    const nameMatch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const posMatch = posFilter === "ALL" || player.position === posFilter;
    const statusMatch = statusFilter === "ALL" || player.status === statusFilter;
    return nameMatch && posMatch && statusMatch;
  });

  // Average Stats calculations
  const avgOverall = activePlayerList.length > 0 
    ? Math.round(activePlayerList.reduce((sum, p) => sum + p.overall, 0) / activePlayerList.length) 
    : 0;

  const avgPotential = activePlayerList.length > 0 
    ? Math.round(activePlayerList.reduce((sum, p) => sum + p.potential, 0) / activePlayerList.length) 
    : 0;

  const avgAge = activePlayerList.length > 0
    ? (activePlayerList.reduce((sum, p) => sum + p.age, 0) / activePlayerList.length).toFixed(1)
    : "0";

  // Position color dictionary
  const getPosBadgeClass = (pos: string) => {
    const p = pos.toUpperCase();
    if (p === "GK") return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30";
    if (["CB", "LB", "RB"].includes(p)) return "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30";
    if (["CDM", "CM", "CAM", "LM", "RM"].includes(p)) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30";
    return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30";
  };

  // Status visual representation
  const getStatusLabel = (status: PlayerStatus) => {
    switch (status) {
      case "star": return "⭐ Estrela";
      case "starter": return "🏃 Titular";
      case "rotation": return "🔄 Rotação";
      case "reserve": return "🪑 Reserva";
      case "prospect": return "💎 Promessa";
      default: return status;
    }
  };

  // Helper when clicking a Player in list
  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayerId(player.id);
    setEditingPlayer({ ...player });
  };

  // Dynamic recalculation when player stats are adapted
  const handleEditPlayerField = (field: keyof Player, value: any) => {
    if (!editingPlayer) return;

    const updated = { ...editingPlayer, [field]: value };

    // If Overall or Position changed, dynamically recalculate sub-attributes using original formula limits!
    if (field === "overall" || field === "position") {
      const rngValue = createRNG(updated.id * 123 + 456);
      const attributes = attrsByPos(updated.position, updated.overall, rngValue);
      Object.assign(updated, attributes);
      
      // Auto-recalculate salary based on formula
      if (activeTeam) {
        updated.salary = Math.max(5, Math.round((updated.overall - 50) * activeTeam.clubLevel * 2.5));
      }
      
      // Make sure potential matches overall
      if (updated.potential < updated.overall) {
        updated.potential = updated.overall;
      }
    }

    setEditingPlayer(updated);
  };

  // Age the player 1 year to simulate potential and growth!
  const handleGrowPlayer = () => {
    if (!editingPlayer) return;
    const current = { ...editingPlayer };
    if (current.age >= 38) {
      alert("Jogador muito experiente para crescer significativamente!");
      return;
    }

    const currentAge = current.age + 1;
    // Growth multiplier inversely proportional to current age
    const growthGap = current.potential - current.overall;
    let growthNum = 0;
    if (growthGap > 0) {
      const rngValue = Math.random();
      if (currentAge <= 20) {
        growthNum = Math.floor(rngValue * 4) + 1; // Grow 1-4 points
      } else if (currentAge <= 23) {
        growthNum = Math.floor(rngValue * 3) + 1; // Grow 1-3 points
      } else if (currentAge <= 26) {
        growthNum = Math.floor(rngValue * 2) + 1; // Grow 1-2 points
      } else {
        growthNum = Math.random() > 0.5 ? 1 : 0; // Elderly growth slows down
      }
    }

    const nextOverall = Math.min(current.potential, current.overall + growthNum);
    const updated = { ...current, age: currentAge, overall: nextOverall };

    // Recalculate attributes
    const rngValue = createRNG(updated.id * 123 + 456);
    const attributes = attrsByPos(updated.position, updated.overall, rngValue);
    Object.assign(updated, attributes);
    
    // Recalculate salary
    if (activeTeam) {
      updated.salary = Math.max(10, Math.round((updated.overall - 50) * activeTeam.clubLevel * 2.5));
    }

    setEditingPlayer(updated);
    setSuccessMsg(`Simulado +1 Ano de Desenvolvimento! ${updated.name} aumentou +${growthNum} de OVR!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Commit edited player back to state database
  const savePlayerChanges = () => {
    if (!editingPlayer || !selectedTeamId || !selectedLeagueId) return;

    setLeagues(prevLeagues => 
      prevLeagues.map(l => {
        if (l.id !== selectedLeagueId) return l;
        return {
          ...l,
          teams: l.teams.map(t => {
            if (t.id !== selectedTeamId) return t;
            return {
              ...t,
              players: t.players.map(p => p.id === editingPlayer.id ? editingPlayer : p)
            };
          })
        };
      })
    );

    setSuccessMsg(`O jogador "${editingPlayer.name}" foi salvo com sucesso! Atributos e semente sincronizados.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Delete Player from active team
  const handleDeletePlayer = (playerId: number) => {
    if (!confirm("Tem certeza que deseja excluir este jogador?")) return;
    setLeagues(prevLeagues => 
      prevLeagues.map(l => {
        if (l.id !== selectedLeagueId) return l;
        return {
          ...l,
          teams: l.teams.map(t => {
            if (t.id !== selectedTeamId) return t;
            return {
              ...t,
              players: t.players.filter(p => p.id !== playerId)
            };
          })
        };
      })
    );
    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null);
      setEditingPlayer(null);
    }
  };

  // Add a brand-new player template locally to database
  const handleAddNewPlayer = () => {
    if (!selectedTeamId || !selectedLeagueId) return;
    
    const newId = (selectedTeamId * 1000) + Math.floor(Math.random() * 899) + 100;
    const rng = createRNG(newId * 7);
    const pick = (arr: any[]) => arr[Math.floor(rng() * arr.length)];
    const randomPositions = ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "RM", "LM", "LW", "RW", "ST"];
    const randomNames = ["Vitor Ramos", "Gabriel Neto", "Juninho Alagoas", "Henrique", "Marlon", "Felipe Bastos", "Daniel Souza", "Kaio", "Mateus Silva", "Luanzinho"];
    
    const pos = pick(randomPositions);
    const ovr = activeTeam ? Math.max(50, Math.min(85, Math.round(62 + (activeTeam.clubLevel * 3) + (Math.random() * 8)))) : 65;
    const attrs = attrsByPos(pos, ovr, rng);

    const newPlayer: Player = {
      id: newId,
      name: pick(randomNames) + " " + pick(["Cabral", "Freitas", "dos Santos", "Oliveira", "Moreira", "Costa", "Pinto"]),
      position: pos,
      age: Math.floor(Math.random() * 10) + 17, // 17-26
      overall: ovr,
      potential: ovr + Math.floor(Math.random() * 12) + 2,
      height: Math.floor(Math.random() * 30) + 168,
      ...attrs,
      fatigue: 100,
      morale: 80,
      happiness: 80,
      status: "rotation",
      salary: Math.max(5, Math.round((ovr - 50) * (activeTeam?.clubLevel || 2) * 2.5)),
      contractYears: 2,
      injuryWeeks: 0,
      personality: pick(['leader', 'professional', 'temperamental', 'quiet', 'ambitious']),
    };

    setLeagues(prevLeagues => 
      prevLeagues.map(l => {
        if (l.id !== selectedLeagueId) return l;
        return {
          ...l,
          teams: l.teams.map(t => {
            if (t.id !== selectedTeamId) return t;
            return {
              ...t,
              players: [newPlayer, ...t.players]
            };
          })
        };
      })
    );

    setSelectedPlayerId(newPlayer.id);
    setEditingPlayer(newPlayer);
    setSuccessMsg(`Novo jogador "${newPlayer.name}" criado nas categorias de base do clube!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Trigger Offline Procedural Generation (Fictional structural leagues)
  const handleLocalGenerateLeague = () => {
    const newId = `fic_${Date.now()}`;
    const newName = `Liga Genérica ${Math.floor(Math.random() * 1000)}`;
    const newLeague = generateStructuredFictionalLeague(newId, newName, "Virtual", numTeamsToGen, Date.now());
    
    setLeagues(prev => [...prev, newLeague]);
    setSelectedLeagueId(newId);
    setSelectedTeamId(newLeague.teams[0]?.id);
    setSuccessMsg(`Liga Estruturada Fictícia gerada instantaneamente para testes! (${numTeamsToGen} times)`);
    setActiveTab("explorer");
  };

  // Trigger Gemini AI generation endpoint
  const handleAIGenerateLeague = async () => {
    setIsGenerating(true);
    setGenLogs([]);
    setErrorMsg(null);

    const logs = [
      "Contatando scouts virtuais do país escolhido...",
      "Processando nomes culturais típicos na região...",
      "Criando calendários e elencos balanceados...",
      "Aplicando fórmulas matemáticas harmônicas para Overall e Atributos..."
    ];

    let currentLogIdx = 0;
    const logInterval = setInterval(() => {
      if (currentLogIdx < logs.length) {
        const msg = logs[currentLogIdx];
        setGenLogs(prev => [...prev, msg]);
        currentLogIdx++;
      }
    }, 1800);

    try {
      setGenLogs(prev => [...prev, `Enviando prompt de geração ao Gemini 3.5 [Tema: ${genTheme}]...`]);
      
      const response = await fetch("/api/generate-league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: genCountry,
          theme: genTheme,
          numTeams: numTeamsToGen
        })
      });

      const resData = await response.json();
      clearInterval(logInterval);

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "A API retornou um erro inesperado.");
      }

      const generatedLeague: League = resData.league;
      
      setLeagues(prev => [...prev, generatedLeague]);
      setSelectedLeagueId(generatedLeague.id);
      if (generatedLeague.teams.length > 0) {
        setSelectedTeamId(generatedLeague.teams[0].id);
      }
      
      setGenLogs(prev => [...prev, "✓ Geração concluída com sucesso via Gemini AI!"]);
      setSuccessMsg(`Nova Liga "${generatedLeague.name}" adicionada ao Banco de Dados com sucesso!`);
      setActiveTab("explorer");
    } catch (err: any) {
      clearInterval(logInterval);
      setErrorMsg(err.message || "Erro de conexão ao servidor Express.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete entire league
  const handleDeleteLeague = (leagueId: string) => {
    if (leagues.length <= 1) {
      alert("Você deve manter pelo menos uma liga no banco de dados!");
      return;
    }
    if (!confirm("Tem certeza que deseja apagar a liga inteira? Todos os times e jogadores sumirão.")) return;
    
    const nextLeagues = leagues.filter(l => l.id !== leagueId);
    setLeagues(nextLeagues);
    setSelectedLeagueId(nextLeagues[0].id);
    setSelectedTeamId(nextLeagues[0].teams[0]?.id || null);
    setSelectedPlayerId(null);
    setEditingPlayer(null);
  };

  // Reset database back to default state
  const handleResetDatabase = () => {
    const init = getInitialLeagues();
    setLeagues(init);
    localStorage.removeItem("fm_database_studio_leagues");
    setSelectedLeagueId(init[0].id);
    setSelectedTeamId(init[0].teams[0]?.id || null);
    setSelectedPlayerId(null);
    setEditingPlayer(null);
    setSuccessMsg("Banco de Dados restaurado para as ligas originais!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Export JSON download helper
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leagues, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `soccer_database_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON helper
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].teams) {
            setLeagues(parsed);
            setSelectedLeagueId(parsed[0].id);
            if (parsed[0].teams.length > 0) {
              setSelectedTeamId(parsed[0].teams[0].id);
            }
            setSelectedPlayerId(null);
            setEditingPlayer(null);
            setSuccessMsg("Arquivo de banco de dados JSON importado e verificado com sucesso!");
          } else {
            alert("Estrutura inválida. O arquivo JSON deve ser um array de Ligas (League) contendo times e jogadores.");
          }
        } catch (error) {
          alert("Ocorreu um erro ao decodificar seu JSON. Verifique a sintaxe.");
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased text-sm">
      
      {/* HEADER BAR */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-emerald-500 to-green-400 rounded-lg text-slate-950 shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Futebol Database Studio 
                <span className="text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-normal">v2.1</span>
              </h1>
              <p className="text-xs text-slate-400">Gerencie, simule e expanda ligas reais ou geradas por IA</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("explorer")}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition ${
                activeTab === "explorer" ? "bg-slate-800 text-white border border-slate-700" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database className="w-3.5 h-3.5 inline mr-1.5" /> Explorer
            </button>
            <button
              onClick={() => setActiveTab("generator")}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition flex items-center gap-1.5 ${
                activeTab === "generator" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-900 hover:border-slate-800 text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" /> Gerador IA do Gemini
            </button>
            <button
              onClick={() => setActiveTab("export")}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition ${
                activeTab === "export" ? "bg-slate-800 text-white border border-slate-700" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileJson className="w-3.5 h-3.5 inline mr-1.5" /> Importar / Exportar
            </button>
            <button
              onClick={() => setActiveTab("tutorial")}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition ${
                activeTab === "tutorial" ? "bg-slate-800 text-white border border-slate-700" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 inline mr-1.5" /> Como Implementar?
            </button>
          </div>
        </div>
      </header>

      {/* SUCCESS / ERROR TOP TOAST */}
      {successMsg && (
        <div className="bg-emerald-950/90 border-y border-emerald-800 text-emerald-300 px-4 py-3 text-center sticky top-16 z-50 animate-fade-in flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium text-xs">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/90 border-y border-rose-800 text-rose-300 px-4 py-3 text-center sticky top-16 z-50 animate-fade-in flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium text-xs">{errorMsg}</span>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* 1. TUTORIAL / TUTORIAL TAB (EXPLICAÇÃO DE ARQUITETURA DE BANCO DE DADOS) */}
        {activeTab === "tutorial" && (
          <div className="bg-slate-900/90 rounded-xl border border-slate-800/80 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-400" /> Como escalar seu Banco de Dados no Jogo
              </h2>
              <p className="text-slate-400 mt-1">
                Uma das maiores dificuldades ao criar jogos estilo Elifoot, Football Manager ou Brasfoot é gerenciar o enorme volume de dados dos elencos. Seguir com arrays estáticos rígidos dentro do seu arquivo React torna o código confuso e bloqueia atualizações dinâmicas. Veja como resolver:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 font-mono font-bold flex items-center justify-center">1</div>
                <h4 className="font-semibold text-white">1. Separação de Arquivos (JSONs)</h4>
                <p className="text-xs text-slate-400">
                  Transfira os dados para arquivos <code className="text-emerald-400">.json</code> separados por Liga (ex: <code className="text-amber-400">"brazil.json"</code>, <code className="text-amber-400">"england.json"</code>) e importe-os apenas quando o jogador selecionar essa liga específica.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 font-mono font-bold flex items-center justify-center">2</div>
                <h4 className="font-semibold text-white">2. Armazenamento Local e Firestore</h4>
                <p className="text-xs text-slate-400">
                  Carregue os JSONs estáticos na primeira vez que o jogo for iniciado e grave o estado atual do save no <code className="text-emerald-400">localStorage</code> do navegador ou em um banco persistente como Cloud Firestore (Firebase).
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-900 rounded-lg p-4 space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 font-mono font-bold flex items-center justify-center">3</div>
                <h4 className="font-semibold text-white">3. Geração Baseada em Algoritmo</h4>
                <p className="text-xs text-slate-400">
                  Ao invés de definir cada um dos 6 atributos fisicos (Pace, Passing, etc.) na mão, use a semente única do jogador e rode a equação de balanceamento com semente (<code className="text-emerald-400">createRNG</code>) dependendo de sua posição e OVR! É o segredo dos mundos procedurais.
                </p>
              </div>
            </div>

            <div className="bg-slate-950 rounded-lg p-4 font-mono select-all">
              <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-900 pb-2 mb-3">
                <span>Evolução Recomendada da Estrutura de Pastas</span>
                <span className="text-emerald-400">Copy / Paste</span>
              </div>
              <pre className="text-slate-300 text-xs leading-relaxed space-y-1">
{`meu-jogo/
├── src/
│   ├── types/
│   │   └── football.ts          # Definições estritas (Player, Team, League, etc)
│   ├── data/
│   │   ├── generator.ts         # Fórmulas matemáticas de atributos (createRNG, attrsByPos)
│   │   └── leagues/
│   │       ├── brasil_serie_a.json  # Apenas as strings e arrays de dados brutos
│   │       └── inglaterra_pl.json   # Muito mais leve de carregar!
│   ├── hooks/
│   │   └── useGameSave.ts       # Carrega/Grava no Firestore ou LocalStorage
│   └── components/
│       └── DBViewer.tsx         # Paineis visuais de edição`}
              </pre>
            </div>
            
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setActiveTab("explorer")}
                className="px-4 py-2 bg-emerald-600 text-white rounded font-medium text-xs hover:bg-emerald-700 transition"
              >
                Voltar para o Explorer e Ver como Funciona
              </button>
            </div>
          </div>
        )}

        {/* 2. DYNAMIC GENERATORS TAB */}
        {activeTab === "generator" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* OFFLINE FICTIONAL GENERATOR */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 flex flex-col justify-between">
                <div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-400" /> Gerador 100% Fictício (Offline)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Não possui licenças das ligas? Gere competições fictícias em milissegundos. Usa algoritmos locais para criar nomes e escudos aleatórios, organizados em uma estrutura de time realista (posições, contratos, OVRs base e status).
                    </p>
                  </div>

                  <div className="mt-5 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Quantidade de Times:</label>
                    <select
                      value={numTeamsToGen}
                      onChange={(e) => setNumTeamsToGen(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 hover:border-blue-500 rounded px-3 py-2 text-xs text-white outline-none transition"
                    >
                      <option value={4}>4 Times</option>
                      <option value={8}>8 Times (Leve)</option>
                      <option value={12}>12 Times</option>
                      <option value={20}>20 Times</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleLocalGenerateLeague}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-md transition flex items-center justify-center gap-2 mt-4"
                >
                  <RefreshCw className="w-4 h-4" />
                  Estruturar Nova Liga Fictícia
                </button>
              </div>

              {/* AI GENERATOR */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 flex flex-col justify-between">
                <div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400" /> Gerador Contextual (Gemini AI)
                    </h3>
                    <p className="text-xs text-slate-400">Povoa sua liga utilizando inteligência artificial generativa com base no contexto cultural real do país selecionado (requer backend ativo).</p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">País / Região:</label>
                      <input
                        type="text"
                        value={genCountry}
                        onChange={(e) => setGenCountry(e.target.value)}
                        placeholder="Ex: Brasil, Japão, Liga Intergalática..."
                        className="w-full bg-slate-950 border border-slate-800 hover:border-emerald-500 focus:border-emerald-500 rounded px-3 py-2 text-xs text-white outline-none transition"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["Brasil", "Inglaterra", "Espanha", "Itália", "Alemanha", "Portugal"].map(c => (
                          <button key={c} onClick={() => setGenCountry(c)} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded hover:bg-slate-700 hover:text-white transition">{c}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Temática / Estilo:</label>
                      <input
                        type="text"
                        value={genTheme}
                        onChange={(e) => setGenTheme(e.target.value)}
                        placeholder="Ex: Times dos anos 90, Times Reais..."
                        className="w-full bg-slate-950 border border-slate-800 hover:border-emerald-500 focus:border-emerald-500 rounded px-3 py-2 text-xs text-white outline-none transition"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                         {[
                           "Realista (Atual)", 
                           "Clássicos / Retrô", 
                           "Fantasia Épica / RPG", 
                           "Cyberpunk 2100"
                         ].map(t => (
                          <button key={t} onClick={() => setGenTheme(t)} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded hover:bg-slate-700 hover:text-white transition">{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleAIGenerateLeague}
                  disabled={isGenerating || !genCountry}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-xs font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Cpu className="w-4 h-4" />}
                  {isGenerating ? "Processando AI..." : "Enriquecer com IA (Contexto Real)"}
                </button>
              </div>
            </div>

            {/* AI Console output */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-[200px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Log de Processamento (IA backend)</span>
                {isGenerating && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div className="bg-slate-950 rounded border border-slate-900 p-3 font-mono text-xs flex-1 overflow-y-auto space-y-1 leading-relaxed text-slate-400">
                {genLogs.length === 0 ? (
                  <div className="text-slate-600 h-full flex flex-col items-center justify-center mt-2">
                    <p>O console remoto está inativo.</p>
                    <p className="text-[10px] text-center max-w-sm mt-1">Gere ligas AI para acompanhar as métricas em tempo real.</p>
                  </div>
                ) : (
                  genLogs.map((log, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="text-slate-700">[{index + 1}]</span>
                      <span className={log && log.startsWith("✓") ? "text-emerald-400 font-semibold" : ""}>{log}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. IMPORT / EXPORT DATA HUB TAB */}
        {activeTab === "export" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Export Board */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-400" /> Exportar Database (.json)
                </h3>
                <p className="text-xs text-slate-400">Gere um arquivo de dados compilado com todas as edições e ligas adicionadas por você ou pelo Gemini.</p>
              </div>

              <p className="text-xs text-slate-400">
                O arquivo exportado respeita a modelagem ideal para carregar dinamicamente em seu código fonte, eliminando a dependência de grandes estruturas estáticas inline nos componentes.
              </p>

              <div className="bg-slate-950 rounded-lg p-3 border border-slate-900 font-mono text-[11px] text-slate-400 space-y-1.5 select-none">
                <div className="text-emerald-400">// Exemplo de nó raiz exportado</div>
                <div>{"["}</div>
                <div className="pl-4">{"{"}</div>
                <div className="pl-8">"id": "br_serie_a",</div>
                <div className="pl-8">"name": "Série A - Brasil",</div>
                <div className="pl-8">"teams": [ ... ]</div>
                <div className="pl-4">{"}"}</div>
                <div>{"]"}</div>
              </div>

              <button
                onClick={handleExportJSON}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-950" />
                Baixar Arquivo JSON do Database
              </button>
            </div>

            {/* Import Board */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Upload className="w-5 h-5 text-teal-400" /> Importar Database Existente
                  </h3>
                  <p className="text-xs text-slate-400">Carregue ou substitua instantaneamente sua database de testes carregando um arquivo JSON local.</p>
                </div>

                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                  Utilize esta área para carregar novamente as ligas modificadas por você anteriormente ou para sincronizar alterações criadas em scripts externos. O leitor valida a integridade do JSON antes do carregamento.
                </p>
                
                <div className="mt-4 border-2 border-dashed border-slate-850 bg-slate-950/60 p-6 rounded-lg text-center cursor-pointer hover:bg-slate-950 transition relative">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <FileJson className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-300 block">Escolher arquivo .json</span>
                  <span className="text-[10px] text-slate-500 tracking-wide mt-1 block">Tamanho limite: 5MB</span>
                </div>
              </div>

              {showResetConfirm ? (
                <div className="mt-4 p-4 border border-rose-900 rounded bg-rose-950/20 text-center space-y-3">
                   <p className="text-xs text-rose-500 font-bold">
                     Isso apagará todas as modificações e restaurará as ligas originais. Tem certeza?
                   </p>
                   <div className="flex gap-2">
                     <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 text-xs font-bold text-slate-400 bg-slate-900 rounded">Cancelar</button>
                     <button onClick={() => {
                        setShowResetConfirm(false);
                        handleResetDatabase();
                     }} className="flex-1 py-2 bg-rose-900 text-white text-xs font-bold rounded">Sim, Resetar</button>
                   </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full mt-4 py-2 bg-slate-950 border border-slate-800 hover:border-rose-900 text-slate-400 hover:text-rose-400 rounded text-xs transition"
                >
                  Resetar para o Banco de Dados Original
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. EXPLORER & EDITOR VIEW TAB */}
        {activeTab === "explorer" && (
          <div className="space-y-6">
            
            {/* LEAGUES CONTROLLER & STATS HEADER BANNER */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              
              {/* League Selector */}
              <div className="md:col-span-2 bg-slate-900/60 border border-slate-900/90 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-950 rounded border border-slate-800 flex items-center justify-center text-slate-400">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Liga Ativa</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedLeagueId}
                      onChange={(e) => {
                        const nextLeague = leagues.find(l => l.id === e.target.value);
                        setSelectedLeagueId(e.target.value);
                        setSelectedTeamId(nextLeague?.teams[0]?.id || null);
                        setSelectedPlayerId(null);
                        setEditingPlayer(null);
                      }}
                      className="bg-transparent text-white font-bold text-sm outline-none w-full cursor-pointer pr-1"
                    >
                      {leagues.map(l => (
                        <option className="bg-slate-950 text-slate-300" key={l.id} value={l.id}>
                          {l.name} ({l.country})
                        </option>
                      ))}
                    </select>
                    {selectedLeagueId && (
                      <button 
                        onClick={() => handleDeleteLeague(selectedLeagueId)}
                        title="Deletar esta liga"
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats - Avg OVR */}
              <div className="bg-slate-900/60 border border-slate-900/90 rounded-lg p-3 flex items-center gap-3.5">
                <div className="w-9 h-9 rounded bg-emerald-950/40 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">
                  {avgOverall}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-weight-semibold">OVR Médio do Elenco</span>
                  <span className="text-white font-bold text-sm">Rating Balanceada</span>
                </div>
              </div>

              {/* Stats - Pot OVR */}
              <div className="bg-slate-900/60 border border-slate-900/90 rounded-lg p-3 flex items-center gap-3.5">
                <div className="w-9 h-9 rounded bg-blue-950/40 text-blue-400 flex items-center justify-center text-xs font-mono font-bold">
                  {avgPotential}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-weight-semibold">Média de Potencial</span>
                  <span className="text-white font-bold text-sm">Margem de Crescimento</span>
                </div>
              </div>

            </div>

            {/* SECTIONS DIVIDER: TEAMS COLUMN & SQUAD VIEW ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* TEAMS SELECTOR PANEL (4 Cols) */}
              <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[580px]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Times da Liga ({activeLeague?.teams.length || 0})</h3>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {activeLeague?.teams.map(team => {
                    const isSelected = team.id === selectedTeamId;
                    const squadAvgOvr = Math.round(team.players.reduce((sum, p) => sum + p.overall, 0) / (team.players.length || 1));
                    return (
                      <button
                        key={team.id}
                        onClick={() => {
                          setSelectedTeamId(team.id);
                          setSelectedPlayerId(null);
                          setEditingPlayer(null);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border transition duration-150 flex items-center justify-between group ${
                          isSelected 
                            ? "bg-slate-805 bg-slate-800 border-slate-600 text-white" 
                            : "bg-slate-950 border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="text-xs font-bold block truncate group-hover:text-emerald-400 transition">{team.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">{team.city} ({team.abbreviation})</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] px-1 py-0.5 rounded font-bold font-mono ${
                            team.clubLevel === 4 ? "bg-amber-500/20 text-amber-300" :
                            team.clubLevel === 3 ? "bg-blue-500/20 text-blue-300" :
                            "bg-slate-500/25 text-slate-400"
                          }`}>
                            Lvl {team.clubLevel}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-300">{squadAvgOvr}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {activeTeam && (
                  <div className="border-t border-slate-800 pt-3 mt-3 space-y-2 select-none">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Objetivo:</span>
                      <span className="text-slate-200 font-semibold truncate pl-2">{activeTeam.objective}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Orçamento:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        ${(activeTeam.balance).toLocaleString()}K
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* PLAYERS GRID LIST (9 Cols) */}
              <div className="lg:col-span-9 space-y-4">
                
                {/* TOOLBAR CONTROLS */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Search input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar jogador no elenco ativo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded pl-9 pr-3 py-2 text-xs text-white outline-none transition"
                    />
                  </div>

                  {/* Position filter */}
                  <div className="flex items-center gap-2">
                    <select
                      value={posFilter}
                      onChange={(e) => setPosFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-850 text-slate-300 rounded px-2.5 py-2 text-xs cursor-pointer outline-none hover:border-slate-800"
                    >
                      <option value="ALL">Posições (Todas)</option>
                      <option value="GK">Goleiros (GK)</option>
                      <option value="CB">Zagueiros (CB)</option>
                      <option value="LB">Laterais Esquerdo (LB)</option>
                      <option value="RB">Laterais Direito (RB)</option>
                      <option value="CDM">Volantes (CDM)</option>
                      <option value="CM">Meias de Ligação (CM)</option>
                      <option value="CAM">Meias Armadores (CAM)</option>
                      <option value="LM">Meia Lateral E (LM)</option>
                      <option value="RM">Meia Lateral D (RM)</option>
                      <option value="LW">Pontas Esquerdo (LW)</option>
                      <option value="RW">Pontas Direito (RW)</option>
                      <option value="ST">Centroavantes (ST)</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-950 border border-slate-850 text-slate-300 rounded px-2.5 py-2 text-xs cursor-pointer outline-none hover:border-slate-800"
                    >
                      <option value="ALL">Status do Elenco (Todos)</option>
                      <option value="star">⭐ Estrela</option>
                      <option value="starter">🏃 Titular</option>
                      <option value="rotation">🔄 Rotação</option>
                      <option value="reserve">🪑 Reserva</option>
                      <option value="prospect">💎 Promessa</option>
                    </select>

                    <button
                      onClick={handleAddNewPlayer}
                      disabled={!selectedTeamId}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold px-3 py-2 rounded text-xs transition shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4 text-slate-950" /> Criar Jogador
                    </button>
                  </div>
                </div>

                {/* SQUAD AREA - Split content: active player list & drawer editor */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  
                  {/* SQUAD LIST (7 Columns of visual grid player tiles) */}
                  <div className={`md:col-span-7 space-y-2 overflow-y-auto max-h-[480px] pr-1`}>
                    {filteredPlayers.length === 0 ? (
                      <div className="bg-slate-900 border border-slate-850 rounded-xl p-8 text-center text-slate-500">
                        <User className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-xs">Nenhum jogador encontrado com os filtros aplicados.</p>
                      </div>
                    ) : (
                      filteredPlayers.map(player => {
                        const isEditing = player.id === selectedPlayerId;
                        return (
                          <div
                            key={player.id}
                            onClick={() => handleSelectPlayer(player)}
                            className={`w-full p-2.5 rounded-lg border transition duration-150 flex items-center justify-between cursor-pointer ${
                              isEditing 
                                ? "bg-slate-900 border-slate-500 text-white" 
                                : "bg-slate-900/60 border-slate-900/80 hover:border-slate-800 text-slate-300 hover:bg-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${getPosBadgeClass(player.position)}`}>
                                {player.position}
                              </span>
                              <div className="truncate">
                                <span className="text-xs font-bold block truncate">{player.name}</span>
                                <span className="text-[10px] text-slate-500 block">
                                  Idade: {player.age} anos • {player.height} cm • Contrato: {player.contractYears}a • {getStatusLabel(player.status)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right font-mono">
                                <div className="text-xs font-bold flex items-center justify-end gap-1.5">
                                  <span>OVR {player.overall}</span>
                                  {player.potential > player.overall && (
                                    <span className="text-[10px] text-blue-400 font-normal">➔ {player.potential}</span>
                                  )}
                                </div>
                                <span className="text-[9px] text-emerald-400 block">${player.salary}K/mês</span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePlayer(player.id);
                                }}
                                className="text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-slate-950 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ACTIVE PLAYER EDITOR DETAIL DRAWER (5 Columns) */}
                  <div className="md:col-span-5">
                    {editingPlayer ? (
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4 shadow-xl relative animate-fade-in">
                        
                        {/* Editor Header */}
                        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1 px-2 bg-slate-950 text-emerald-400 rounded text-xs font-bold font-mono">ID {editingPlayer.id}</span>
                            <span className="text-xs font-bold text-slate-200">Editor Ativo</span>
                          </div>
                          <button
                            onClick={handleGrowPlayer}
                            title="Simular envelhecimento natural do jogador com semente"
                            className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300 font-semibold px-2 py-1 rounded text-[10px] transition flex items-center gap-1 border border-blue-900/40"
                          >
                            <TrendingUp className="w-3 h-3" /> Crescer +1 Ano
                          </button>
                        </div>

                        {/* Player Basic Settings */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-400">Nome:</label>
                            <input
                              type="text"
                              value={editingPlayer.name}
                              onChange={(e) => handleEditPlayerField("name", e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-400">Posição:</label>
                              <select
                                value={editingPlayer.position}
                                onChange={(e) => handleEditPlayerField("position", e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                              >
                                {["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "ST"].map(pos => (
                                  <option key={pos} value={pos}>{pos}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-400">Idade / Altura:</label>
                              <div className="flex gap-1">
                                <input
                                  type="number"
                                  value={editingPlayer.age}
                                  onChange={(e) => handleEditPlayerField("age", Math.max(15, Math.min(45, Number(e.target.value))))}
                                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-center text-white outline-none"
                                  title="Idade (15 a 45 anos)"
                                />
                                <input
                                  type="number"
                                  value={editingPlayer.height}
                                  onChange={(e) => handleEditPlayerField("height", Math.max(140, Math.min(210, Number(e.target.value))))}
                                  className="w-1/2 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-center text-white outline-none"
                                  title="Altura (cm)"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Ratings OVR / Potential */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2 rounded border border-slate-950">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 font-medium">Overall (OVR)</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={30}
                                  max={99}
                                  value={editingPlayer.overall}
                                  onChange={(e) => handleEditPlayerField("overall", Number(e.target.value))}
                                  className="flex-1 accent-emerald-500 h-1"
                                />
                                <span className="font-mono font-bold text-emerald-400 text-xs w-6 text-right select-none">{editingPlayer.overall}</span>
                              </div>
                            </div>

                            <div className="space-y-0.5">
                              <span className="text-[10px] text-slate-400 font-medium">Potencial (POT)</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min={editingPlayer.overall}
                                  max={99}
                                  value={editingPlayer.potential}
                                  onChange={(e) => handleEditPlayerField("potential", Number(e.target.value))}
                                  className="flex-1 accent-blue-500 h-1"
                                />
                                <span className="font-mono font-bold text-blue-400 text-xs w-6 text-right select-none">{editingPlayer.potential}</span>
                              </div>
                            </div>
                          </div>

                          {/* Physical/Mental fields */}
                          <div className="space-y-1 bg-slate-950 p-2.5 rounded border border-slate-900 space-y-2 select-none">
                            <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block font-bold">Sub-atributos Calculados dinamicamente</span>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono select-none">
                              <div className="flex justify-between border-b border-slate-900/60 pb-0.5">
                                <span className="text-slate-400">PACE Velocidade:</span>
                                <span className="text-white font-bold">{editingPlayer.pace}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900/60 pb-0.5">
                                <span className="text-slate-400">SHO Chute:</span>
                                <span className="text-white font-bold">{editingPlayer.shooting}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900/60 pb-0.5">
                                <span className="text-slate-400">PAS Passe:</span>
                                <span className="text-white font-bold">{editingPlayer.passing}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900/60 pb-0.5">
                                <span className="text-slate-400">DRI Drible:</span>
                                <span className="text-white font-bold">{editingPlayer.dribbling}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900/60 pb-0.5">
                                <span className="text-slate-400">DEF Defesa:</span>
                                <span className="text-white font-bold">{editingPlayer.defense}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-900/60 pb-0.5">
                                <span className="text-slate-400">PHY Físico:</span>
                                <span className="text-white font-bold">{editingPlayer.physical}</span>
                              </div>
                            </div>
                          </div>

                          {/* Extra Status attributes */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-400">Status Elenco:</label>
                              <select
                                value={editingPlayer.status}
                                onChange={(e) => handleEditPlayerField("status", e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                              >
                                <option value="star">Estrela ⭐</option>
                                <option value="starter">Titular 🏃</option>
                                <option value="rotation">Rotação 🔄</option>
                                <option value="reserve">Reserva 🪑</option>
                                <option value="prospect">Promessa 💎</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-400">Personalidade:</label>
                              <select
                                value={editingPlayer.personality}
                                onChange={(e) => handleEditPlayerField("personality", e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none cursor-pointer"
                              >
                                <option value="leader">Líder (Leader)</option>
                                <option value="professional">Profissional</option>
                                <option value="temperamental">Temperamental</option>
                                <option value="quiet">Quieto / Calmo</option>
                                <option value="ambitious">Ambicioso</option>
                              </select>
                            </div>
                          </div>

                          {/* Wage & Contracts */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-400">Contrato (Anos):</label>
                              <input
                                type="number"
                                value={editingPlayer.contractYears}
                                onChange={(e) => handleEditPlayerField("contractYears", Math.max(1, Math.min(5, Number(e.target.value))))}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-center py-1 text-xs text-white outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-400">Salários ($K/mês):</label>
                              <input
                                type="number"
                                value={editingPlayer.salary}
                                onChange={(e) => handleEditPlayerField("salary", Math.max(1, Number(e.target.value)))}
                                className="w-full bg-slate-950 border border-slate-800 rounded px-2 text-center py-1 text-xs text-white outline-none"
                              />
                            </div>
                          </div>

                        </div>

                        {/* Save Action Banner */}
                        <div className="pt-2">
                          <button
                            onClick={savePlayerChanges}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-slate-950 hover:text-slate-950 rounded text-xs transition flex items-center justify-center gap-1.5"
                          >
                            <Save className="w-4 h-4 text-slate-950" /> Salvar Alterações
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/60 border border-slate-900 rounded-xl p-8 text-center text-slate-500 min-h-[300px] flex flex-col justify-center items-center">
                        <User className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-400">Nenhum jogador selecionado</p>
                        <p className="text-[11px] text-slate-500 max-w-[200px] mt-1">Selecione um jogador na tabela lateral para visualizar ou editar as notas e atributos.</p>
                      </div>
                    )}
                  </div>

                </div>

              </div>
              
            </div>

          </div>
        )}

      </main>

      {/* FOOTER METADATA AND FEEDBACK */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-600 text-xs py-8 mt-16 select-none leading-relaxed">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <span className="font-bold text-slate-500">Futebol Database Studio</span>
            <p className="text-[11px] text-slate-600">Projetado com base nas requisições e regras de sementes procedurais.</p>
          </div>
          <div className="text-center md:text-right space-y-0.5 text-slate-600 text-[11px]">
            <div>UTC local: 2026-05-23 03:42:00</div>
            <div>Arquitetura de Jogos de Carreira e Simulação Dinâmica</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
