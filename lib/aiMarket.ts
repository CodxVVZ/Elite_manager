import { TransferOffer, PlayerMarketStatus, TransferWindow } from "./transferTypes";
import { Player, Team, teams as allTeams } from "./teams";
import { calculateMarketValue } from "./playerValuation";
import { analyzeSquad, SQUAD_SIZE_IDEAL } from "./squadAnalyzer";

export interface AiMarketActions {
  offers: TransferOffer[];
  listings: { playerId: number, askingPrice: number }[];
}

export function runAiMarketCycle(club: Team, players: Player[], currentDay: number, isWindowOpen: boolean, allGameTeams: Team[] = allTeams): AiMarketActions {
  const diagnosis = analyzeSquad(players, club.id, currentDay);
  const actions: AiMarketActions = { offers: [], listings: [] };

  if (diagnosis.overallHealth === 'healthy' && !isWindowOpen) return actions;

  for (const issue of diagnosis.issues) {
    if (issue.type === 'MISSING_POSITION' || issue.type === 'ATTACK_VOID') {
      const offer = searchAndBid(club, issue.position || 'ST', 'urgent', currentDay, allGameTeams);
      if (offer) actions.offers.push(offer);
    }

    if (issue.type === 'EXCESS_POSITION' && issue.affectedPlayerIds) {
      for (const pid of issue.affectedPlayerIds) {
        listForSaleOrLoan(pid, club, players, actions);
      }
    }

    if (issue.type === 'SHORTAGE_POSITION') {
      const offer = searchAndBid(club, issue.position || 'CB', 'normal', currentDay, allGameTeams);
      if (offer) actions.offers.push(offer);
    }

    if (issue.type === 'SQUAD_TOO_LARGE') {
      listExcessPlayers(club, players, diagnosis.totalPlayers - SQUAD_SIZE_IDEAL, actions);
    }
  }
  
  return actions;
}

function searchAndBid(club: Team, position: string, urgency: 'urgent' | 'normal', currentDay: number, allGameTeams: Team[]): TransferOffer | null {
  const candidates: {player: Player, club: Team}[] = [];
  allGameTeams.forEach(t => {
     if (t.id === club.id) return;
     t.players.forEach(p => {
        if (p.position === position) {
           candidates.push({player: p, club: t});
        }
     });
  });

  if (candidates.length === 0) return null;

  const minOvr = club.clubLevel > 4 ? 75 : club.clubLevel > 2 ? 65 : 55;
  const valid = candidates.filter(c => c.player.overall >= minOvr);
  
  if (valid.length === 0) return null;
  
  const target = valid[Math.floor(Math.random() * valid.length)];
  const marketVal = calculateMarketValue(target.player.overall, target.player.age, 7.0, target.club.clubLevel);
  const fee = urgency === 'urgent' ? marketVal * 1.2 : marketVal * 1.05;

  return {
    id: `offer_${Date.now()}_${Math.random()}`,
    type: 'sell', // User's requested view. 'sell' means from human perspective it's an offer to sell? Wait.
    // Let's use 'buy' to mean AI wants to buy. But human receives 'sell' offers?
    // Actually, type 'buy' means I want to buy. 'sell' means I want to sell.
    // the user requested: "Se sim, gera um TransferOffer real com type: 'sell', fromClubId sendo o time da IA, toClubId sendo o time do usuário".
    // Wait, if AI wants to buy my player, the offer is coming FROM AI TO ME.
    // Let's just use 'buy' for now, or match standard: "type: 'buy'". We'll see how MarketScreen handles it.
    status: 'pending',
    playerId: target.player.id,
    fromClubId: club.id,
    toClubId: target.club.id,
    fee: Math.floor(fee),
    offerDay: currentDay,
    expiryDay: currentDay + 7,
    aiGenerated: true,
    negotiationRound: 1
  };
}

function listForSaleOrLoan(playerId: number, club: Team, players: Player[], actions: AiMarketActions) {
  const p = players.find(x => x?.id === playerId);
  if (!p) return;
  const val = calculateMarketValue(p.overall, p.age, 7.0, club.clubLevel);
  actions.listings.push({ playerId, askingPrice: Math.floor(val * 0.8) });
}

function listExcessPlayers(club: Team, players: Player[], amount: number, actions: AiMarketActions) {
  const sorted = [...players].sort((a,b) => a.overall - b.overall);
  for (let i = 0; i < amount && i < sorted.length; i++) {
     listForSaleOrLoan(sorted[i].id, club, players, actions);
  }
}


export function generateRumors(
  currentDay: number,
  teams: Team[],
  marketStatuses: Record<number, PlayerMarketStatus>,
  isWindowOpen: boolean
) {
  if (!isWindowOpen) return [];

  const rumors: any[] = [];
  const chance = Math.random();

  if (chance > 0.4) {
    // Pick a random team and a random star player from another team
    const teamA = teams[Math.floor(Math.random() * teams.length)];
    let teamB = teams[Math.floor(Math.random() * teams.length)];
    while (teamB.id === teamA.id) {
      teamB = teams[Math.floor(Math.random() * teams.length)];
    }

    const stars = teamB.players.filter(p => p.overall >= 75);
    if (stars.length > 0) {
      const target = stars[Math.floor(Math.random() * stars.length)];
      const marketVal = calculateMarketValue(target.overall, target.age);
      const conf = Math.floor(Math.random() * 100);

      let text = "";
      if (conf < 40) {
        text = `${teamA.name} monitora a situação de ${target.name}, do ${teamB.name}, diz jornal.`;
      } else if (conf < 70) {
        text = `${teamA.name} prepara oferta por ${target.name}.`;
      } else {
        text = `BOMBA: ${teamA.name} avança nas negociações por ${target.name}! Valores rondam R$ ${(marketVal / 1000000).toFixed(1)}M.`;
      }

      rumors.push({
        day: currentDay,
        headline: text,
        type: 'rumor',
        confidence: conf,
        playerId: target.id,
        fromClub: teamB.name,
        toClub: teamA.name
      });
    }
  }

  return rumors;
}
