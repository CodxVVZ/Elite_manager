import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { getAllSlots, loadGame, deleteSlot, getLastSlot, loadSettings, formatSaveDate, SaveSlot } from "@/lib/saveSystem";
import { useGame } from "@/contexts/GameContext";
import { teams, loadActivePatchToMemory } from "@/lib/teams";
import { TeamLogo } from "@/components/TeamLogo";
import { importPatch, savePatchToStorage, setActivePatch } from "@/lib/patchSystem";

export default function Home() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const [, navigate] = useLocation();
  const { restoreFromSave } = useGame();
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [showLoad, setShowLoad] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number|null>(null);
  const settings = loadSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setSlots(getAllSlots());
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error attempting to enable fullscreen:", err);
    }
  };

  const handleImportClick = () => {
    fileRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importPatch(file);
      await savePatchToStorage(data);
      await setActivePatch(data);
      await loadActivePatchToMemory();
      alert("Banco de dados importado e ativado com sucesso!");
    } catch (err: any) {
      alert("Erro ao importar banco de dados: " + err.message);
    }
  };

  const lastSlot = getLastSlot();
  const lastSave = slots.find(s => s.id === lastSlot && s.exists);

  async function handleContinue() {
    if (!lastSave) return;
    const data = await loadGame(lastSave.id);
    if (!data) return;
    let team = teams.find(t => t.id === data.teamId);
    if (!team) {
       team = teams.find(t => t.name === data.teamName || t.abbreviation === data.teamAbbr);
       if (team) {
          const oldId = data.teamId;
          data.teamId = team.id;
          if (data.standings) {
             data.standings.forEach((s: any) => { if(s.teamId===oldId) s.teamId=team!.id; });
          }
          if (data.calendarMatches) {
             data.calendarMatches.forEach((m: any) => {
                if(m.homeId===oldId) m.homeId=team!.id;
                if(m.awayId===oldId) m.awayId=team!.id;
             });
          }
       }
    }
    if (!team) return;
    restoreFromSave(team, data);
    navigate("/game");
  }

  async function handleLoadSlot(slot: SaveSlot) {
    const data = await loadGame(slot.id);
    if (!data) return;
    let team = teams.find(t => t.id === data.teamId);
    if (!team) {
       // fallback for legacy IDs
       team = teams.find(t => t.name === data.teamName || t.abbreviation === data.teamAbbr);
       if (team) {
          const oldId = data.teamId;
          data.teamId = team.id;
          if (data.standings) {
             data.standings.forEach((s: any) => { if(s.teamId===oldId) s.teamId=team!.id; });
          }
          if (data.calendarMatches) {
             data.calendarMatches.forEach((m: any) => {
                if(m.homeId===oldId) m.homeId=team!.id;
                if(m.awayId===oldId) m.awayId=team!.id;
             });
          }
       }
    }
    if (!team) return;
    restoreFromSave(team, data);
    navigate("/game");
  }

  async function handleDelete(id: number) {
    await deleteSlot(id);
    setSlots(getAllSlots());
    setConfirmDelete(null);
  }

  const dark = isDarkMode;
  const bg   = dark ? "bg-gray-950" : "bg-white";
  const tx   = dark ? "text-white"  : "text-gray-900";
  const sub  = dark ? "text-gray-500" : "text-gray-400";
  const btn  = dark
    ? "border border-gray-700 text-gray-200 hover:bg-gray-800 active:bg-gray-700"
    : "border border-gray-300 text-gray-800 hover:bg-gray-50 active:bg-gray-100";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${bg} relative`}>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4">
        <div className="flex gap-2">
          <button onClick={toggleDarkMode}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${btn}`}>
            {dark ? "☀️ Claro" : "🌙 Escuro"}
          </button>
          <button onClick={toggleFullscreen}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${btn}`}>
            {isFullscreen ? "🗗 Janela" : "🖵 Tela Cheia"}
          </button>
        </div>
        <span className={`text-xs ${sub}`}>PT</span>
      </div>

      {/* Conteúdo central */}
      <div className="w-full max-w-xs px-6 flex flex-col items-center">

        {/* Logo */}
        <h1 className={`text-4xl font-black tracking-tight mb-8 ${tx}`}>
          ELITE MANAGER
        </h1>

        {/* Card do último save */}
        {lastSave && (
          <button onClick={handleContinue}
            className={`w-full mb-5 rounded-xl border px-4 py-3 text-left transition-colors ${
              dark ? "border-gray-700 bg-gray-900 hover:bg-gray-800" : "border-gray-200 bg-gray-50 hover:bg-gray-100"
            }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex-shrink-0">
                <TeamLogo teamId={lastSave.teamId} fallbackName={lastSave.teamAbbr} />
              </div>
              <div>
                <p className={`text-sm font-bold ${tx}`}>{lastSave.teamName}</p>
                <p className={`text-xs ${sub}`}>
                  Rd {lastSave.round} · Temporada {lastSave.season}
                </p>
                <p className={`text-xs ${sub}`}>{formatSaveDate(lastSave.date, settings.dateFormat)}</p>
              </div>
            </div>
          </button>
        )}

        {/* Botões principais */}
        <div className="w-full space-y-2">
          {lastSave && (
            <button onClick={handleContinue}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${btn}`}>
              Continuar
            </button>
          )}

          <button onClick={() => navigate("/new-game")}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${btn}`}>
            Novo Jogo
          </button>

          <button onClick={() => setShowLoad(s => !s)}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${btn}`}>
            Carregar Jogo
          </button>

          {/* Slots de save */}
          {showLoad && (
            <div className={`rounded-xl border overflow-hidden ${dark?"border-gray-700":"border-gray-200"}`}>
              {slots.map(slot => (
                <div key={slot.id}
                  className={`flex items-center justify-between px-4 py-3 border-b last:border-0 ${dark?"border-gray-700":"border-gray-200"}`}>
                  {slot.exists ? (
                    <>
                      <button onClick={() => handleLoadSlot(slot)} className="flex-1 text-left">
                        <p className={`text-xs font-bold ${tx}`}>{slot.teamName}</p>
                        <p className={`text-xs ${sub}`}>Rd {slot.round} · {formatSaveDate(slot.date, settings.dateFormat)}</p>
                      </button>
                      {confirmDelete === slot.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(slot.id)}
                            className="text-xs text-red-400 px-2 py-1 rounded border border-red-400">Sim</button>
                          <button onClick={() => setConfirmDelete(null)}
                            className={`text-xs px-2 py-1 rounded border ${dark?"border-gray-600 text-gray-400":"border-gray-300 text-gray-500"}`}>Não</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(slot.id)}
                          className={`text-xs ml-2 ${sub} hover:text-red-400`}>🗑</button>
                      )}
                    </>
                  ) : (
                    <p className={`text-xs ${sub}`}>Slot {slot.id} — Vazio</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <button onClick={() => navigate("/editor")}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${btn}`}>
            Gerenciador de Patches
          </button>

          <button onClick={() => navigate("/db-editor")}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${btn}`}>
            Editor de Banco de Dados
          </button>

          <button onClick={handleImportClick}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${btn}`}>
            Importar Database
          </button>

          <button onClick={() => navigate("/settings")}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${btn}`}>
            Configurações
          </button>
        </div>

        <input ref={fileRef} type="file" accept=".emp,.zip,.json" className="hidden" onChange={handleImportFile}/>
      </div>

      {/* Rodapé */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-between px-5">
        <span className={`text-xs ${sub}`}>v0.1.0</span>
        <span className={`text-xs ${sub}`}>© 2026 Elite Manager</span>
      </div>
    </div>
  );
}
