import React, { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { getNextMatch } from '../lib/calendar';

export function UCLScreen() {
  const { uclTeams, uclFixtures, uclStandings, uclStage, userInUCL, selectedTeam, currentDate, advanceDay, calendarMatches, settings } = useGame();
  
  const dark = settings?.darkMode ?? true;
  const tx = dark ? "text-white" : "text-slate-900";
  const sub = dark ? "text-slate-400" : "text-slate-500";
  const div = dark ? "divide-white/5" : "divide-black/5";
  const card = dark ? "bg-white/5" : "bg-white border border-slate-200 shadow-sm";

  const nextUclMatch = useMemo(() => {
    if (!selectedTeam || !userInUCL) return null;
    return getNextMatch(calendarMatches, selectedTeam.id, currentDate, 'UCL');
  }, [calendarMatches, selectedTeam, currentDate, userInUCL]);

  return (
    <div className={`flex flex-col w-full mx-auto space-y-4 ${dark ? 'text-white' : 'text-slate-900'}`}>
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className={`font-bold text-lg ${tx}`}>UEFA Champions League</h2>
          <p className={`text-sm ${sub}`}>Fase de Liga</p>
        </div>
      </div>

      {userInUCL && nextUclMatch && (
        <div className={`${card} rounded-xl p-4`}>
          <p className={`text-xs font-semibold mb-2 ${sub}`}>Próximo Jogo na UCL - Rodada {nextUclMatch.round}</p>
          <div className="flex justify-between items-center">
            <div className="text-sm font-bold">
              {nextUclMatch.homeId === selectedTeam?.id ? 'Casa' : 'Fora'} vs {nextUclMatch.homeId === selectedTeam?.id ? nextUclMatch.awayId : nextUclMatch.homeId}
            </div>
            <div className={`text-xs ${sub}`}>
              {nextUclMatch.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </div>
          </div>
        </div>
      )}

      <div className={`${card} rounded-xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-left border-collapse text-xs md:text-sm`}>
            <thead>
              <tr className={`${dark ? 'bg-white/10' : 'bg-slate-100'} ${sub}`}>
                <th className="p-2 w-8 text-center font-semibold">Pos</th>
                <th className="p-2 font-semibold">Time</th>
                <th className="p-2 text-center font-semibold text-slate-500">PJ</th>
                <th className="p-2 text-center font-semibold text-slate-500">V</th>
                <th className="p-2 text-center font-semibold text-slate-500">E</th>
                <th className="p-2 text-center font-semibold text-slate-500">D</th>
                <th className="p-2 text-center font-semibold text-slate-500">GP</th>
                <th className="p-2 text-center font-semibold text-slate-500">GC</th>
                <th className="p-2 text-center font-bold">Pts</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${div}`}>
              {uclStandings.map((row, idx) => {
                const pos = idx + 1;
                let borderClass = '';
                if (pos === 8) borderClass = 'border-b-2 border-green-500';
                else if (pos === 24) borderClass = 'border-b-2 border-yellow-500';
                
                return (
                  <tr key={row.teamId} className={`${borderClass} ${row.teamId === selectedTeam?.id ? (dark ? 'bg-blue-900/30 font-bold' : 'bg-blue-50 font-bold') : ''}`}>
                    <td className="p-2 text-center text-slate-400 font-medium">{pos}º</td>
                    <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis w-24 sm:w-32">{row.teamName}</td>
                    <td className="p-2 text-center text-slate-500">{row.played}</td>
                    <td className="p-2 text-center text-slate-500">{row.won}</td>
                    <td className="p-2 text-center text-slate-500">{row.drawn}</td>
                    <td className="p-2 text-center text-slate-500">{row.lost}</td>
                    <td className="p-2 text-center text-slate-500">{row.goalsFor}</td>
                    <td className="p-2 text-center text-slate-500">{row.goalsAgainst}</td>
                    <td className="p-2 text-center font-bold">{row.points}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
