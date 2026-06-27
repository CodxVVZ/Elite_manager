import { Team, Player, PlayerStatus, ClubLevel } from "../src/types";

export let LEAGUES: Record<string, {name:string, country:string, level:number, reputation:number}> = {
    "BR_A": {name:"Série A", country:"BR", level:1, reputation: 70},
    "BR_B": {name:"Série B", country:"BR", level:2, reputation: 50},
    "ENG_A": {name:"Premier League", country:"ENG", level:1, reputation: 90},
    "ENG_B": {name:"Championship", country:"ENG", level:2, reputation: 75},
    "ESP_A": {name:"La Liga", country:"ESP", level:1, reputation: 88},
    "ESP_B": {name:"Segunda Div", country:"ESP", level:2, reputation: 70},
    "ITA_A": {name:"Serie A", country:"ITA", level:1, reputation: 85},
    "ITA_B": {name:"Serie B", country:"ITA", level:2, reputation: 65},
    "GER_A": {name:"Bundesliga", country:"GER", level:1, reputation: 86},
    "GER_B": {name:"2. Bundesliga", country:"GER", level:2, reputation: 68},
    "FRA_A": {name:"Ligue 1", country:"FRA", level:1, reputation: 82},
    "FRA_B": {name:"Ligue 2", country:"FRA", level:2, reputation: 60},
    "ARG_A": {name:"Primera División", country:"ARG", level:1, reputation: 75},
    "ARG_B": {name:"Primera Nacional", country:"ARG", level:2, reputation: 55},
};

export const teams: (Team & {leagueId?: string})[] = [];

export async function loadActivePatchToMemory() {
    const { getActivePatch } = await import('./patchSystem');
    const localforage = (await import('localforage')).default;
    let patch = await getActivePatch();

    // Clear LEAGUES
    for (const key of Object.keys(LEAGUES)) {
        delete LEAGUES[key];
    }
    teams.length = 0;

    if (patch) {
        // Populate LEAGUES
        (patch.competitions || []).filter(Boolean).forEach(c => {
            if (c.type === 'league' && c.id) {
                const countryCode = getCountryCodeFromName(c.country);
                LEAGUES[c.id] = { name: c.name, country: countryCode, level: 1, reputation: 70 };
                if (!COUNTRIES[countryCode] && countryCode !== 'UNK') {
                    COUNTRIES[countryCode] = { name: c.country, flag: '🌍' };
                }
            }
        });

        // Populate teams
        (patch.teams || []).filter(Boolean).forEach(t => {
            if (!t.id) return;
            const teamPlayers = (patch.players || []).filter(Boolean).filter(p => p.teamId === t.id).map(p => ({
                ...p,
                status: (p.status as PlayerStatus) || 'rotation',
                personality: (p.personality as any) || 'professional'
            }));
            
            let leagueId = (t.competitions || []).find(cId => LEAGUES[cId]);
            if (!leagueId && (t.competitions || []).length > 0) {
                leagueId = t.competitions[0];
            }
            if (!leagueId && (t as any).leagueId) {
                leagueId = (t as any).leagueId;
            }

            teams.push({
                ...t,
                clubLevel: t.clubLevel || 2,
                leagueId,
                players: teamPlayers
            } as any);
        });
    } else {
        // Try loading from editor local draft
        try {
            const draftTeams = await localforage.getItem<Team[]>('editor_local_teams');
            const draftComps = await localforage.getItem<PatchCompetition[]>('editor_local_competitions');
            const draftPlayers = await localforage.getItem<Record<number, Player[]>>('editor_local_players');

            if (draftTeams && Array.isArray(draftTeams)) {
                if (draftComps && Array.isArray(draftComps)) {
                    draftComps.forEach(c => {
                        if (c.type === 'league' && c.id) {
                            const countryCode = getCountryCodeFromName(c.country);
                            LEAGUES[c.id] = { name: c.name, country: countryCode, level: 1, reputation: 70 };
                            if (!COUNTRIES[countryCode] && countryCode !== 'UNK') {
                                COUNTRIES[countryCode] = { name: c.country, flag: '🌍' };
                            }
                        }
                    });
                }

                draftTeams.forEach(t => {
                    if (!t.id) return;
                    const teamPlayers = (draftPlayers?.[t.id] ?? t.players ?? []).map(p => ({
                        ...p,
                        status: (p.status as PlayerStatus) || 'rotation',
                        personality: (p.personality as any) || 'professional'
                    }));

                    let leagueId = (t as any).leagueId || (t.competitions && t.competitions[0]) || '';

                    teams.push({
                        ...t,
                        clubLevel: t.clubLevel || 2,
                        leagueId,
                        players: teamPlayers
                    } as any);
                });
            }
        } catch (e) {
            console.error("Erro ao carregar rascunho do editor:", e);
        }
    }

    return true;
}

export function getCountryCodeFromName(name: string): string {
    const map: Record<string, string> = {
        "Brasil": "BR", "Espanha": "ESP", "França": "FRA", "Argentina": "ARG", "Alemanha": "GER", "Inglaterra": "ENG", "Itália": "ITA",
        "Portugal": "POR", "Holanda": "NED", "Uruguai": "URU", "Bélgica": "BEL", "Colômbia": "COL", "Marruecos": "MAR", "Croácia": "CRO",
        "Senegal": "SEN", "Japão": "JPN", "EUA": "USA", "México": "MEX", "Suíça": "SUI", "Polônia": "POL", "Suécia": "SWE",
        "Dinamarca": "DEN", "Sérvia": "SRB", "Turquia": "TUR", "Gana": "GHA", "Noruega": "NOR", "Marrocos": "MAR", "Nigéria": "NGA"
    };
    return map[name] || "UNK";
}

export const FOREIGN_PLAYERS: Record<string, string> = {};

export const COUNTRIES: Record<string, {name:string, flag:string}> = {
  "BR": { name: "Brasil", flag: "🇧🇷" },
  "ENG": { name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "ESP": { name: "Espanha", flag: "🇪🇸" },
  "ITA": { name: "Itália", flag: "🇮🇹" },
  "GER": { name: "Alemanha", flag: "🇩🇪" },
  "FRA": { name: "França", flag: "🇫🇷" },
  "ARG": { name: "Argentina", flag: "🇦🇷" },
};
