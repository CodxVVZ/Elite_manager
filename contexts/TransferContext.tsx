import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { TransferWindow, TransferOffer, PlayerMarketStatus } from "@/lib/transferTypes";
import { useGame } from "./GameContext";
import { Player, Team } from "@/lib/teams";
import { generateRumors, runAiMarketCycle } from "@/lib/aiMarket";
import { calculateMarketValue } from "@/lib/playerValuation";

interface TransferContextType {
  transferWindow: TransferWindow;
  offers: TransferOffer[];
  marketStatuses: Record<number, PlayerMarketStatus>;
  rumors: any[];
  addOffer: (offer: TransferOffer) => void;
  updateOfferStatus: (id: string, status: TransferOffer["status"]) => void;
  listPlayer: (playerId: number, askingPrice: number) => void;
  unlistPlayer: (playerId: number) => void;
  advanceTransferDay: (currentDate: Date, season: number, currentDayNumber: number, allTeams: Team[], userTeamId: number) => void;
}

const TransferContext = createContext<TransferContextType | undefined>(undefined);

export const TransferProvider = ({ children }: { children: ReactNode }) => {
  const [transferWindow, setTransferWindow] = useState<TransferWindow>({
    isOpen: true,
    openDay: 0,
    closeDay: 60,
    season: 2026,
    windowType: 'summer',
    label: 'Janela de Verão 2026'
  });
  
  const [offers, setOffers] = useState<TransferOffer[]>([]);
  const [marketStatuses, setMarketStatuses] = useState<Record<number, PlayerMarketStatus>>({});
  const [rumors, setRumors] = useState<any[]>([]);

  const addOffer = useCallback((offer: TransferOffer) => {
    setOffers(prev => [...prev, offer]);
  }, []);

  const updateOfferStatus = useCallback((id: string, status: TransferOffer["status"]) => {
    setOffers(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }, []);

  const listPlayer = useCallback((playerId: number, askingPrice: number) => {
    setMarketStatuses(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || { playerId, isAvailableForLoan: false, interestedClubs: [], marketValue: 0 }),
        isListedForSale: true,
        askingPrice
      }
    }));
  }, []);

  const unlistPlayer = useCallback((playerId: number) => {
    setMarketStatuses(prev => ({
      ...prev,
      [playerId]: {
        ...(prev[playerId] || { playerId, isAvailableForLoan: false, interestedClubs: [], marketValue: 0, askingPrice: 0 }),
        isListedForSale: false,
      }
    }));
  }, []);

  const advanceTransferDay = useCallback((currentDate: Date, season: number, currentDayNumber: number, allTeams: Team[], userTeamId: number) => {
    // Dynamic transfer window logic
    const isSummer = currentDayNumber >= 1 && currentDayNumber <= 60;
    const isWinter = currentDayNumber >= 180 && currentDayNumber <= 210;
    const shouldBeOpen = isSummer || isWinter;

    if (transferWindow.isOpen !== shouldBeOpen) {
       setTransferWindow(prev => ({
          ...prev,
          isOpen: shouldBeOpen,
          windowType: isSummer ? 'summer' : 'winter',
          label: isSummer ? `Janela de Verão ${season}` : (isWinter ? `Janela de Inverno ${season}` : 'Fechada'),
          season
       }));
    }

    if (!shouldBeOpen) {
       // Window closed, clear pending rumors and skip market cycle
       return;
    }

    // Generate daily rumors
    if (currentDayNumber % 2 === 0) {
      const newRumors = generateRumors(currentDayNumber, allTeams, marketStatuses, true);
      if (newRumors.length > 0) {
        setRumors(prev => [...newRumors, ...prev].slice(0, 30));
      }
    }

    // AI Market Cycle running every 3 days
    if (currentDayNumber % 3 === 0) {
       allTeams.forEach(t => {
          if (t.id !== userTeamId) {
             const actions = runAiMarketCycle(t, t.players, currentDate.getTime(), true, allTeams);
             
             // Process newly generated offers
             if (actions.offers.length > 0) {
                setOffers(prev => [...prev, ...actions.offers]);
             }
             
             // Process market listings
             if (actions.listings.length > 0) {
                setMarketStatuses(prev => {
                   const next = { ...prev };
                   actions.listings.forEach(l => {
                      next[l.playerId] = {
                         ...(next[l.playerId] || { playerId: l.playerId, isAvailableForLoan: false, interestedClubs: [], marketValue: 0 }),
                         isListedForSale: true,
                         askingPrice: l.askingPrice
                      };
                   });
                   return next;
                });
             }
          }
       });
    }

    // Process pending offers
    setOffers(prevOffers => {
       const updatedOffers = [...prevOffers];
       let changed = false;

       updatedOffers.forEach(offer => {
          if (offer.status === 'pending') {
             // check if it expired
             if (currentDate.getTime() >= offer.expiryDay) {
                 offer.status = 'rejected';
                 changed = true;
                 return;
             }

             // If it's a buy offer from the human player to the AI
             if (offer.type === 'buy' && !offer.aiGenerated) {
                 const targetTeam = allTeams.find(t => t.id === offer.toClubId);
                 const targetPlayer = targetTeam?.players.find(p => p.id === offer.playerId);

                 if (targetTeam && targetPlayer) {
                     const estValue = calculateMarketValue(targetPlayer.overall, targetPlayer.age, 7.0, targetTeam.clubLevel);
                     // Very simple logic: if offered 95% or more of market value, they accept
                     if (offer.fee >= estValue * 0.95) {
                         offer.status = 'accepted';
                     } else {
                         offer.status = 'rejected';
                     }
                     changed = true;
                 }
             }

             // AI to AI Offer: Auto-accept logic and immediate transfer processing
             if (offer.aiGenerated && offer.fromClubId !== userTeamId && offer.toClubId !== userTeamId) {
                // If it's an AI to AI offer, it's accepted automatically if fee is good
                offer.status = 'accepted';
                changed = true;

                // Process the transfer behind the scenes
                const fromTeam = allTeams.find(t => t.id === offer.toClubId); // wait, if A buys from B, toClubId is seller(B)?
                // Yes: if type = 'buy', fromClubId = A (buyer), toClubId = B (seller). But the user prompt says:
                // "type: 'sell', fromClubId sendo o time da IA, toClubId sendo o time do usuário". 
                // Ah, the user considers "fromClubId" = creator of the offer. If AI wants to buy my player, AI creates offer with type='buy', fromClubId=AI, toClubId=User.
                const buyerId = offer.fromClubId;
                const sellerId = offer.toClubId;
                
                const buyerTeam = allTeams.find(t => t.id === buyerId);
                const sellerTeam = allTeams.find(t => t.id === sellerId);
                const targetPlayer = sellerTeam?.players.find(p => p.id === offer.playerId);

                if (buyerTeam && sellerTeam && targetPlayer) {
                   sellerTeam.players = sellerTeam.players.filter(p => p.id !== targetPlayer.id);
                   sellerTeam.balance = (sellerTeam.balance || 100000) + offer.fee;
                   targetPlayer.teamId = buyerTeam.id;
                   buyerTeam.players.push(targetPlayer);
                   buyerTeam.balance = (buyerTeam.balance || 100000) - offer.fee;
                }
             }
          }
       });

       return changed ? updatedOffers : prevOffers;
    });
  }, [transferWindow.isOpen, offers, marketStatuses]);

  const contextValue = React.useMemo(() => ({
      transferWindow,
      offers,
      marketStatuses,
      rumors,
      addOffer,
      updateOfferStatus,
      listPlayer,
      unlistPlayer,
      advanceTransferDay
  }), [transferWindow, offers, marketStatuses, rumors, addOffer, updateOfferStatus, listPlayer, unlistPlayer, advanceTransferDay]);

  return (
    <TransferContext.Provider value={contextValue}>
      {children}
    </TransferContext.Provider>
  );
};

export const useTransfer = () => {
  const context = useContext(TransferContext);
  if (!context) throw new Error("useTransfer must be used within TransferProvider");
  return context;
};
