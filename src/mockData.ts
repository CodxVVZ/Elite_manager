import { Player, Team, League, PlayerPersonality, PlayerStatus, ClubLevel } from "./types";

// Seeded RNG implementation matching the mathematical attribute formula
export function createRNG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function attrsByPos(pos: string, ovr: number, rng: () => number) {
  const ri = (a: number, b: number) => Math.floor(rng() * (b - a + 1)) + a;
  const sc = (base: number, bonus: number) => Math.min(99, Math.round(base * (ovr / 75) + ri(-3, 3) + bonus));

  switch (pos) {
    case 'GK':  return { pace: ri(40, 60), shooting: ri(20, 40), passing: ri(40, 65), dribbling: ri(30, 55), defense: sc(75, 10), physical: sc(70, 5) };
    case 'CB':  return { pace: ri(50, 70), shooting: ri(25, 50), passing: ri(50, 68), dribbling: ri(35, 58), defense: sc(78, 12), physical: sc(72, 8) };
    case 'LB':
    case 'RB':  return { pace: sc(70, 8),  shooting: ri(40, 62), passing: sc(65, 5),  dribbling: ri(50, 70), defense: sc(70, 8),  physical: sc(68, 5) };
    case 'CDM': return { pace: ri(55, 72), shooting: ri(40, 62), passing: sc(68, 8),  dribbling: ri(50, 70), defense: sc(72, 10), physical: sc(72, 8) };
    case 'CM':  return { pace: ri(58, 75), shooting: ri(50, 70), passing: sc(72, 10), dribbling: sc(65, 5),  defense: ri(45, 68), physical: sc(65, 3) };
    case 'CAM': return { pace: ri(62, 80), shooting: sc(68, 8),  passing: sc(74, 10), dribbling: sc(74, 12), defense: ri(30, 55), physical: ri(50, 68) };
    case 'LM':
    case 'RM':  return { pace: sc(74, 10), shooting: sc(65, 5),  passing: sc(68, 8),  dribbling: sc(72, 10), defense: ri(40, 62), physical: sc(65, 5) };
    case 'LW':
    case 'RW':  return { pace: sc(78, 12), shooting: sc(70, 8),  passing: sc(66, 5),  dribbling: sc(78, 15), defense: ri(28, 50), physical: ri(55, 72) };
    case 'ST':  return { pace: sc(72, 8),  shooting: sc(82, 15), passing: ri(45, 68), dribbling: sc(68, 8),  defense: ri(22, 45), physical: sc(70, 8) };
    default:    return { pace: sc(65, 0),  shooting: sc(65, 0),  passing: sc(65, 0),  dribbling: sc(65, 0),  defense: sc(65, 0),  physical: sc(65, 0) };
  }
}

// -------------------------------------------------------------
// FICTIONAL DATABASE ENGINE
// Generates completely fictional but structurally correct leagues
// to avoid licensing constraints and maintain structural balance.
// -------------------------------------------------------------

const fn = ["Lucas", "Gabriel", "Mateus", "João", "Pedro", "Tiago", "Felipe", "Marcos", "Rafael", "Bruno", "Carlos", "Diego", "Eduardo", "Gustavo", "Fernando", "Leonardo", "Marcelo", "Renato", "Rodrigo", "Thiago", "Vitor", "Alex", "Anderson", "André", "Caio", "Kauan", "Breno", "Igor", "Yuri", "Vinícius", "Arthur", "Bernardo", "Heitor", "Davi", "Samuel", "Enzo", "Benjamin", "Miguel", "Joaquim"];
const ln = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Mendes", "Nunes", "Machado", "Moura", "Cardoso", "Castro", "Teixeira", "Cavalcante", "Pinto", "Nogueira", "Melo", "Fonseca", "Monteiro"];
const cities = ["Capital", "Litoral", "Interior", "Norte", "Sul", "Oeste", "Leste", "Vale", "Serra", "Planalto", "Metrópole", "Baixada", "Campos", "Colina", "Porto", "Horizonte", "Rio Branco", "Montanha"];
const prefixes = ["Atlético", "Esporte Clube", "Sociedade", "Grêmio", "Desportiva", "União", "Real", "Sporting", "Inter", "Associação", "Clube", "Operário"];

// Realistic squad structure (22 players per team)
const squadStructure = ["GK", "GK", "CB", "CB", "CB", "CB", "LB", "LB", "RB", "RB", "CDM", "CDM", "CM", "CM", "CAM", "CAM", "LM", "RM", "LW", "RW", "ST", "ST"];

export function generateStructuredFictionalLeague(leagueId: string, leagueName: string, country: string, numTeams: number = 8, seedOffset: number = 0): League {
  const rootRng = createRNG(Date.now() + seedOffset);
  const pick = <T>(arr: T[], rng: () => number) => arr[Math.floor(rng() * arr.length)];

  const teams: Team[] = [];
  const usedCities = new Set<string>();

  for (let i = 0; i < numTeams; i++) {
    const teamId = Math.floor(rootRng() * 900000) + 100000;
    
    // Distribute level 1-4
    let clubLevel: ClubLevel;
    const lRand = rootRng();
    if (lRand < 0.20) clubLevel = 4;      // 20% elite
    else if (lRand < 0.50) clubLevel = 3; // 30% first division
    else if (lRand < 0.85) clubLevel = 2; // 35% mid-tier
    else clubLevel = 1;                   // 15% lower-tier
    
    let city = pick(cities, rootRng);
    for(let attempt = 0; attempt < 15; attempt++) { // avoid duplicate cities in same league if possible
        if(!usedCities.has(city)) break;
        city = pick(cities, rootRng);
    }
    usedCities.add(city);

    const prefix = pick(prefixes, rootRng);
    const tName = `${prefix} ${city}`;
    const abbrev = (prefix.substring(0, 1) + city.substring(0, 2)).toUpperCase();

    // Base OVR scaled by team quality level
    const baseOvr = 55 + (clubLevel * 7);

    const players: Player[] = [];
    const stOptions: PlayerStatus[] = [
      'starter', 'reserve', // GKs
      'star', 'starter', 'rotation', 'reserve', // CBs
      'starter', 'prospect', // LBs
      'starter', 'rotation', // RBs
      'starter', 'rotation', // CDMs
      'starter', 'rotation', // CMs
      'star', 'rotation', // CAMs
      'starter', 'reserve', // LM, RM
      'starter', 'rotation', // LW, RW
      'star', 'prospect' // STs
    ];

    for (let p = 0; p < squadStructure.length; p++) {
      const sRng = createRNG(teamId * 1000 + p + Date.now());
      const pos = squadStructure[p];
      
      const age = Math.floor(sRng() * 18) + 17; // 17 to 34
      let pOvr = Math.min(99, Math.max(40, baseOvr + (Math.floor(sRng() * 10) - 4)));
      
      // Affect OVR based on expected status inside the team hierarchy
      const st = stOptions[p] || 'reserve';
      if (st === 'star') pOvr += Math.floor(sRng() * 4) + 3;
      if (st === 'prospect') pOvr -= Math.floor(sRng() * 4) + 3;

      const name = pick(fn, sRng) + " " + pick(ln, sRng);
      const pot = Math.min(99, pOvr + (age <= 21 ? Math.floor(sRng() * 12) + 4 : (age <= 24 ? Math.floor(sRng() * 6) + 1 : Math.floor(sRng() * 2))));
      const attrs = attrsByPos(pos, pOvr, sRng);

      players.push({
        id: teamId * 100 + p,
        name,
        position: pos,
        age,
        overall: Math.min(99, pOvr),
        potential: pot,
        height: Math.floor(sRng() * 25) + 172,
        ...attrs,
        fatigue: 100,
        morale: Math.floor(sRng() * 20) + 70,
        happiness: Math.floor(sRng() * 20) + 70,
        status: st,
        salary: Math.max(2, Math.round((pOvr - 48) * clubLevel * 2)),
        contractYears: Math.floor(sRng() * 4) + 1,
        injuryWeeks: Math.random() > 0.96 ? Math.floor(Math.random() * 4) + 1 : 0,
        personality: pick(['leader', 'professional', 'temperamental', 'quiet', 'ambitious'], sRng)
      });
    }

    teams.push({
      id: teamId,
      name: tName,
      abbreviation: abbrev,
      city: city,
      clubLevel: clubLevel,
      balance: clubLevel * 12000 + Math.floor(rootRng() * 5000),
      monthlyIncome: clubLevel * 1500,
      objective: clubLevel === 4 ? "Ser Campeão Nacional" : (clubLevel === 3 ? "Classificar para Continentais" : "Escapar do Rebaixamento"),
      players: players
    });
  }

  // Ensure sorting teams by level before returning
  teams.sort((a,b) => b.clubLevel - a.clubLevel);

  return {
    id: leagueId,
    name: leagueName,
    country: country,
    teams: teams
  };
}

import { teams as realTeams, LEAGUES as realLEAGUES } from "../lib/teams";

export function getInitialLeagues(): League[] {
  // Try to load real leagues from the extracted data in lib/teams
  if (realTeams && realTeams.length > 0) {
    const leaguesMap = new Map<string, League>();

    // Initial setup from the LEAGUES constant
    Object.entries(realLEAGUES).forEach(([id, info]) => {
      leaguesMap.set(id, {
        id: id,
        name: info.name,
        country: info.country,
        teams: []
      });
    });

    realTeams.forEach(t => {
      const lId = t.leagueId;
      if (!leaguesMap.has(lId)) {
        leaguesMap.set(lId, {
          id: lId,
          name: "Liga " + lId,
          country: "Internacional",
          teams: []
        });
      }
      
      leaguesMap.get(lId)!.teams.push(t as unknown as Team);
    });

    return Array.from(leaguesMap.values()).filter(l => l.teams && l.teams.length > 0);
  }

  // Fallback
  return [
    generateStructuredFictionalLeague("fic_gen_global", "Liga Nacional de Elite (Sem Licença)", "Mundo Genérico", 8, 1)
  ];
}
