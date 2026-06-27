import React, { useState, useMemo } from "react";
import { useTransfer } from "@/contexts/TransferContext";
import { useGame } from "@/contexts/GameContext";
import { teams as allTeams, Player, Team, COUNTRIES, LEAGUES, FOREIGN_PLAYERS } from "@/lib/teams";
import { calculateMarketValue } from "@/lib/playerValuation";

export function MarketScreen() {
  const { transferWindow, offers, rumors, marketStatuses } = useTransfer();
  const { selectedTeam, balance, advanceDay, currentDateStr } = useGame();

  const [activeTab, setActiveTab] = useState<"search" | "rumors" | "offers">("search");

  // Search Filters
  const [filterName, setFilterName] = useState("");
  const [filterPos, setFilterPos] = useState("Todas");
  const [filterNat, setFilterNat] = useState("Qualquer");
  const [filterMinOvr, setFilterMinOvr] = useState<number | "">("");
  const [filterMaxAge, setFilterMaxAge] = useState<number | "">("");
  const [filterMaxValue, setFilterMaxValue] = useState<number | "">("");

  const isWindowOpen = transferWindow.isOpen;
  // fake days left
  const daysLeft = isWindowOpen ? transferWindow.closeDay - transferWindow.openDay : 0; 
  
  const { deductFunds, currentDate, completeInteractiveTransfer, pushNews } = useGame();

  const [negotiatingPlayer, setNegotiatingPlayer] = useState<{player: Player, team: Team, value: number} | null>(null);
  const [negotiationStep, setNegotiationStep] = useState<"club_offer" | "club_counter" | "player_salary" | "success" | "failure">("club_offer");
  const [offerAmount, setOfferAmount] = useState<number>(0);
  const [clubCounterAmount, setClubCounterAmount] = useState<number>(0);
  const [salaryOffer, setSalaryOffer] = useState<number>(0);
  const [yearsOffer, setYearsOffer] = useState<number>(2);
  const [failReason, setFailReason] = useState<string>("");

  const openNegotiation = (item: {player: Player, team: Team, value: number}) => {
    setNegotiatingPlayer(item);
    setOfferAmount(item.value);
    setSalaryOffer(item.player.salary);
    setYearsOffer(3);
    setNegotiationStep("club_offer");
    setFailReason("");
  };

  const handleProposeOffer = () => {
    if (!negotiatingPlayer) return;
    if (offerAmount > balance * 1000) {
      setFailReason(`Você não tem fundos suficientes. Orçamento atual: R$ ${(balance / 1000).toFixed(1)}M`);
      setNegotiationStep("failure");
      return;
    }

    const estValue = negotiatingPlayer.value;
    const ratio = offerAmount / estValue;
    const rand = Math.random();
    
    if (ratio >= 1.2) {
      setNegotiationStep("player_salary");
    } else if (ratio >= 0.9) {
      if (rand < 0.4) {
         setNegotiationStep("player_salary");
      } else if (rand < 0.8) {
         setClubCounterAmount(Math.floor(estValue * (1.05 + Math.random() * 0.15)));
         setNegotiationStep("club_counter");
      } else {
         setFailReason("O clube recusou, acredita que o valor oferecido está abaixo do potencial do jogador.");
         setNegotiationStep("failure");
      }
    } else {
      if (rand < 0.2) {
         setClubCounterAmount(Math.floor(estValue * (1.1 + Math.random() * 0.2)));
         setNegotiationStep("club_counter");
      } else {
         setFailReason("O clube achou sua proposta ofensiva e encerrou as negociações.");
         setNegotiationStep("failure");
      }
    }
  };

  const handleAcceptCounter = () => {
    if (clubCounterAmount > balance * 1000) {
       setFailReason(`Você não tem fundos suficientes para aceitar a contra-oferta. Orçamento atual: R$ ${(balance / 1000).toFixed(1)}M`);
       setNegotiationStep("failure");
       return;
    }
    setOfferAmount(clubCounterAmount);
    setNegotiationStep("player_salary");
  };

  const handleProposeSalary = () => {
    if (!negotiatingPlayer) return;

    const currentSal = negotiatingPlayer.player.salary;
    const expectedSal = currentSal * 1.5;

    const ratio = salaryOffer / expectedSal;
    const rand = Math.random();

    let accepted = false;
    if (ratio >= 1.1) {
       accepted = true;
    } else if (ratio >= 0.9 && rand < 0.7) {
       accepted = true;
    } else if (ratio >= 0.7 && rand < 0.3) {
       accepted = true;
    }

    if (accepted && completeInteractiveTransfer) {
        completeInteractiveTransfer(negotiatingPlayer.player.id, Math.floor(offerAmount / 1000), salaryOffer, yearsOffer);
        setNegotiationStep("success");
    } else {
        setFailReason("O jogador considera que a proposta salarial recebida não atende às suas expectativas.");
        setNegotiationStep("failure");
    }
  };

  const allPlayersObj = useMemo(() => {
    let list: { player: Player, team: Team, value: number, isListed: boolean, nationality: string }[] = [];
    allTeams.forEach(team => {
      // Don't show my own players in the global search necessarily, or distinguish them
      if (team.id === selectedTeam.id) return;
      team.players.forEach(player => {
        const value = calculateMarketValue(player.overall, player.age, 7.0, team.clubLevel);
        const status = marketStatuses[player.id];
        const nationality = player.nationality || "BR";
        list.push({
          player,
          team,
          value,
          isListed: status?.isListedForSale || false,
          nationality
        });
      });
    });
    return list;
  }, [selectedTeam.id, marketStatuses]);

  const filteredPlayers = useMemo(() => {
    return allPlayersObj.filter((item) => {
      if (filterName && !item.player.name.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterPos !== "Todas" && item.player.position !== filterPos) return false;
      if (filterMinOvr !== "" && item.player.overall < filterMinOvr) return false;
      if (filterMaxAge !== "" && item.player.age > filterMaxAge) return false;
      if (filterMaxValue !== "" && item.value > filterMaxValue) return false;
      if (filterNat !== "Qualquer" && item.nationality !== filterNat) return false;
      return true;
    }).sort((a, b) => b.value - a.value).slice(0, 50); // limit to top 50 for performance
  }, [allPlayersObj, filterName, filterPos, filterNat, filterMinOvr, filterMaxAge, filterMaxValue]);

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className={`rounded-xl p-4 border ${isWindowOpen ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
        <h2 className="text-sm font-bold flex items-center justify-between">
          <span className={isWindowOpen ? 'text-green-700' : 'text-red-700'}>
            {isWindowOpen ? '✅ JANELA ABERTA' : '❌ JANELA FECHADA'}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {isWindowOpen ? `${daysLeft} dias restantes` : `Abre na próx temporada`}
          </span>
        </h2>
        <div className="mt-3 flex justify-between items-center text-sm">
          <span className="text-slate-600">Seu Orçamento:</span>
          <span className="font-bold text-slate-900">
            {balance >= 1000000 ? `R$ ${(balance/1000000).toFixed(1)}M` : `R$ ${(balance/1000).toFixed(0)}K`}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("search")}
          className={`flex-1 text-sm font-semibold py-2 rounded-md ${activeTab === 'search' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          🔍 Buscar Jogadores
        </button>
        <button
          onClick={() => setActiveTab("rumors")}
          className={`flex-1 text-sm font-semibold py-2 rounded-md ${activeTab === 'rumors' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          📰 Notícias & Rumores
        </button>
        <button
          onClick={() => setActiveTab("offers")}
          className={`flex-1 text-sm font-semibold py-2 rounded-md ${activeTab === 'offers' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          💼 Minhas Propostas
          {offers.filter(o => o.fromClubId === selectedTeam.id && o.status === 'accepted').length > 0 && (
             <span className="ml-2 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs">
               {offers.filter(o => o.fromClubId === selectedTeam.id && o.status === 'accepted').length}
             </span>
          )}
        </button>
      </div>

      {activeTab === "rumors" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
             <h3 className="text-sm font-bold text-slate-800">Últimas Transferências</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {rumors.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                O mercado está silencioso hoje.
              </div>
            ) : (
              rumors.map((r, i) => (
                <div key={i} className="p-3">
                  <p className="text-xs font-medium text-slate-800">{r.headline}</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">{r.type === 'official' ? 'CONFIRMADO' : 'RUMOR'}</span>
                    <span className="text-[10px] text-slate-400">Dia {r.day}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "offers" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
               <h3 className="text-sm font-bold text-slate-800">Propostas Recebidas</h3>
            </div>
            <div className="divide-y divide-slate-100 p-2">
              {offers.filter(o => o.toClubId === selectedTeam.id && o.status === 'pending').length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhuma proposta recebida no momento.
                </div>
              ) : (
                offers.filter(o => o.toClubId === selectedTeam.id && o.status === 'pending').map(o => {
                  const buyerTeam = allTeams.find(t => t.id === o.fromClubId);
                  const playerToSell = selectedTeam.players.find(p => p.id === o.playerId);
                  
                  return (
                    <div key={o.id} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm mb-2 hover:bg-slate-50 transition">
                      <div className="flex justify-between items-start">
                         <div>
                           <p className="font-bold text-slate-800 text-sm">{playerToSell?.name}</p>
                           <p className="text-xs text-slate-500">{buyerTeam?.name} quer comprar • R$ {(o.fee / 1000000).toFixed(1)}M</p>
                         </div>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => {
                               if (buyerTeam && playerToSell) {
                                 selectedTeam.players = selectedTeam.players.filter(p => p.id !== playerToSell.id);
                                 deductFunds(-o.fee); // Add funds
                                 playerToSell.teamId = buyerTeam.id;
                                 buyerTeam.players.push(playerToSell);
                                 updateOfferStatus(o.id, 'accepted');
                                 alert(`Você vendeu ${playerToSell.name} para o ${buyerTeam.name} por R$ ${(o.fee / 1000000).toFixed(1)}M!`);
                               }
                             }}
                             className="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1 text-xs font-bold"
                           >
                             Aceitar
                           </button>
                           <button 
                             onClick={() => updateOfferStatus(o.id, 'rejected')}
                             className="bg-slate-200 hover:bg-slate-300 text-slate-700 rounded px-3 py-1 text-xs font-bold"
                           >
                             Recusar
                           </button>
                         </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
               <h3 className="text-sm font-bold text-slate-800">Minhas Propostas em Andamento</h3>
            </div>
          <div className="divide-y divide-slate-100 p-2">
            {offers.filter(o => o.fromClubId === selectedTeam.id).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Você não tem nenhuma proposta ativa.
              </div>
            ) : (
              offers.filter(o => o.fromClubId === selectedTeam.id).map(o => {
                const targetTeam = allTeams.find(t => t.id === o.toClubId);
                const targetPlayer = targetTeam?.players.find(p => p.id === o.playerId);
                
                return (
                  <div key={o.id} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm mb-2 hover:bg-slate-50 transition">
                    <div className="flex justify-between items-start">
                       <div>
                         <p className="font-bold text-slate-800 text-sm">{targetPlayer?.name}</p>
                         <p className="text-xs text-slate-500">{targetTeam?.name} • Proposta: R$ {(o.fee / 1000000).toFixed(1)}M</p>
                       </div>
                       <div>
                          {o.status === 'pending' && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Aguardando Resposta</span>}
                          {o.status === 'accepted' && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Aceita</span>}
                          {o.status === 'rejected' && <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Recusada</span>}
                       </div>
                    </div>
                    {o.status === 'accepted' && (
                       <div className="mt-3">
                         <button 
                           onClick={() => {
                             if (balance < o.fee) {
                               alert("Fundos insuficientes para finalizar a transferência!");
                               return;
                             }
                             // Execute transfer
                             deductFunds(o.fee);
                             if (targetTeam && targetPlayer) {
                               // Remove from original
                               targetTeam.players = targetTeam.players.filter(p => p.id !== targetPlayer.id);
                               // Add to selected team
                               selectedTeam.players.push({
                                 ...targetPlayer,
                                 status: 'rotation',
                                 contractYears: 3,
                                 jerseyNumber: Math.floor(Math.random() * 90) + 10
                               });
                               alert(`Transferência de ${targetPlayer.name} concluída com sucesso!`);
                               // Remove from offers
                               updateOfferStatus(o.id, 'rejected'); // Hack to hide it or we could add 'completed' status
                             }
                           }}
                           className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 text-xs font-bold shadow-sm transition"
                         >
                           Pagar e Assinar Contrato
                         </button>
                       </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
        </div>
      )}

      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Filtros de Busca</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text" 
                placeholder="Nome do Jogador" 
                className="col-span-2 border p-2 text-sm rounded-lg w-full"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
              />
              
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Posição</label>
                <select 
                  className="w-full border p-2 text-sm rounded-lg"
                  value={filterPos}
                  onChange={e => setFilterPos(e.target.value)}
                >
                  <option value="Todas">Todas</option>
                  <option value="GK">GK (Goleiro)</option>
                  <option value="CB">CB (Zagueiro)</option>
                  <option value="LB">LB (Lat. Esquerdo)</option>
                  <option value="RB">RB (Lat. Direito)</option>
                  <option value="CM">CM (Meia Central)</option>
                  <option value="CAM">CAM (Meia Ofensivo)</option>
                  <option value="CDM">CDM (Volante)</option>
                  <option value="LW">LW (Ponta Esquerda)</option>
                  <option value="RW">RW (Ponta Direita)</option>
                  <option value="ST">ST (Atacante)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Nacionalidade</label>
                <select 
                  className="w-full border p-2 text-sm rounded-lg"
                  value={filterNat}
                  onChange={e => setFilterNat(e.target.value)}
                >
                  <option value="Qualquer">Qualquer</option>
                  {Object.entries(COUNTRIES)
                    .sort((a,b) => a[1].name.localeCompare(b[1].name))
                    .map(([code, { name, flag }]) => (
                    <option key={code} value={code}>{name} {flag}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Idade Máx</label>
                <input 
                  type="number" 
                  placeholder="Ex: 25" 
                  className="w-full border p-2 text-sm rounded-lg"
                  value={filterMaxAge}
                  onChange={e => setFilterMaxAge(e.target.value ? Number(e.target.value) : "")}
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase">OVR Mínimo</label>
                <input 
                  type="number" 
                  placeholder="Ex: 75" 
                  className="w-full border p-2 text-sm rounded-lg"
                  value={filterMinOvr}
                  onChange={e => setFilterMinOvr(e.target.value ? Number(e.target.value) : "")}
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Valor Máx (R$)</label>
                <select 
                  className="w-full border p-2 text-sm rounded-lg"
                  value={filterMaxValue}
                  onChange={e => setFilterMaxValue(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Sem Limite</option>
                  <option value="1000000">Até 1 Milhão</option>
                  <option value="5000000">Até 5 Milhões</option>
                  <option value="15000000">Até 15 Milhões</option>
                  <option value="50000000">Até 50 Milhões</option>
                  <option value="100000000">Até 100 Milhões</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
               <h3 className="text-sm font-bold text-slate-800">Resultados da Busca</h3>
               <span className="text-xs text-slate-500 font-medium">{filteredPlayers.length} encontrados</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {filteredPlayers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Nenhum jogador encontrado com esses filtros.
                </div>
              ) : (
                filteredPlayers.map((item, i) => (
                  <div key={i} className="p-4 flex flex-col items-center border-b border-slate-100 sm:flex-row space-y-3 sm:space-y-0 text-sm">
                    {/* Player Info */}
                    <div className="flex items-center space-x-3 flex-1 w-full justify-between sm:justify-start">
                      <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs shadow-inner">
                        {item.player.overall}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-slate-900">
                            {COUNTRIES[item.nationality]?.flag || "🏳️"} {item.player.name}
                          </p>
                          {item.isListed && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">LISTADO</span>}
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.player.position} • {item.player.age} anos • {item.team.name}
                        </p>
                      </div>
                    </div>
                    
                    {/* Financials & Action */}
                    <div className="flex space-x-4 items-center justify-between w-full sm:w-auto">
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Valor</span>
                        <span className="font-bold text-green-600">
                          {item.value >= 1000000 ? `R$ ${(item.value / 1000000).toFixed(1)}M` : `R$ ${(item.value / 1000).toFixed(0)}K`}
                        </span>
                      </div>
                      <button 
                        onClick={() => openNegotiation(item)}
                        className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold text-xs shadow hover:bg-blue-700 transition"
                      >
                        Negociar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {negotiatingPlayer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6">
              <h2 className="text-xl font-black text-slate-800 mb-1">
                {negotiationStep === "player_salary" ? "Negociação Salarial" :
                 negotiationStep === "success" ? "Transferência Concluída" : "Fazer Proposta"}
              </h2>
              <p className="text-sm text-slate-500 mb-6 font-medium">
                {negotiationStep === "player_salary" ? `Acertando base salarial com ${negotiatingPlayer.player.name}` :
                 negotiationStep === "success" ? `${negotiatingPlayer.player.name} aceitou sua proposta!` :
                 `Negociando contrato de ${negotiatingPlayer.player.name} com o ${negotiatingPlayer.team.name}`}
              </p>
              
              {negotiationStep === "club_offer" && (
                <div className="space-y-4">
                  <ValueStepper
                     label="Valor da Transferência"
                     value={offerAmount}
                     setValue={setOfferAmount}
                     getStep={(val) => {
                       if (val >= 100000000) return 5000000;
                       if (val >= 50000000) return 2000000;
                       if (val >= 10000000) return 1000000;
                       return 500000;
                     }}
                     formatValue={(v) => v >= 1000000 ? `R$ ${(v / 1000000).toFixed(1)}M` : `R$ ${(v / 1000).toFixed(0)}K`}
                     formatStep={(s) => s >= 1000000 ? `R$ ${(s / 1000000).toFixed(1)}M` : `R$ ${(s / 1000).toFixed(0)}K`}
                     subtitle={`Valor de mercado: R$ ${(negotiatingPlayer.value / 1000000).toFixed(1)}M`}
                  />
                  <ChanceBar ratio={offerAmount / negotiatingPlayer.value} />
                </div>
              )}

              {negotiationStep === "club_counter" && (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm font-medium text-yellow-800">
                      O clube quer mais. Eles fizeram uma contra-oferta de:
                    </p>
                    <p className="text-2xl font-black text-yellow-900 mt-2">
                       R$ {(clubCounterAmount / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>
              )}

              {negotiationStep === "player_salary" && (
                <div className="space-y-5">
                  <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg font-medium">
                    O clube aceitou a proposta de transferência! Agora acerte os detalhes do contrato com o jogador.
                  </div>
                  <ValueStepper
                     label="Salário Mensal"
                     value={salaryOffer}
                     setValue={setSalaryOffer}
                     getStep={(val) => 5}
                     formatValue={(v) => `${v}K / mês`}
                     formatStep={(s) => `${s}K`}
                     subtitle={`Expectativa: ~${Math.floor(negotiatingPlayer.player.salary * 1.5)}K`}
                  />
                  
                  <ValueStepper
                     label="Duração do Contrato"
                     value={yearsOffer}
                     setValue={(v) => setYearsOffer(Math.min(5, Math.max(1, v)))}
                     getStep={(val) => 1}
                     formatValue={(v) => `${v} ano${v > 1 ? 's' : ''}`}
                  />
                  <ChanceBar ratio={salaryOffer / (negotiatingPlayer.player.salary * 1.5)} type="salary" />
                </div>
              )}

              {negotiationStep === "failure" && (
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                    <div className="text-4xl mb-2">❌</div>
                    <p className="text-sm font-bold text-red-800 mb-1">Negociação Encerrada</p>
                    <p className="text-xs font-medium text-red-600">{failReason}</p>
                  </div>
                </div>
              )}

              {negotiationStep === "success" && (
                <div className="space-y-4">
                  <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center">
                    <div className="text-5xl mb-3">🎉</div>
                    <p className="text-lg font-black text-green-800 mb-1">Acordo Fechado!</p>
                    <p className="text-sm font-medium text-green-700">O jogador já se juntou ao elenco e os fundos foram descontados.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end space-x-3">
               {(negotiationStep !== "success" && negotiationStep !== "failure") && (
                 <button 
                   onClick={() => setNegotiatingPlayer(null)}
                   className="px-4 py-2 font-bold text-xs bg-white border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg shadow-sm"
                 >
                   Cancelar
                 </button>
               )}

               {negotiationStep === "club_offer" && (
                 <button 
                   onClick={handleProposeOffer}
                   className="px-4 py-2 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
                 >
                   Enviar Proposta
                 </button>
               )}

               {negotiationStep === "club_counter" && (
                 <button 
                   onClick={handleAcceptCounter}
                   className="px-4 py-2 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
                 >
                   Aceitar R$ {(clubCounterAmount / 1000000).toFixed(1)}M
                 </button>
               )}

               {negotiationStep === "player_salary" && (
                 <button 
                   onClick={handleProposeSalary}
                   className="px-4 py-2 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
                 >
                   Fazer Oferta
                 </button>
               )}

               {(negotiationStep === "success" || negotiationStep === "failure") && (
                 <button 
                   onClick={() => setNegotiatingPlayer(null)}
                   className="px-4 py-2 font-bold text-xs bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow w-full"
                 >
                   Continuar
                 </button>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ValueStepper = ({ value, setValue, getStep, formatValue, label, subtitle, formatStep }: any) => {
  const step = getStep(value);
  return (
    <div className="flex flex-col">
       {label && <label className="text-xs font-bold text-slate-600 uppercase mb-1">{label}</label>}
       <div className="flex items-center space-x-2">
         <button onClick={() => setValue(Math.max(0, value - step))} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-12 h-12 rounded-xl text-xl flex items-center justify-center transition">
            -
         </button>
         <div className="flex-1 bg-slate-50 border-2 border-slate-200 h-12 rounded-xl flex items-center justify-center font-bold text-slate-800">
           {formatValue(value)}
         </div>
         <button onClick={() => setValue(value + step)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-12 h-12 rounded-xl text-xl flex items-center justify-center transition">
            +
         </button>
       </div>
       {(subtitle || formatStep) && (
         <div className="text-xs text-slate-400 mt-2 flex justify-between">
           <span>{subtitle}</span>
           {formatStep && <span className="font-medium text-slate-500">passo: {formatStep(step)}</span>}
         </div>
       )}
    </div>
  )
}

const ChanceBar = ({ ratio, type = 'club' }: { ratio: number, type?: 'club' | 'salary' }) => {
   let color = "bg-green-500";
   let text = "Provável";
   let w = "w-full";
   
   if (ratio < 0.9) {
      color = "bg-red-500"; text = "Improvável"; w = "w-1/3";
   } else if (ratio < 1.1) {
      color = "bg-yellow-500"; text = "Incerto"; w = "w-2/3";
   }

   return (
     <div className="mt-4">
       <div className="flex justify-between text-xs font-bold mb-1">
         <span className="text-slate-500 uppercase">Chance de Aceitação</span>
         <span className={color.replace('bg-', 'text-')}>{text}</span>
       </div>
       <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
         <div className={`h-full ${color} ${w} transition-all duration-300`}></div>
       </div>
     </div>
   )
}

