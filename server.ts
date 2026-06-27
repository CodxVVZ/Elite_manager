import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper function to build dynamic player attributes using your balanced formulas
function createRNG(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const personalities = ['leader', 'professional', 'temperamental', 'quiet', 'ambitious'] as const;

function attrsByPos(pos: string, ovr: number, rng: () => number) {
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

// Full API endpoint that uses Google Gemini to generate structured football teams/players
app.post("/api/generate-league", async (req, res) => {
  try {
    const { country, theme = "Reality-based", numTeams = 4 } = req.body;
    if (!country) {
      return res.status(400).json({ error: "O país ou tema é obrigatório." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Sua chave de API do Gemini não está configurada nos Secrets." });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemPrompt = `Você é um administrador de banco de dados de videogames de futebol profissional. 
    Você precisa gerar times realistas e nomes de jogadores para uma liga de ${country} (Tema: ${theme}).
    Você deve retornar exatamente ${numTeams} clubes de futebol.
    Para CADA clube, você deve gerar exatamente 18 jogadores.
    
    Certifique-se de distribuir as posições dos jogadores adequadamente dentro de cada clube:
    - 2 Goleiros (GK)
    - 4 Defensores (CB, LB, RB)
    - 6 Meio-campistas (CM, CDM, CAM, LM, RM)
    - 6 Atacantes (LW, RW, ST)

    A resposta deve seguir estritamente o schema JSON fornecido e os valores textuais devem ser traduzidos para português do Brasil sempre que possível.`;

    const userPrompt = `Gere uma liga para ${country} com ${numTeams} clubes. Com a temática: "${theme}". Seed de variação: ${Math.random()}.
    IMPORTANTE: Crie clubes diferentes, criativos e únicos a cada vez. Não repita os times mais óbvios constantemente.
    O overall (OVR) geral dos jogadores deve representar o nível do clube:
    - Club Level 4 (Top Elite): OVR entre 76 e 88
    - Club Level 3 (Primeira Divisão Forte): OVR entre 70 e 80
    - Club Level 2 (Time Médio/Divisão Inferior): OVR entre 63 e 73
    - Club Level 1 (Amador / Azarão): OVR entre 50 e 65
    
    Gere nomes realistas de futebolistas correspondentes à cultura local de ${country}. Mantenha os nomes curtos (ex: "Lucas Silva", "H. Kane", "M. Rashford").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: systemPrompt },
        { text: userPrompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leagueName: { type: Type.STRING, description: "Name of the League" },
            teams: {
              type: Type.ARRAY,
              description: `List of exactly ${numTeams} teams`,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "The full standard football club name" },
                  abbreviation: { type: Type.STRING, description: "3 letter abbreviation (e.g., PAL, MUN, RMA)" },
                  city: { type: Type.STRING, description: "Home city name" },
                  clubLevel: { type: Type.INTEGER, description: "Rating of club from 1 (weakest/lower) to 4 (strongest/elite)" },
                  balance: { type: Type.INTEGER, description: "Club initial money balance in thousands (e.g. 5000 to 80000)" },
                  monthlyIncome: { type: Type.INTEGER, description: "Club income per month in thousands (e.g. 500 to 8000)" },
                  objective: { type: Type.STRING, description: "Seasonal goal for the club (e.g. Be Champions, Survive Relegation, Mid-table finish)" },
                  rawPlayers: {
                    type: Type.ARRAY,
                    description: "List of exactly 18 players",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING, description: "Full footballer name" },
                        position: { type: Type.STRING, description: "Specific position: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST" },
                        age: { type: Type.INTEGER, description: "Age of player (16 to 37)" },
                        height: { type: Type.INTEGER, description: "Height in cm (168 to 198)" },
                        overall: { type: Type.INTEGER, description: "Base rating overall value matching the club level constraints" }
                      },
                      required: ["name", "position", "age", "height", "overall"]
                    }
                  }
                },
                required: ["name", "abbreviation", "city", "clubLevel", "balance", "monthlyIncome", "objective", "rawPlayers"]
              }
            }
          },
          required: ["leagueName", "teams"]
        }
      }
    });

    const rawText = response.text || "{}";
    const data = JSON.parse(rawText.trim());

    // Post-process response to calculate matching formulas, contract years, wages, morale, personality
    const parsedTeams = (data.teams || []).map((team: any, teamIdx: number) => {
      const teamId = Math.floor(Math.random() * 900000) + 100000;
      const rng = createRNG(teamId * 777777 + 54321);
      const ri = (a: number, b: number) => Math.floor(rng() * (b - a + 1)) + a;
      const pick = <T>(arr: readonly T[] | T[]): T => arr[Math.floor(rng() * arr.length)];

      const stOptions: string[] = [
        'star', 'starter', 'starter', 'starter', 'starter',
        'rotation', 'rotation', 'rotation', 'rotation', 'rotation',
        'reserve', 'reserve', 'reserve', 'reserve', 'reserve', 'reserve', 'reserve', 'reserve'
      ];

      const playersList = (team.rawPlayers || []).map((rawPl: any, i: number) => {
        const ovr = Math.min(99, Math.max(40, rawPl.overall));
        const pot = Math.min(99, ovr + (rawPl.age <= 19 ? ri(12, 22) : rawPl.age <= 22 ? ri(6, 16) : rawPl.age <= 25 ? ri(0, 8) : 0));
        const attrs = attrsByPos(rawPl.position, ovr, rng);

        return {
          id: teamId * 1000 + i,
          name: rawPl.name,
          position: rawPl.position,
          age: rawPl.age,
          overall: ovr,
          potential: pot,
          height: rawPl.height,
          ...attrs,
          fatigue: 100,
          morale: ri(68, 88),
          happiness: ri(68, 88),
          status: stOptions[i] || 'reserve',
          salary: Math.max(5, Math.round((ovr - 50) * team.clubLevel * 2.5)),
          contractYears: ri(1, 4),
          injuryWeeks: 0,
          personality: pick(personalities)
        };
      });

      return {
        id: teamId,
        name: team.name,
        abbreviation: team.abbreviation,
        city: team.city,
        clubLevel: team.clubLevel || 3,
        balance: team.balance || 15000,
        monthlyIncome: team.monthlyIncome || 1500,
        objective: team.objective || "Ficar na parte de cima da tabela",
        players: playersList
      };
    });

    const leagueId = `league_${Date.now()}`;
    const generatedLeague = {
      id: leagueId,
      name: data.leagueName || `${country} League`,
      country: country,
      teams: parsedTeams
    };

    return res.json({ success: true, league: generatedLeague });
  } catch (error: any) {
    console.error("Erro na geração de liga:", error);
    return res.status(500).json({ error: error.message || "Erro desconhecido na geração por IA." });
  }
});

// Setup Vite & Static Files handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
