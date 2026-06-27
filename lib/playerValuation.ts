export function calculateMarketValue(ovr: number, age: number, formRating: number = 7.0, prestige: number = 2): number {
  let baseValue = 0;
  if (ovr >= 90) baseValue = 80000000 + (ovr - 90) * 12000000;
  else if (ovr >= 80) baseValue = 20000000 + (ovr - 80) * 6000000;
  else if (ovr >= 70) baseValue = 5000000 + (ovr - 70) * 1500000;
  else if (ovr >= 60) baseValue = 500000 + (ovr - 60) * 450000;
  else baseValue = 50000 + Math.max(0, ovr - 50) * 45000;

  let ageMultiplier = 1.0;
  if (age <= 20) ageMultiplier = 1.4;
  else if (age <= 25) ageMultiplier = 1.2;
  else if (age <= 29) ageMultiplier = 1.0;
  else if (age <= 33) ageMultiplier = 0.7;
  else ageMultiplier = 0.4;

  let formMultiplier = 1.0;
  if (formRating >= 7.5) formMultiplier = 1.15;
  else if (formRating < 6.5) formMultiplier = 0.85;

  let leagueMultiplier = 1.0 + (prestige * 0.1); 

  return Math.floor(baseValue * ageMultiplier * formMultiplier * leagueMultiplier);
}
