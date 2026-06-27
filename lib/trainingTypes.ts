export type PlayerRole =
  | "Goleiro" | "Defesa central" | "Lateral defensivo" | "Lateral atacante"
  | "Volante" | "Meia box-to-box" | "Meia livre" | "Meia atacante"
  | "Ponta" | "Centroavante" | "Falso 9";

export type TrainingAttribute =
  | "pace" | "shooting" | "passing" | "dribbling" | "defense" | "physical";

export type TrainingIntensity = "low" | "medium" | "high";

export interface IndividualPlan {
  playerId: number;
  role: PlayerRole;
  attribute: TrainingAttribute;
  intensity: TrainingIntensity;
}
