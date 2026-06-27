export interface TransferWindow {
  isOpen: boolean;
  openDay: number;
  closeDay: number;
  season: number;
  windowType: 'summer' | 'winter';
  label: string;
}

export interface PlayerMarketStatus {
  playerId: number;
  isListedForSale: boolean;
  askingPrice?: number;
  isAvailableForLoan: boolean;
  loanAskingFee?: number;
  interestedClubs: number[];
  marketValue: number;
}

export interface TransferOffer {
  id: string;
  type: 'buy' | 'sell' | 'loan_out' | 'loan_in';
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  playerId: number;
  fromClubId: number;
  toClubId: number;
  fee: number;
  loanDuration?: number;
  loanFee?: number;
  wageContribution?: number;
  offerDay: number;
  expiryDay: number;
  aiGenerated: boolean;
  negotiationRound: number;
  counterOffer?: number;
}

export type ClubStrategy = 
  | 'big_spender'
  | 'selling_club'
  | 'loan_heavy'
  | 'youth_developer'
  | 'balanced';

export interface ClubTransferProfile {
  clubId: number;
  strategy: ClubStrategy;
  budget: number;
  maxFeeWilling: number;
  preferredAgeRange: [number, number];
  preferredPositions: string[];
  willingToSell: number[];
  loanSlots: number;
}
