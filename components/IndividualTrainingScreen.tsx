import React, { useState } from 'react';
import { Player } from '@/src/types';
import { PlayerState } from '@/contexts/GameContext';
import { IndividualPlan, PlayerRole, TrainingAttribute, TrainingIntensity } from '@/lib/trainingTypes';

const ROLES_BY_POSITION: Record<string, PlayerRole[]> = {
  GK:  ["Goleiro"],
  CB:  ["Defesa central"],
  RB:  ["Lateral defensivo", "Lateral atacante"],
  LB:  ["Lateral defensivo", "Lateral atacante"],
  CDM: ["Volante"],
  CM:  ["Meia box-to-box", "Meia livre"],
  CAM: ["Meia atacante"],
  RM:  ["Ponta", "Meia atacante"],
  LM:  ["Ponta", "Meia atacante"],
  RW:  ["Ponta", "Falso 9"],
  LW:  ["Ponta", "Falso 9"],
  ST:  ["Centroavante", "Falso 9"],
};

const ATTRIBUTES_BY_ROLE: Record<string, TrainingAttribute[]> = {
  "Goleiro":           ["physical", "defense", "passing"],
  "Defesa central":    ["defense", "physical", "passing"],
  "Lateral defensivo": ["defense", "pace", "physical"],
  "Lateral atacante":  ["pace", "passing", "dribbling"],
  "Volante":           ["defense", "physical", "passing"],
  "Meia box-to-box":   ["passing", "physical", "shooting"],
  "Meia livre":        ["passing", "dribbling", "pace"],
  "Meia atacante":     ["passing", "dribbling", "shooting"],
  "Ponta":             ["pace", "dribbling", "shooting"],
  "Centroavante":      ["shooting", "physical", "pace"],
  "Falso 9":           ["dribbling", "passing", "shooting"],
};

const ATTR_LABEL: Record<string, string> = {
  pace: "Velocidade", shooting: "Finalização", passing: "Passe",
  dribbling: "Drible", defense: "Defesa", physical: "Físico",
};

interface IndividualTrainingScreenProps {
  dark: boolean;
  tx: string;
  sub: string;
  card: string;
  div: string;
  players: Player[];
  playerStates: Record<number, PlayerState>;
  plans: Record<number, IndividualPlan>;
  onUpdatePlan: (playerId: number, plan: Partial<IndividualPlan>) => void;
}

export function IndividualTrainingScreen({
  dark,
  tx,
  sub,
  card,
  div,
  players,
  playerStates,
  plans,
  onUpdatePlan
}: IndividualTrainingScreenProps) {
  const [filter, setFilter] = useState<'Todos' | 'GK' | 'Def' | 'Meio' | 'Ata'>('Todos');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const availablePlayers = players.filter(p => {
    const s = playerStates[p.id];
    return !(s && s.injuryWeeks > 0);
  });

  const filteredPlayers = availablePlayers.filter((p) => {
    if (filter === 'Todos') return true;
    if (filter === 'GK' && p.position === 'GK') return true;
    if (filter === 'Def' && ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(p.position)) return true;
    if (filter === 'Meio' && ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p.position)) return true;
    if (filter === 'Ata' && ['RW', 'LW', 'ST', 'CF'].includes(p.position)) return true;
    return false;
  });

  const getConditionColor = (fatigue: number) => {
    if (fatigue >= 70) return 'bg-green-500';
    if (fatigue >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const calculateGrade = (p: Player) => {
    const gap = p.potential - p.overall;
    if (gap >= 12) return { grade: 'A', color: 'text-green-500 border-green-500' };
    if (gap >= 8) return { grade: 'B', color: 'text-green-400 border-green-400' };
    if (gap >= 4) return { grade: 'C', color: 'text-yellow-500 border-yellow-500' };
    if (gap >= 1) return { grade: 'D', color: 'text-orange-500 border-orange-500' };
    return { grade: 'E', color: 'text-red-500 border-red-500' };
  };

  const calculateProgress = (p: Player) => {
    const gap = Math.max(0, p.potential - p.overall);
    if (gap === 0) return 100;
    // Just a visual representation: 
    // Usually a higher gap means more room to grow. Let's make progress bar represent how close to potential.
    // Progress = (overall - 50) / (potential - 50) roughly
    const base = Math.min(50, p.overall - 10);
    const progress = ((p.overall - base) / (p.potential - base)) * 100;
    return Math.max(10, Math.min(100, progress));
  };

  const getProgressColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-green-400';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  const handleRowClick = (playerId: number) => {
    setExpandedId(prev => (prev === playerId ? null : playerId));
  };

  const getIntensityText = (intensity: TrainingIntensity) => {
    switch(intensity) {
      case 'low': return 'Leve (Menos fadiga, baixo impacto)';
      case 'medium': return 'Médio (Equilíbrio entre evolução e cansaço)';
      case 'high': return 'Intenso (Evolução rápida, alto risco de fadiga)';
    }
  };

  const filterTabs = ['Todos', 'GK', 'Def', 'Meio', 'Ata'] as const;

  return (
    <div className={`w-full max-w-[430px] mx-auto flex flex-col pt-2`}>
      
      {/* Filtros em linha */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
        {filterTabs.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border whitespace-nowrap transition-colors
              ${filter === t 
                ? (dark ? 'bg-green-600 border-green-500 text-white' : 'bg-green-500 border-green-600 text-white') 
                : (dark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600')}
            `}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={`mt-2 ${card} rounded-xl overflow-hidden text-xs sm:text-sm`}>
        {/* Header da Tabela */}
        <div className={`flex items-center px-3 py-2 font-semibold ${sub} ${dark ? 'bg-black/20' : 'bg-gray-50'}`}>
          <div className="w-4 flex-shrink-0"></div>
          <div className="flex-1 min-w-[70px]">Nome</div>
          <div className="flex-1 ml-2">Função</div>
          <div className="flex-1 ml-2">Atributo</div>
          <div className="w-10 text-center">Grau</div>
          <div className="w-16 text-center">Evol.</div>
        </div>

        {/* Lista */}
        <div className={`flex flex-col divide-y ${div}`}>
          {filteredPlayers.map(p => {
            const plan = plans[p.id] || { role: ROLES_BY_POSITION[p.position]?.[0] || 'Meia box-to-box', attribute: 'passing', intensity: 'medium' };
            const fatigue = playerStates[p.id]?.fatigue ?? 100;
            const isExpanded = expandedId === p.id;
            const { grade, color: gradeColor } = calculateGrade(p);
            const progress = calculateProgress(p);

            return (
              <div key={p.id} className="flex flex-col">
                <div 
                  onClick={() => handleRowClick(p.id)}
                  className={`flex items-center px-3 py-2 cursor-pointer transition-colors ${dark ? 'hover:bg-white/5' : 'hover:bg-black/5'} ${isExpanded ? (dark ? 'bg-white/5' : 'bg-black/5') : ''}`}
                >
                  {/* Indicator */}
                  <div className="w-4 flex-shrink-0 flex items-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${getConditionColor(fatigue)}`} />
                  </div>
                  {/* Name */}
                  <div className={`flex-1 min-w-[70px] flex flex-col justify-center`}>
                    <span className={`font-semibold truncate ${tx}`}>{p.name}</span>
                    <span className={`text-[10px] uppercase opacity-70`}>{p.position} · {p.overall} OVR</span>
                  </div>
                  {/* Função */}
                  <div className="flex-1 ml-2 text-[11px] sm:text-xs truncate text-gray-500">
                    {plan.role.split(' ')[0]} {/* Pega primeira palavra */}
                  </div>
                  {/* Atributo */}
                  <div className="flex-1 ml-2 text-[11px] sm:text-xs truncate text-gray-500">
                    {ATTR_LABEL[plan.attribute]}
                  </div>
                  {/* Grau */}
                  <div className="w-10 flex justify-center items-center">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${gradeColor}`}>
                      {grade}
                    </div>
                  </div>
                  {/* Evolução */}
                  <div className="w-16 flex items-center px-1">
                    <div className={`w-full h-2 rounded-full ${dark ? 'bg-white/10' : 'bg-black/10'} overflow-hidden`}>
                      <div className={`h-full ${getProgressColor(grade)}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Expanded Panel */}
                {isExpanded && (
                  <div className={`px-3 py-3 border-t ${div} ${dark ? 'bg-black/30' : 'bg-gray-100/50'}`}>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className={`block text-[10px] uppercase mb-1 ${sub}`}>Função</label>
                        <select
                          className={`w-full text-xs rounded p-1.5 border outline-none ${card} ${tx} ${div}`}
                          value={plan.role}
                          onChange={(e) => onUpdatePlan(p.id, { role: e.target.value as PlayerRole, attribute: ATTRIBUTES_BY_ROLE[e.target.value][0] })}
                        >
                          {(ROLES_BY_POSITION[p.position] || Object.keys(ATTRIBUTES_BY_ROLE)).map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-[10px] uppercase mb-1 ${sub}`}>Intensidade</label>
                        <select
                          className={`w-full text-xs rounded p-1.5 border outline-none ${card} ${tx} ${div}`}
                          value={plan.intensity}
                          onChange={(e) => onUpdatePlan(p.id, { intensity: e.target.value as TrainingIntensity })}
                        >
                          <option value="low">Leve</option>
                          <option value="medium">Média</option>
                          <option value="high">Intensa</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className={`block text-[10px] uppercase mb-1 ${sub}`}>Foco Específico</label>
                        <select
                          className={`w-full text-xs rounded p-1.5 border outline-none ${card} ${tx} ${div}`}
                          value={plan.attribute}
                          onChange={(e) => onUpdatePlan(p.id, { attribute: e.target.value as TrainingAttribute })}
                        >
                          {(ATTRIBUTES_BY_ROLE[plan.role] || []).map(a => (
                            <option key={a} value={a}>{ATTR_LABEL[a]}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className={`text-[10px] italic mb-3 text-center ${sub}`}>
                      {getIntensityText(plan.intensity as TrainingIntensity)}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      {(["pace", "shooting", "passing", "dribbling", "defense", "physical"] as TrainingAttribute[]).map(attr => (
                        <div 
                          key={attr} 
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border ${plan.attribute === attr ? (dark ? 'bg-blue-900/40 border-blue-500' : 'bg-blue-100 border-blue-500') : (dark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-200')}`}
                        >
                          <span className={`text-[10px] uppercase ${sub}`}>{ATTR_LABEL[attr].substring(0, 3)}</span>
                          <span className={`font-bold ${tx}`}>{p[attr]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredPlayers.length === 0 && (
            <div className={`p-4 text-center ${sub}`}>
              Nenhum jogador nesta categoria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
