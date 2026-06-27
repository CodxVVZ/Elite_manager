import { useState } from "react";
import { Button } from "@/components/ui/button";
import { teams } from "@/lib/teams";
import { useLocation } from "wouter";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { useGame } from "@/contexts/GameContext";
import { teamLogos } from "@/lib/teamLogos";
import { TeamLogo } from "@/components/TeamLogo";

type Language = "pt" | "en";

const translations = {
  pt: {
    title: "Escolha seu Time",
    selectTeam: "Selecione um time para começar",
    start: "Começar",
    back: "Voltar",
    season: "Temporada 2026",
  },
  en: {
    title: "Choose Your Team",
    selectTeam: "Select a team to start",
    start: "Start",
    back: "Back",
    season: "Season 2026",
  },
};

export default function NewGame() {
  const [language, setLanguage] = useState<Language>("pt");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { setSelectedTeam } = useGame();
  const t = translations[language];

  const selectedTeam = teams.find((team) => team.id === selectedTeamId);

  const handleStart = () => {
    if (selectedTeam) {
      setSelectedTeam(selectedTeam);
      navigate("/game");
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${
      isDarkMode ? "bg-gray-900" : "bg-white"
    }`}>
      {/* Dark Mode Toggle */}
      <div className="absolute top-6 left-6">
        <button
          onClick={toggleDarkMode}
          className={`px-4 py-2 rounded border font-medium transition-colors ${
            isDarkMode
              ? "bg-white text-gray-900 border-white hover:bg-gray-100"
              : "bg-gray-900 text-white border-gray-900 hover:bg-black"
          }`}
        >
          {isDarkMode ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Language Selector */}
      <div className="absolute top-6 right-6 flex gap-2 z-50">
        <button
          onClick={() => setLanguage("pt")}
          className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${
            language === "pt"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-black hover:bg-gray-100"
          }`}
        >
          PT
        </button>
        <button
          onClick={() => setLanguage("en")}
          className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${
            language === "en"
              ? "bg-black text-white border-black"
              : "bg-white text-black border-black hover:bg-gray-100"
          }`}
        >
          EN
        </button>
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6">
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="border-black text-black hover:bg-black hover:text-white"
        >
          {t.back}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 p-8">
        {/* Teams List */}
        <div className="flex-1 overflow-y-auto">
          <h1 className={`text-4xl font-bold mb-6 ${
            isDarkMode ? "text-white" : "text-black"
          }`}>{t.title}</h1>
          <p className={`mb-6 ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}>{t.selectTeam}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
            className={`p-4 rounded border-2 transition-all text-center flex flex-col items-center ${
              selectedTeamId === team.id
                ? isDarkMode
                  ? "border-white bg-white text-gray-900"
                  : "border-black bg-black text-white"
                : isDarkMode
                ? "border-gray-600 hover:border-white text-white"
                : "border-gray-300 hover:border-black text-black"
            }`}
              >
                <div className="w-12 h-12 mb-2">
                  <TeamLogo teamId={team.id} fallbackName={team.name} />
                </div>
                <div className="font-bold text-lg">{team.abbreviation}</div>
                <div className="text-sm">{team.name}</div>
                <div className={`text-xs mt-1 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}>{team.city}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Team Details */}
        {selectedTeam && (
          <div className={`w-full lg:w-80 p-6 rounded-lg border h-fit ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-gray-50 border-gray-200"
          }`}>
            <h2 className={`text-2xl font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-black"
            }`}>{selectedTeam.name}</h2>
            <p className={`mb-4 ${
              isDarkMode ? "text-gray-300" : "text-gray-600"
            }`}>{selectedTeam.city}</p>
            <p className={`text-sm mb-6 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}>{t.season}</p>

            <div className="mb-6">
              <h3 className={`font-bold mb-3 ${
                isDarkMode ? "text-white" : "text-black"
              }`}>Elenco (25 jogadores)</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {selectedTeam.players.slice(0, 11).map((player) => (
                  <div key={player.id} className={`text-sm flex justify-between ${
                    isDarkMode ? "text-gray-300" : "text-black"
                  }`}>
                    <span>{player.name}</span>
                    <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>{player.position}</span>
                  </div>
                ))}
                <div className={`text-xs pt-2 border-t ${
                  isDarkMode ? "text-gray-400 border-gray-600" : "text-gray-500 border-gray-300"
                }`}>
                  +{selectedTeam.players.length - 11} mais jogadores
                </div>
              </div>
            </div>

            <Button
              onClick={handleStart}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              {t.start}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
