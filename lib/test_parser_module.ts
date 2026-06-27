
export const PLAYER_POS_OVERRIDE: Record<string, string> = { "Neymar": "LW" };
function parseRosterData(raw: string, logos: Record<string, string>, knownTeams: string[], idStart: number, defaultOvr: number, level: number) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  
  const overrides: any[] = [];
  let currentTeam: any = null;
  let currentCategory = "M";

  function nameHash(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
      return Math.abs(hash);
  }

  function assignPos(cat: string, name: string) {
      if (PLAYER_POS_OVERRIDE[name]) return PLAYER_POS_OVERRIDE[name];
      const h = nameHash(name);
      if (cat === "G") return "GK";
      if (cat === "D") {
          const pos = ["CB", "CB", "RB", "LB", "CB"];
          return pos[h % pos.length];
      }
      if (cat === "M") {
          const pos = ["CM", "CM", "CDM", "CAM", "RM", "LM"];
          return pos[h % pos.length];
      }
      if (cat === "A") {
          const pos = ["ST", "ST", "RW", "LW", "ST"];
          return pos[h % pos.length];
      }
      return "CM";
  }

  let idCounter = idStart;
  
  for (const line of lines) {
     const isTeamName = knownTeams.includes(line) || (
         knownTeams.length === 0 && line.length > 2 && line.length < 30 &&
         !line.match(/\\d/) && !line.includes('(') && !line.includes(')') &&
         !["goleiros", "defensores", "zagueiros", "meio-campistas", "meias", "atacantes", "goleiro", "defensor", "meio-campista", "meio-campo", "atacante", "laterai"].some(c => line.toLowerCase().includes(c))
     );

     if (isTeamName) {
         currentTeam = {
             id: idCounter++,
             name: line,
             abbreviation: line.substring(0, 3).toUpperCase(),
             city: line, // approximate
             clubLevel: level,
             ovr: defaultOvr + Math.floor(Math.random() * 5),
             logoUrl: logos[line] || "",
             players: [],
             posCounts: { GK: 0, CB: 0, LB: 0, RB: 0, CDM: 0, CM: 0, CAM: 0, RM: 0, LM: 0, RW: 0, LW: 0, ST: 0 },
             j: 1
         };
         overrides.push(currentTeam);
         continue;
     }

     if (!currentTeam) continue;

     if (line.toLowerCase() === "goleiros" || line.toLowerCase().includes("goleiro")) { currentCategory = "G"; continue; }
     if (line.toLowerCase() === "defensores" || line.toLowerCase().includes("defensor") || line.toLowerCase() === "zagueiros" || line.toLowerCase().includes("laterai")) { currentCategory = "D"; continue; }
     if (line.toLowerCase() === "meio-campistas" || line.toLowerCase().includes("meio-campista") || line.toLowerCase() === "meias" || line.toLowerCase().includes("meio-campo")) { currentCategory = "M"; continue; }
     if (line.toLowerCase() === "atacantes" || line.toLowerCase().includes("atacante")) { currentCategory = "A"; continue; }

     let matchName = "";
     let matchNum = 0;
     let age = 22;
     let ovrStr = "";
     let parsedNat = "";

     const matches = [...line.matchAll(/([A-ZÀ-Ÿa-zà-ÿ0-9\s\.\'-]+?)(?:\s*-\s*(\d+))?\s*\(([^)]+)\)/g)];
     if (matches.length > 0) {
         for (const match of matches) {
             matchName = match[1].trim();
             if (match[2]) matchNum = parseInt(match[2]);
             
             let exactPos = "";
             const m2 = match[3].match(/(\d+)\s*anos,?\s*(.*?)\s*(?:-|,)\s*Pos:\s*(.*?)\s*(?:-|,)\s*Ovr\s*(\d+)/i);
             if (m2) {
                 age = parseInt(m2[1]);
                 parsedNat = m2[2].trim();
                 exactPos = m2[3] ? m2[3].trim() : "";
                 ovrStr = m2[4].trim();
             } else {
                 // Fallback for older formats like "18 anos - Ovr 70" or "França, 20 anos"
                 const inside = match[3].split(',').map(p => p.trim());
                 const agePart = inside.find(p => p.includes("anos"));
                 const ovrPart = match[3].split('-').find(p => p.includes("Ovr"));
                 
                 if (agePart) {
                     const am = agePart.match(/(\d+)\s*anos/);
                     if (am) age = parseInt(am[1]);
                 }
                 if (ovrPart) {
                     const om = ovrPart.match(/Ovr (\d+)/);
                     if (om) ovrStr = om[1];
                 }
                 const natPart = inside.find(p => !p.includes("anos") && !p.includes("Ovr") && p.length > 2);
                 if (natPart) {
                     parsedNat = natPart.split('-')[0].trim();
                 }
             }
             
             if (matchName.length > 2 && !knownTeams.includes(matchName) ) {
                 // Translate positional codes if present
                 let finalPos = "";
                 if (exactPos) {
                     if (exactPos.startsWith("G")) finalPos = "GK";
                     else if (exactPos.includes("A(C)") || exactPos === "A") finalPos = "ST";
                     else if (exactPos.includes("MA(C)")) finalPos = "CAM";
                     else if (exactPos.includes("A(EC)") || exactPos.includes("A(E)") || exactPos.includes("MA(E)")) finalPos = "LW";
                     else if (exactPos.includes("A(DC)") || exactPos.includes("A(D)") || exactPos.includes("MA(D)")) finalPos = "RW";
                     else if (exactPos.includes("M(E)") || exactPos.includes("MD(E)")) finalPos = "LM";
                     else if (exactPos.includes("M(D)") || exactPos.includes("MD(D)")) finalPos = "RM";
                     else if (exactPos.includes("MD") && !exactPos.includes("E") && !exactPos.includes("D")) finalPos = "CDM";
                     else if (exactPos.includes("M(C)") || exactPos === "M") finalPos = "CM";
                     else if (exactPos.includes("D(E)") || exactPos.includes("D(EC)")) finalPos = "LB";
                     else if (exactPos.includes("D(D)") || exactPos.includes("D(DC)")) finalPos = "RB";
                     else if (exactPos.includes("D") && !exactPos.includes("MD")) finalPos = "CB";
                     else if (exactPos.includes("A")) finalPos = "ST";
                     else finalPos = "CM";
                 }

                 const pos = finalPos || assignPos(currentCategory, matchName);
                 if (pos) {
                     currentTeam.players.push({
                         name: matchName,
                         jerseyNumber: matchNum > 0 ? matchNum : currentTeam.j++,
                         age,
                         ovrParam: ovrStr ? parseInt(ovrStr) : undefined,
                         position: pos,
                         nationality: parsedNat // Extracted nationality
                     });
                 }
             }
         }
     } else {
         // handle cases with no parentheses but maybe name - number
         const rx = /^([^\-]+?)(?:\s*-\s*(\d+))?$/;
         const m = line.match(rx);
         if (m && m[1]) {
             matchName = m[1].trim();
             if (m[2]) matchNum = parseInt(m[2]);
             if (matchName.length > 2 && !knownTeams.includes(matchName) ) {
                 const pos = assignPos(currentCategory, matchName);
                 if (pos) {
                     currentTeam.players.push({
                         name: matchName,
                         jerseyNumber: matchNum > 0 ? matchNum : currentTeam.j++,
                         age: 22,
                         ovrParam: undefined,
                         position: pos
                     });
                 }
             }
         }
     }
  }

  return overrides;
}
export const getOverrides = () => parseRosterData(`
Barcelona
Goleiros
Wojciech Szczęsny (36 anos, Polônia - Pos: G - Ovr 90)
Marc-André Ter Stegen (34 anos, Alemanha - Pos: G - Ovr 91)
Iñaki Peña (27 anos, Espanha - Pos: G - Ovr 87)
Joan García (25 anos, Espanha - Pos: G - Ovr 90)
Áron Yaakobishvili (20 anos, Hungria - Pos: G - Ovr 77)
Diego Kochen (20 anos, Estados Unidos - Pos: G - Ovr 75)
Max Bonfill (19 anos, Espanha - Pos: G - Ovr 70)
Eder Aller (19 anos, Espanha - Pos: G - Ovr 65)
Iker Rodríguez (18 anos, Espanha - Pos: G - Ovr 65)
Defensores
Andreas Christensen (30 anos, Dinamarca - Pos: D,MD(C) - Ovr 89)
Ronald Araújo (27 anos, Uruguai - Pos: D(DC) - Ovr 91)
Jules Koundé (27 anos, França - Pos: D(DC),MD(D) - Ovr 92)
Eric García (25 anos, Espanha - Pos: D(DC),MD(C) - Ovr 89)
Alejandro Balde (22 anos, Espanha - Pos: D,MD,M(E) - Ovr 91)
Landry Farré (19 anos, Espanha - Pos: D(DEC),MD(DE) - Ovr 73)
David Oduro (19 anos, Gana - Pos: D,MD,M,MA(E) - Ovr 73)
Héctor Fort (19 anos, Espanha - Pos: D,MD,M(DE) - Ovr 83)
Gerard Martin (24 anos, Espanha - Pos: D(EC),MD(E) - Ovr 87)
Pau Cubarsí (19 anos, Espanha - Pos: D(C) - Ovr 91)
Álvaro Cortés (21 anos, Espanha - Pos: D(C) - Ovr 77)
Alexis Olmedo (20 anos, Espanha - Pos: D(DC) - Ovr 76)
Juwensley Onstein (18 anos, Holanda - Pos: D(C) - Ovr 70)
Joan Anaya (21 anos, Espanha - Pos: D,MD,M(D) - Ovr 70)
Xavi Espart (19 anos, Espanha - Pos: D(D),MD,M(DC) - Ovr 70)
Leo Saca (19 anos, Moldávia - Pos: D(EC),MD(E) - Ovr 65)
Guillem Víctor (19 anos, Espanha - Pos: D(D),MD,M(DC) - Ovr 65)
Jofre Torrents (19 anos, Espanha - Pos: D,MD,M,MA(E) - Ovr 76)
Alex Walton (20 anos, Espanha - Pos: D,MD,M(E) - Ovr 65)
Alex Campos (18 anos, Espanha - Pos: D,MD(C) - Ovr 65)
Nil Teixidor (18 anos, Espanha - Pos: D,MD,M(D) - Ovr 65)
Nico Marcipar (18 anos, Argentina - Pos: D(EC) - Ovr 65)
Hafiz Gariba (19 anos, Gana - Pos: D(EC) - Ovr 65)
Baba Kourouma (17 anos, Espanha - Pos: D,MD,M(C) - Ovr 65)
Meio-campistas
Dani Olmo (28 anos, Espanha - Pos: MA(DEC) - Ovr 92)
Frenkie de Jong (29 anos, Holanda - Pos: MD,M(C) - Ovr 93)
Belloli Raphinha (29 anos, Brasil - Pos: MA(DEC),A(DE) - Ovr 94)
Ferrán Torres (26 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 91)
Anthony Gordon (25 anos, Inglaterra - Pos: MA,A(DEC) - Ovr 91)
Ansu Fati (23 anos, Espanha - Pos: MA,A(EC) - Ovr 88)
Gonzalez Pedri (23 anos, Espanha - Pos: M,MA(C) - Ovr 94)
Pablo Gavi (21 anos, Espanha - Pos: M(C),MA(EC) - Ovr 91)
Roony Bardghji (20 anos, Suécia - Pos: MA(DEC),A(DE) - Ovr 83)
Alan Godoy (23 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 77)
Roger Martínez (22 anos, Espanha - Pos: MD,M,MA(C) - Ovr 75)
Dani Rodríguez (20 anos, Espanha - Pos: MA,A(DE) - Ovr 76)
Marc Casadó (22 anos, Espanha - Pos: MD,M(C) - Ovr 87)
Lamine Yamal (18 anos, Espanha - Pos: MA,A(DE) - Ovr 95)
Fermín López (23 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 90)
Marc Bernal (19 anos, Espanha - Pos: MD,M(C) - Ovr 80)
Guille Fernández (17 anos, Espanha - Pos: M,MA(C) - Ovr 76)
Juan Hernández (18 anos, Espanha - Pos: M(C),MA(EC) - Ovr 73)
Toni Fernández (17 anos, Espanha - Pos: MA,A(DEC) - Ovr 78)
Shane Kluivert (18 anos, Holanda - Pos: MA,A(E) - Ovr 65)
Brian Fariñas (20 anos, Espanha - Pos: M(C),MA(EC) - Ovr 73)
Dani Ávila (19 anos, Espanha - Pos: MD,M(C) - Ovr 65)
Pedro Rodríguez (18 anos, Espanha - Pos: MD,M,MA(C) - Ovr 70)
Ibrahim Diarra (19 anos, Mali - Pos: MA,A(DE) - Ovr 65)
Tommy Marqués (19 anos, Espanha - Pos: MD,M(C) - Ovr 70)
Ebrima Tunkara (16 anos, Espanha - Pos: MA(DEC) - Ovr 65)
Sama Nomoko (18 anos, Espanha - Pos: MA,A(DE) - Ovr 73)
Adrián Guerrero (18 anos, Espanha - Pos: MA,A(EC) - Ovr 65)
Lovro Chelfi (19 anos, Croácia - Pos: M,MA(C) - Ovr 67)
Atacantes
Víctor Barberá (21 anos, Espanha - Pos: A(C) - Ovr 76)
Òscar Gistau (18 anos, Espanha - Pos: A(C) - Ovr 65)

Athletic Club
Goleiros
Unai Simón (28 anos, Espanha - Pos: G - Ovr 91)
Julen Agirrezabala (25 anos, Espanha - Pos: G - Ovr 88)
Álex Padilla (22 anos, México - Pos: G - Ovr 80)
Defensores
Yuri Berchiche (36 anos, Espanha - Pos: D,MD,M(E) - Ovr 89)
Aymeric Laporte (32 anos, Espanha - Pos: D(C) - Ovr 91)
Yeray Álvarez (31 anos, Espanha - Pos: D(C) - Ovr 87)
Andoni Gorosabel (29 anos, Espanha - Pos: D,MD,M(D) - Ovr 88)
Dani Vivian (26 anos, Espanha - Pos: D(C) - Ovr 91)
Jesús Areso (26 anos, Espanha - Pos: D,MD,M(D) - Ovr 88)
Aitor Paredes (26 anos, Espanha - Pos: D(C) - Ovr 89)
Unai Egíluz (24 anos, Espanha - Pos: D(C) - Ovr 80)
Hugo Rincón (23 anos, Espanha - Pos: D,MD,M(D) - Ovr 83)
Adama Boiro (23 anos, Espanha - Pos: D,MD,M,MA(E) - Ovr 85)
Jon de Luis (22 anos, Espanha - Pos: D(C) - Ovr 73)
Iker Monreal (20 anos, Espanha - Pos: D(EC) - Ovr 65)
Meio-campistas
Iñigo Ruiz de Galarreta (32 anos, Espanha - Pos: M,MA(C) - Ovr 88)
Iñaki Williams (31 anos, Gana - Pos: MA(D),A(DC) - Ovr 90)
Mikel Vesga (33 anos, Espanha - Pos: MD,M(C) - Ovr 88)
Álex Berenguer (30 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 89)
Robert Navarro (24 anos, Espanha - Pos: MA(DEC) - Ovr 87)
Oihan Sancet (26 anos, Espanha - Pos: M,MA(C) - Ovr 91)
Unai Vencedor (25 anos, Espanha - Pos: MD,M(C) - Ovr 85)
Nico Williams (23 anos, Espanha - Pos: MA,A(DE) - Ovr 92)
Nico Serrano (23 anos, Espanha - Pos: MA,A(DE) - Ovr 83)
Beñat Prados (25 anos, Espanha - Pos: MD,M(C) - Ovr 88)
Beñat Gerenabarrena (23 anos, Espanha - Pos: M,MA(C) - Ovr 76)
Peio Huestamendia (19 anos, Espanha - Pos: MA(DEC) - Ovr 70)
Álvaro Djaló (26 anos, Guiné-Bissau - Pos: MA(DE),A(DEC) - Ovr 86)
Unai Gómez (23 anos, Espanha - Pos: M,MA(C) - Ovr 85)
Alejandro Rego (22 anos, Espanha - Pos: MD,M(C) - Ovr 80)
Aingeru Olabarrieta (20 anos, Espanha - Pos: MA,A(DE) - Ovr 78)
Mikel Jauregizar (22 anos, Espanha - Pos: M,MA(C) - Ovr 89)
Peio Canales (21 anos, Espanha - Pos: M,MA(C) - Ovr 82)
Beñat García (19 anos, Espanha - Pos: M,MA(C) - Ovr 65)
Selton Sánchez (19 anos, Espanha - Pos: M,MA(C) - Ovr 73)
Atacantes
Gorka Guruzeta (29 anos, Espanha - Pos: A(C) - Ovr 89)
Urko Izeta (26 anos, Espanha - Pos: A(C) - Ovr 82)
Maroan Sannadi (25 anos, Marrocos - Pos: A(C) - Ovr 86)
Asier Hierro (21 anos, Espanha - Pos: A(C) - Ovr 73)
Txus Vizcay (20 anos, Espanha - Pos: A(C) - Ovr 65)
Manex Lozano (19 anos, Espanha - Pos: A(C) - Ovr 73)

Atlético Madrid
Goleiros
Jan Oblak (33 anos, Eslovênia - Pos: G - Ovr 93)
Juan Musso (32 anos, Argentina - Pos: G - Ovr 88)
Horațiu Moldovan (28 anos, Romênia - Pos: G - Ovr 85)
Salvi Esquivel (20 anos, Espanha - Pos: G - Ovr 67)
Álvaro Moreno (19 anos, Espanha - Pos: G - Ovr 65)
Daniel Rubio (18 anos, Espanha - Pos: G - Ovr 65)
Luismi Morales (20 anos, Espanha - Pos: G - Ovr 65)
Diego Díaz (19 anos, Espanha - Pos: G - Ovr 70)
Defensores
José María Giménez (31 anos, Uruguai - Pos: D(C) - Ovr 91)
Clément Lenglet (30 anos, França - Pos: D(C) - Ovr 89)
Marcos Llorente (31 anos, Espanha - Pos: D(D),MD,M(DC) - Ovr 91)
Nahuel Molina (28 anos, Argentina - Pos: D,MD,M(D) - Ovr 91)
Robin le Normand (29 anos, Espanha - Pos: D(C) - Ovr 91)
Dávid Hancko (28 anos, Eslováquia - Pos: D(EC) - Ovr 90)
Pablo Pérez (24 anos, Espanha - Pos: D,MD,M(E) - Ovr 76)
Matteo Ruggeri (23 anos, Itália - Pos: D,MD,M(E) - Ovr 89)
Marc Pubill (22 anos, Espanha - Pos: D(DC),MD(D) - Ovr 85)
Carlos Giménez (23 anos, Espanha - Pos: D(DC) - Ovr 74)
Julio Díaz (21 anos, Espanha - Pos: D,MD,M,MA(E) - Ovr 76)
Dani Muñoz (19 anos, Espanha - Pos: D,MD,M,MA(E) - Ovr 67)
David Arza (20 anos, Espanha - Pos: D,MD,M(D) - Ovr 65)
Izan Muñoz (19 anos, Espanha - Pos: D(EC),MD,M(E) - Ovr 65)
Meio-campistas
Jorge Koke (34 anos, Espanha - Pos: MD,M,MA(C) - Ovr 91)
Thomas Lemar (30 anos, França - Pos: M(C),MA(DEC) - Ovr 86)
Alexander Sorloth (30 anos, Noruega - Pos: MA(D),A(DC) - Ovr 91)
Ademola Lookman (28 anos, Nigéria - Pos: MA,A(DEC) - Ovr 91)
Thiago Almada (25 anos, Argentina - Pos: M(C),MA(DEC) - Ovr 89)
Julián Álvarez (26 anos, Argentina - Pos: MA,A(DEC) - Ovr 94)
Johnny Cardoso (24 anos, Estados Unidos - Pos: MD,M(C) - Ovr 90)
Álex Baena (24 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 91)
Giuliano Simeone (23 anos, Argentina - Pos: MA(DE),A(DEC) - Ovr 90)
Carlos Martín (24 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 83)
Obed Vargas (20 anos, México - Pos: MD(C),M,MA(DC) - Ovr 82)
Pablo Barrios (22 anos, Espanha - Pos: MD,M,MA(C) - Ovr 91)
Salim el Jebari (22 anos, Marrocos - Pos: MA(DEC),A(DE) - Ovr 78)
Diego Bri (23 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 78)
Rodrigo Mendoza (21 anos, Espanha - Pos: M,MA(C) - Ovr 83)
Hugo Humanes (19 anos, Espanha - Pos: MA,A(EC) - Ovr 65)
David Muñoz (21 anos, Espanha - Pos: M,MA(C) - Ovr 70)
Darío Frey (21 anos, Espanha - Pos: MD,M(C) - Ovr 65)
Jorge Rajado (20 anos, Espanha - Pos: MA(E),A(EC) - Ovr 65)
Sergio Esteban (19 anos, Espanha - Pos: MA(D),A(DC) - Ovr 65)
Taufik Seidu (18 anos, Espanha - Pos: MD,M,MA(C) - Ovr 65)
Javier Díaz (20 anos, Espanha - Pos: MD,M(C) - Ovr 65)
David Fernández (18 anos, Espanha - Pos: MD,M(C) - Ovr 65)
Miguel Cubo (18 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 65)
Óscar Bazaga (18 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 65)
Atacantes

CA Osasuna
Goleiros
Aitor Fernández (35 anos, Espanha - Pos: G - Ovr 85)
Sergio Herrera (32 anos, Espanha - Pos: G - Ovr 88)
Defensores
Valentin Rosier (29 anos, França - Pos: D,MD,M(D) - Ovr 86)
Javi Galán (31 anos, Espanha - Pos: D,MD,M(E) - Ovr 88)
Alejandro Catena (31 anos, Espanha - Pos: D(C) - Ovr 88)
Jorge Herrando (25 anos, Espanha - Pos: D(C) - Ovr 86)
Enzo Boyomo (24 anos, Camarões - Pos: D(C) - Ovr 88)
Abel Bretones (25 anos, Espanha - Pos: D,MD,M(E) - Ovr 87)
Meio-campistas
Moi Gómez (31 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 86)
Lucas Torró (31 anos, Espanha - Pos: MD,M(C) - Ovr 88)
Rubén Garcìa (32 anos, Espanha - Pos: MA,A(DEC) - Ovr 87)
Kike Barja (29 anos, Espanha - Pos: MA,A(DE) - Ovr 84)
Jon Moncayola (28 anos, Espanha - Pos: MD,M(C) - Ovr 88)
Aimar Oroz (24 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 88)
Raúl Moro (23 anos, Espanha - Pos: MA,A(DE) - Ovr 85)
Iker Benito (23 anos, Espanha - Pos: MA,A(DE) - Ovr 82)
Iker Muñoz (23 anos, Espanha - Pos: MD,M(C) - Ovr 85)
Asier Osambela (21 anos, Espanha - Pos: M,MA(C) - Ovr 78)
Víctor Muñoz (22 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 83)
Mauro Echegoyen (21 anos, Espanha - Pos: M,MA(C) - Ovr 73)
Anai Morales (19 anos, Espanha - Pos: M(C) - Ovr 65)
Atacantes
Ante Budimir (34 anos, Croácia - Pos: A(C) - Ovr 91)
Raúl García (25 anos, Espanha - Pos: A(C) - Ovr 86)

Celta Vigo
Goleiros
Iván Villar (28 anos, Espanha - Pos: G - Ovr 85)
Ionuț Radu (29 anos, Romênia - Pos: G - Ovr 87)
Marc Vidal (26 anos, Espanha - Pos: G - Ovr 76)
Defensores
Marcos Alonso (35 anos, Espanha - Pos: D(EC),MD,M(E) - Ovr 88)
Mihailo Ristić (30 anos, Sérvia - Pos: D,MD,M(E) - Ovr 84)
Carl Starfelt (31 anos, Suécia - Pos: D(C) - Ovr 87)
Joseph Aidoo (30 anos, Gana - Pos: D(C) - Ovr 85)
Unai Núñez (29 anos, Espanha - Pos: D(C) - Ovr 87)
Óscar Mingueza (27 anos, Espanha - Pos: D(DEC),MD,M(DE) - Ovr 90)
Manu Sánchez (25 anos, Espanha - Pos: D,MD,M(E) - Ovr 86)
Sergio Carreira (25 anos, Espanha - Pos: D,MD,M(DE) - Ovr 86)
Carlos Domínguez (25 anos, Espanha - Pos: D(C) - Ovr 85)
Álvaro Núñez (25 anos, Espanha - Pos: D,MD,M(D) - Ovr 85)
Yoel Lago (22 anos, Espanha - Pos: D,MD,M(C) - Ovr 82)
Javi Rueda (24 anos, Espanha - Pos: D,MD,M,MA(DE) - Ovr 83)
Javi Rodríguez (22 anos, Espanha - Pos: D(DC) - Ovr 87)
Manu Fernández (25 anos, Espanha - Pos: D,MD,M(C) - Ovr 82)
Meio-campistas
Iago Aspas (38 anos, Espanha - Pos: MA(D),A(DC) - Ovr 89)
Matías Vecino (34 anos, Uruguai - Pos: MD,M,MA(C) - Ovr 88)
Franco Cervi (32 anos, Argentina - Pos: M,MA(DE) - Ovr 84)
Carles Pérez (28 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 84)
Ilaix Moriba (23 anos, Guiné - Pos: MD,M(C) - Ovr 87)
Carlos Dotor (25 anos, Espanha - Pos: MD,M(C) - Ovr 82)
Williot Swedberg (22 anos, Suécia - Pos: M(C),MA(EC) - Ovr 85)
Ferran Jutglà (27 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 86)
Hugo Sotelo (22 anos, Espanha - Pos: MD,M(C) - Ovr 85)
Jones El-Abdellaoui (20 anos, Marrocos - Pos: MA,A(DE) - Ovr 78)
Hugo Álvarez (22 anos, Espanha - Pos: M,MA(DE) - Ovr 85)
Pablo Durán (25 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 86)
Miguel Román (23 anos, Espanha - Pos: M(C) - Ovr 83)
Damián Rodríguez (23 anos, Espanha - Pos: MD,M(C) - Ovr 82)
Ángel Arcos (20 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 76)
Atacantes
Borja Iglesias (33 anos, Espanha - Pos: A(C) - Ovr 88)

Deportivo Alavés
Goleiros
Raúl Fernández (38 anos, Espanha - Pos: G - Ovr 82)
Antonio Sivera (29 anos, Espanha - Pos: G - Ovr 87)
Jesús Owono (25 anos, Guiné Equatorial - Pos: G - Ovr 82)
Adrián Rodríguez (25 anos, Argentina - Pos: G - Ovr 77)
Defensores
Jonny Otto (32 anos, Espanha - Pos: D,MD,M(DE) - Ovr 86)
Nikola Maraš (30 anos, Sérvia - Pos: D(C) - Ovr 84)
Nahuel Tenaglia (30 anos, Argentina - Pos: D(DC) - Ovr 86)
Moussa Diarra (25 anos, Mali - Pos: D(EC) - Ovr 85)
Facundo Garcés (26 anos, Malásia - Pos: D(C) - Ovr 84)
Hugo Novoa (23 anos, Espanha - Pos: D,MD,M,MA(D) - Ovr 78)
Youssef Enríquez (20 anos, Marrocos - Pos: D,MD,M(E) - Ovr 82)
Victor Parada (24 anos, Espanha - Pos: D(EC) - Ovr 82)
Adrián Pica (24 anos, Espanha - Pos: D(C) - Ovr 78)
Ángel Pérez (23 anos, Espanha - Pos: D,MD,M,MA(D) - Ovr 82)
Aser Palacios (21 anos, Espanha - Pos: D(EC),MD,M(E) - Ovr 70)
Andranik Hakobyan (20 anos, Armênia - Pos: D(C) - Ovr 70)
Meio-campistas
Denís Suárez (32 anos, Espanha - Pos: M(C),MA(EC) - Ovr 86)
Carles Aleña (28 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 87)
Carlos Protesoni (28 anos, Uruguai - Pos: MD,M(C) - Ovr 84)
Jon Guridi (31 anos, Espanha - Pos: M,MA(C) - Ovr 87)
Ander Guevara (28 anos, Espanha - Pos: MD,M(C) - Ovr 87)
Antonio Blanco (25 anos, Espanha - Pos: MD,M(C) - Ovr 87)
Gonçalves Calebe (26 anos, Brasil - Pos: M(C),MA(DEC) - Ovr 83)
Abde Rebbach (27 anos, Algéria - Pos: MA,A(DE) - Ovr 83)
Pablo Ibáñez (27 anos, Espanha - Pos: MD,M(C) - Ovr 86)
Tomás Mendes (21 anos, Guiné-Bissau - Pos: MD,M(C) - Ovr 76)
José de León (22 anos, República Dominicana - Pos: MA(DEC) - Ovr 73)
Selu Diallo (22 anos, Guiné - Pos: MD,M(C) - Ovr 77)
Ibrahim Diabaté (26 anos, Costa do Marfim - Pos: MA(DE),A(DEC) - Ovr 82)
Unai Ropero (24 anos, Espanha - Pos: MA,A(DEC) - Ovr 78)
Gustavo Albarracín (20 anos, Argentina - Pos: MD,M(C) - Ovr 73)
Julen Lartitegi (22 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 70)
Atacantes
Mariano Díaz (32 anos, República Dominicana - Pos: A(C) - Ovr 82)
Lucas Boyé (30 anos, Argentina - Pos: A(C) - Ovr 86)
Toni Martínez (28 anos, Espanha - Pos: A(C) - Ovr 86)

Elche CF
Goleiros
Matías Dituro (39 anos, Argentina - Pos: G - Ovr 84)
Alejandro Iturbe (22 anos, Espanha - Pos: G - Ovr 80)
Defensores
Pedro Bigas (36 anos, Espanha - Pos: D(C) - Ovr 85)
Josán Fernández (36 anos, Espanha - Pos: D,MD(D),M,MA(DE) - Ovr 83)
Bambo Diaby (28 anos, Espanha - Pos: D(C) - Ovr 80)
David Affengruber (25 anos, Áustria - Pos: D(C) - Ovr 86)
Germán Valera (24 anos, Espanha - Pos: D,MD,M(E),MA(DE) - Ovr 85)
John Donald (25 anos, Espanha - Pos: D,MD,M(C) - Ovr 82)
Léo Petrot (29 anos, França - Pos: D(EC) - Ovr 83)
Buba Sangaré (18 anos, Espanha - Pos: D,MD,M(D) - Ovr 70)
Matia Barzić (22 anos, Croácia - Pos: D(C) - Ovr 80)
Meio-campistas
Aleix Febas (30 anos, Espanha - Pos: M,MA(C) - Ovr 85)
Grady Diangana (28 anos, Congo DR - Pos: MA(DEC) - Ovr 83)
Tete Morente (29 anos, Espanha - Pos: MA,A(DE) - Ovr 85)
Marc Aguado (26 anos, Espanha - Pos: MD,M(C) - Ovr 85)
Yago Santiago (23 anos, Espanha - Pos: MA,A(DE) - Ovr 78)
Lucas Cepeda (23 anos, Chile - Pos: M,MA(DE) - Ovr 83)
Martim Neto (23 anos, Portugal - Pos: M,MA(C) - Ovr 83)
Álvaro Rodríguez (21 anos, Uruguai - Pos: MA(DE),A(DEC) - Ovr 85)
Federico Redondo (23 anos, Argentina - Pos: MD,M(C) - Ovr 83)
Rafa Núñez (24 anos, República Dominicana - Pos: M,MA(DE) - Ovr 76)
Nordin al Lal (21 anos, Marrocos - Pos: MA(DE),A(DEC) - Ovr 65)
Ali Houary (20 anos, Marrocos - Pos: MA,A(C) - Ovr 76)
Adam Boayar (20 anos, Marrocos - Pos: MA,A(C) - Ovr 76)
Luis Roldán (23 anos, Espanha - Pos: M(C),MA(DC) - Ovr 66)
Atacantes
André Silva (30 anos, Portugal - Pos: A(C) - Ovr 87)

Getafe CF
Goleiros
David Soria (33 anos, Espanha - Pos: G - Ovr 88)
Jiri Letacek (27 anos, República Tcheca - Pos: G - Ovr 83)
Defensores
Kiko Femenía (35 anos, Espanha - Pos: D,MD,M,MA(D) - Ovr 87)
Allan Nyom (38 anos, Camarões - Pos: D,MD,M(DE) - Ovr 83)
Dakonam Djené (34 anos, Togo - Pos: D(DC),MD(C) - Ovr 88)
Diego Rico (33 anos, Espanha - Pos: D(EC),MD,M(E) - Ovr 87)
Domingos Duarte (31 anos, Portugal - Pos: D(C) - Ovr 86)
Juan Iglesias (27 anos, Espanha - Pos: D(DEC),MD,M(DE) - Ovr 87)
Peter Federico (23 anos, República Dominicana - Pos: D,MD,M(E),MA(DE) - Ovr 82)
Abdel Abqar (27 anos, Marrocos - Pos: D(C) - Ovr 87)
Davinchi Cordón (18 anos, Espanha - Pos: D,MD,M(E) - Ovr 78)
Ismael Bekhoucha (21 anos, Marrocos - Pos: D,MD,M(D) - Ovr 78)
Meio-campistas
López Juanmi (33 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 86)
Mauro Arambarri (30 anos, Uruguai - Pos: MD,M(C) - Ovr 88)
Javi Muñoz (31 anos, Espanha - Pos: M,MA(C) - Ovr 85)
Luis Milla (31 anos, Espanha - Pos: MD,M(C) - Ovr 88)
Yvan Neyou (29 anos, Camarões - Pos: MD,M(C) - Ovr 85)
Álex Sancris (29 anos, Espanha - Pos: MA,A(DE) - Ovr 83)
Alejandro Mestanza (21 anos, Espanha - Pos: MA(DEC) - Ovr 74)
Coba da Costa (23 anos, Guiné-Bissau - Pos: MA(DE),A(DEC) - Ovr 83)
Atacantes
Borja Mayoral (29 anos, Espanha - Pos: A(C) - Ovr 88)
Martín Satriano (25 anos, Uruguai - Pos: A(C) - Ovr 85)

Girona FC
Goleiros
Juan Carlos (38 anos, Espanha - Pos: G - Ovr 78)
Rubén Blanco (30 anos, Espanha - Pos: G - Ovr 83)
Paulo Gazzaniga (34 anos, Argentina - Pos: G - Ovr 88)
Toni Fuidias (25 anos, Espanha - Pos: G - Ovr 76)
Vladyslav Krapyvtsov (20 anos, Ucrânia - Pos: G - Ovr 75)
Defensores
Axel Witsel (37 anos, Bélgica - Pos: D,MD,M(C) - Ovr 89)
Daley Blind (36 anos, Holanda - Pos: D(EC),MD(E) - Ovr 88)
David López (36 anos, Espanha - Pos: D,MD,M(C) - Ovr 87)
Álex Moreno (32 anos, Espanha - Pos: D,MD,M(E) - Ovr 88)
Alejandro Francés (23 anos, Espanha - Pos: D(DC) - Ovr 84)
Arnau Martínez (23 anos, Espanha - Pos: D(DC),MD,M(D) - Ovr 87)
Jastin García (22 anos, Portugal - Pos: D,MD,M,MA(E) - Ovr 73)
Antal Yaakobishvili (21 anos, Hungria - Pos: D(C) - Ovr 73)
Meio-campistas
Manzanera Portu (34 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 86)
Donny van de Beek (29 anos, Holanda - Pos: M,MA(C) - Ovr 85)
Viktor Tsygankov (28 anos, Ucrânia - Pos: MA(DEC),A(DE) - Ovr 89)
Abel Ruíz (26 anos, Espanha - Pos: MA,A(C) - Ovr 86)
Fran Beltrán (27 anos, Espanha - Pos: MD,M(C) - Ovr 88)
Bryan Gil (25 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 88)
Azzedine Ounahi (26 anos, Marrocos - Pos: MD,M,MA(C) - Ovr 86)
Iván Martín (27 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 89)
Yáser Asprilla (22 anos, Colômbia - Pos: MA(DEC),A(DE) - Ovr 85)
Dawda Camara (23 anos, Mauritânia - Pos: MA(DE),A(DEC) - Ovr 76)
Gabriel Misehouy (20 anos, Holanda - Pos: M(C),MA(EC) - Ovr 76)
Jhon Solís (21 anos, Colômbia - Pos: MD,M,MA(C) - Ovr 82)
Joel Roca (20 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 83)
Lass Kourouma (22 anos, Guiné - Pos: M,MA(C) - Ovr 76)
Min-Su Kim (20 anos, República da Coreia - Pos: MA(DEC),A(DE) - Ovr 78)
Papa Ba (22 anos, Senegal - Pos: MA(DE),A(DEC) - Ovr 73)
Atacantes
Cristhian Stuani (39 anos, Uruguai - Pos: A(C) - Ovr 87)
Vladyslav Vanat (24 anos, Ucrânia - Pos: A(C) - Ovr 88)

Levante UD
Goleiros
Mathew Ryan (34 anos, Austrália - Pos: G - Ovr 87)
Álex Primo (21 anos, Espanha - Pos: G - Ovr 70)
Pablo Campos (24 anos, Espanha - Pos: G - Ovr 82)
Dani Martín (20 anos, Espanha - Pos: G - Ovr 73)
Defensores
Jeremy Toljan (31 anos, Alemanha - Pos: D(DE),MD,M(D) - Ovr 86)
Unai Elgezabal (33 anos, Espanha - Pos: D(C) - Ovr 84)
Diego Pampín (26 anos, Espanha - Pos: D,MD,M(E) - Ovr 83)
Kervin Arriaga (28 anos, Honduras - Pos: D,MD,M(C) - Ovr 83)
Adrián Dela (27 anos, Espanha - Pos: D(C) - Ovr 84)
Oriol Rey (28 anos, Espanha - Pos: D,MD,M(C) - Ovr 84)
Víctor García (28 anos, Espanha - Pos: D,MD,M,MA(D) - Ovr 82)
Xavi Grande (21 anos, Espanha - Pos: D,MD,M(D) - Ovr 76)
Jorge Cabello (22 anos, Espanha - Pos: D(C) - Ovr 80)
Meio-campistas
Roger Brugué (29 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 84)
Pablo Martínez (28 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 83)
Carlos Álvarez (22 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 85)
Jon Ander Olasagasti (25 anos, Espanha - Pos: MD,M(C) - Ovr 84)
Iván Romero (25 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 85)
Hugo Redón (23 anos, Espanha - Pos: M(C) - Ovr 67)
Tay Abed (21 anos, Israel - Pos: M(C),MA(DC) - Ovr 76)
Edgar Alcañiz (21 anos, Espanha - Pos: MD,M,MA(C) - Ovr 65)
Paco Cortés (18 anos, Espanha - Pos: MA(DEC) - Ovr 73)
Víctor Fernández (18 anos, Espanha - Pos: MA,A(DEC) - Ovr 73)
Kareem Tunde (20 anos, Espanha - Pos: MA,A(DE) - Ovr 75)
Atacantes
Karl Etta Eyong (22 anos, Camarões - Pos: A(C) - Ovr 85)
Carlos Espí (20 anos, Espanha - Pos: A(C) - Ovr 80)

Rayo Vallecano
Goleiros
Augusto Batalla (30 anos, Argentina - Pos: G - Ovr 87)
Dani Cárdenas (29 anos, Espanha - Pos: G - Ovr 83)
Defensores
Florian Lejeune (35 anos, França - Pos: D(C) - Ovr 87)
Iván Balliu (34 anos, Albânia - Pos: D,MD(DE) - Ovr 86)
Alfonso Espino (34 anos, Uruguai - Pos: D,MD,M(E) - Ovr 86)
Abdul Mumin (27 anos, Gana - Pos: D(C) - Ovr 86)
Luiz Felipe (29 anos, Itália - Pos: D(C) - Ovr 87)
Pep Chavarría (28 anos, Espanha - Pos: D,MD,M(E) - Ovr 87)
Andrei Rațiu (27 anos, Romênia - Pos: D,MD,M,MA(D) - Ovr 88)
Jozhua Vertrouwd (21 anos, Holanda - Pos: D(EC),MD,M(E) - Ovr 78)
Pelayo Fernández (23 anos, Espanha - Pos: D(C) - Ovr 77)
Nobel Mendy (21 anos, Senegal - Pos: D(EC) - Ovr 82)
Meio-campistas
Álvaro García (33 anos, Espanha - Pos: MA,A(DE) - Ovr 87)
Unai López (30 anos, Espanha - Pos: M,MA(C) - Ovr 87)
Isi Palazón (31 anos, Espanha - Pos: MA,A(DEC) - Ovr 88)
Pedro Díaz (27 anos, Espanha - Pos: M,MA(C) - Ovr 86)
Jorge de Frutos (29 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 88)
Óscar Valentín (31 anos, Espanha - Pos: MD,M(C) - Ovr 87)
Pathé Ciss (32 anos, Senegal - Pos: MD,M(C) - Ovr 87)
Randy Nteka (28 anos, Angola - Pos: MA,A(C) - Ovr 85)
Alexandre Alemão (28 anos, Brasil - Pos: MA(DE),A(DEC) - Ovr 85)
Fran Pérez (23 anos, Espanha - Pos: MA,A(DE) - Ovr 86)
Samu Becerra (20 anos, Espanha - Pos: M(C) - Ovr 73)
Atacantes
Raúl de Tomás (31 anos, Espanha - Pos: A(C) - Ovr 84)
Sergio Camello (25 anos, Espanha - Pos: A(C) - Ovr 86)

RCD Espanyol
Goleiros
Marko Dmitrović (34 anos, Sérvia - Pos: G - Ovr 87)
Ángel Fortuño (24 anos, Espanha - Pos: G - Ovr 76)
Defensores
Leandro Cabrera (34 anos, Uruguai - Pos: D(EC) - Ovr 87)
Fernando Calero (30 anos, Espanha - Pos: D(C) - Ovr 86)
Miguel Rubio (28 anos, Espanha - Pos: D(C) - Ovr 84)
Pablo Ramón (24 anos, Espanha - Pos: D(DEC) - Ovr 82)
José Gragera (26 anos, Espanha - Pos: D,MD,M(C) - Ovr 84)
Urko González de Zarate (25 anos, Espanha - Pos: D,MD,M(C) - Ovr 85)
Omar el Hilali (22 anos, Marrocos - Pos: D(DEC),MD(DE) - Ovr 87)
Clemens Riedel (22 anos, Alemanha - Pos: D(C) - Ovr 82)
Rubén Sánchez (25 anos, Espanha - Pos: D,MD,M,MA(D) - Ovr 83)
José Salinas (25 anos, Espanha - Pos: D,MD,M(E) - Ovr 83)
Hugo Pérez (23 anos, Espanha - Pos: D(C) - Ovr 76)
Antoniu Roca (23 anos, Espanha - Pos: D,MD,M(D),MA(DE) - Ovr 83)
Roger Hinojo (21 anos, Espanha - Pos: D,MD,M(E) - Ovr 78)
Meio-campistas
Pere Milla (33 anos, Espanha - Pos: MA,A(DEC) - Ovr 87)
Charles Pickel (29 anos, Congo DR - Pos: MD,M(C) - Ovr 84)
Edu Expósito (29 anos, Espanha - Pos: M,MA(C) - Ovr 87)
Javi Puado (28 anos, Espanha - Pos: MA,A(DEC) - Ovr 88)
Pol Lozano (26 anos, Espanha - Pos: MD,M(C) - Ovr 86)
Tyrhys Dolan (24 anos, Inglaterra - Pos: MA,A(DEC) - Ovr 85)
Justin Smith (23 anos, Canadá - Pos: MD,M,MA(C) - Ovr 78)
Jofre Carreras (24 anos, Espanha - Pos: MA,A(DE) - Ovr 85)
Rafel Bauzà (21 anos, Espanha - Pos: MD,M(C) - Ovr 78)
Javi Hernández (22 anos, Espanha - Pos: M,MA(C) - Ovr 80)
Atacantes
Kike García (36 anos, Espanha - Pos: A(C) - Ovr 87)
Roberto Fernández (23 anos, Espanha - Pos: A(C) - Ovr 86)
Omar Sadik (22 anos, Marrocos - Pos: A(C) - Ovr 78)
Marcos Fernández (23 anos, Espanha - Pos: A(C) - Ovr 80)

RCD Mallorca
Goleiros
Iván Cuellar (42 anos, Espanha - Pos: G - Ovr 78)
Leo Román (25 anos, Espanha - Pos: G - Ovr 85)
Lucas Bergström (23 anos, Finlândia - Pos: G - Ovr 80)
Defensores
Antonio Raíllo (34 anos, Espanha - Pos: D(C) - Ovr 87)
Johan Mojica (33 anos, Colômbia - Pos: D,MD,M(E) - Ovr 87)
Martin Valjent (30 anos, Eslováquia - Pos: D(C) - Ovr 87)
Pablo Maffeo (28 anos, Argentina - Pos: D,MD,M(D) - Ovr 87)
Toni Lato (28 anos, Espanha - Pos: D,MD,M(E) - Ovr 84)
Mateu Morey (26 anos, Espanha - Pos: D,MD,M(D) - Ovr 83)
Antonio Sánchez (29 anos, Espanha - Pos: D,MD(D),M,MA(DC) - Ovr 85)
Justin Kalumba (21 anos, França - Pos: D,MD,M(E),MA(DE) - Ovr 77)
David López (23 anos, Espanha - Pos: D(C) - Ovr 78)
Meio-campistas
Omar Mascarell (33 anos, Guiné Equatorial - Pos: MD,M(C) - Ovr 87)
Sergi Darder (32 anos, Espanha - Pos: MD(C),M,MA(EC) - Ovr 89)
Takuma Asano (31 anos, Japão - Pos: MA,A(DEC) - Ovr 86)
Cyle Larin (31 anos, Canadá - Pos: MA(DE),A(DEC) - Ovr 86)
Manu Morlanes (27 anos, Espanha - Pos: MD,M,MA(C) - Ovr 86)
Samú Costa (25 anos, Portugal - Pos: MD,M(C) - Ovr 88)
Daniel Luna (23 anos, Colômbia - Pos: MA(DEC) - Ovr 78)
Pablo Torre (23 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 85)
Javi Llabrés (23 anos, Espanha - Pos: MA(DEC) - Ovr 80)
Marc Domènech (19 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 80)
Jan Salas (20 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 76)
Jan Virgili (19 anos, Espanha - Pos: MA,A(DE) - Ovr 83)
Atacantes
Abdón Prats (34 anos, Espanha - Pos: A(C) - Ovr 85)
Vedat Muriqi (32 anos, Kosovo - Pos: A(C) - Ovr 89)

Real Betis
Goleiros
Pau López (31 anos, Espanha - Pos: G - Ovr 87)
Álvaro Valles (28 anos, Espanha - Pos: G - Ovr 87)
Guilherme Fernandes (25 anos, Portugal - Pos: G - Ovr 82)
Defensores
Marc Bartra (35 anos, Espanha - Pos: D(DC) - Ovr 88)
Ricardo Rodríguez (33 anos, Suíça - Pos: D(EC),MD,M(E) - Ovr 88)
Diego Llorente (32 anos, Espanha - Pos: D(C) - Ovr 88)
Héctor Bellerín (31 anos, Espanha - Pos: D,MD,M(D) - Ovr 87)
Júnior Firpo (29 anos, República Dominicana - Pos: D,MD,M(E) - Ovr 86)
Aitor Ruibal (30 anos, Espanha - Pos: D,MD,M,MA(D) - Ovr 87)
Bernardo Natan (25 anos, Brasil - Pos: D(EC) - Ovr 89)
Valentín Gómez (22 anos, Argentina - Pos: D(EC),MD(E) - Ovr 87)
Vasco Sousa (22 anos, Portugal - Pos: D(EC) - Ovr 70)
Álex Pérez (20 anos, Espanha - Pos: D(C) - Ovr 73)
Ángel Ortíz (21 anos, Espanha - Pos: D,MD,M,MA(D) - Ovr 80)
Rafael Guzmán (18 anos, Perú - Pos: D(C) - Ovr 65)
Meio-campistas
Alarcón Isco (34 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 91)
Chimy Ávila (32 anos, Argentina - Pos: MA(DE),A(DEC) - Ovr 86)
Giovani Lo Celso (30 anos, Argentina - Pos: M(C),MA(DEC) - Ovr 90)
Pablo Fornals (30 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 89)
Marc Roca (29 anos, Espanha - Pos: MD,M(C) - Ovr 89)
Álvaro Fidalgo (29 anos, México - Pos: M(C),MA(DEC) - Ovr 86)
Antony Santos (26 anos, Brasil - Pos: MA,A(DE) - Ovr 90)
Rodrigo Riquelme (26 anos, Espanha - Pos: M(DE),MA(DEC) - Ovr 89)
Iker Losada (24 anos, Espanha - Pos: MA,A(DEC) - Ovr 83)
Abde Ezzalzouli (24 anos, Marrocos - Pos: MA,A(DE) - Ovr 89)
Nelson Deossa (26 anos, Colômbia - Pos: M(C),MA(DEC) - Ovr 86)
Dani Pérez (20 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 77)
Sergi Altimira (24 anos, Espanha - Pos: MD,M(C) - Ovr 88)
Mateo Flores (22 anos, Espanha - Pos: MD,M(C) - Ovr 78)
Carlos Reina (21 anos, Espanha - Pos: MA(DEC) - Ovr 75)
Pablo García (19 anos, Espanha - Pos: MA,A(DE) - Ovr 82)
João Fersura (21 anos, Brasil - Pos: MA(DE),A(DEC) - Ovr 65)
Rubén Richarte (19 anos, Espanha - Pos: MA,A(DE) - Ovr 65)
José Antonio Morante (18 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 70)
Atacantes
Cédric Bakambu (35 anos, Congo DR - Pos: A(C) - Ovr 87)
Cucho Hernández (27 anos, Colômbia - Pos: A(C) - Ovr 89)
Gonzalo Petit (19 anos, Uruguai - Pos: A(C) - Ovr 80)

Real Madrid
Goleiros
Thibaut Courtois (34 anos, Bélgica - Pos: G - Ovr 95)
Andriy Lunin (27 anos, Ucrânia - Pos: G - Ovr 88)
Sergio Mestre (21 anos, Espanha - Pos: G - Ovr 70)
Ferrán Quetglas (20 anos, Espanha - Pos: G - Ovr 65)
Fran González (20 anos, Espanha - Pos: G - Ovr 78)
Ilya Voloshyn (19 anos, Ucrânia - Pos: G - Ovr 65)
Álvaro González (19 anos, Espanha - Pos: G - Ovr 65)
Diego Arroyo (20 anos, Espanha - Pos: G - Ovr 63)
Guille Ponce (17 anos, Espanha - Pos: G - Ovr 65)
Javi Navarro (19 anos, Espanha - Pos: G - Ovr 65)
Defensores
Antonio Rüdiger (33 anos, Alemanha - Pos: D(C) - Ovr 93)
Federico Valverde (27 anos, Uruguai - Pos: D(D),MD,M(DC) - Ovr 94)
Ferland Mendy (30 anos, França - Pos: D,MD,M(E) - Ovr 89)
Trent Alexander-Arnold (27 anos, Inglaterra - Pos: D,MD,M(D) - Ovr 94)
Éder Militão (28 anos, Brasil - Pos: D(DC) - Ovr 93)
Aurélien Tchouameni (26 anos, França - Pos: D,MD,M(C) - Ovr 93)
Fran García (26 anos, Espanha - Pos: D,MD,M(E) - Ovr 89)
Eduardo Camavinga (23 anos, França - Pos: D(E),MD,M(EC) - Ovr 92)
Álvaro Carreras (23 anos, Espanha - Pos: D(EC),MD,M(E) - Ovr 90)
Dean Huijsen (21 anos, Espanha - Pos: D(C) - Ovr 90)
Raúl Asencio (23 anos, Espanha - Pos: D(DC) - Ovr 88)
Joan Martínez (18 anos, Espanha - Pos: D(C) - Ovr 75)
Mario Rivas (19 anos, Espanha - Pos: D(C) - Ovr 73)
Diego Aguado (19 anos, Espanha - Pos: D(EC),MD,M(E) - Ovr 73)
Víctor Valdepeñas (19 anos, Espanha - Pos: D(EC),MD,M(E) - Ovr 76)
David Jiménez (22 anos, Espanha - Pos: D,MD,M(D) - Ovr 75)
Manu Serrano (22 anos, Espanha - Pos: D(EC),MD,M(E) - Ovr 73)
Emanuel Benjamín (18 anos, Itália - Pos: D,MD,M(D) - Ovr 68)
Cristian Perea (20 anos, Espanha - Pos: D,MD,M(C) - Ovr 75)
Jesús Fortea (19 anos, Espanha - Pos: D,MD,M(D) - Ovr 75)
Melvin Ukpeigbe (19 anos, Espanha - Pos: D,MD,M(D) - Ovr 70)
Óscar Mesa (19 anos, Espanha - Pos: D,MD,M(E) - Ovr 65)
Alejandro Moya (20 anos, Espanha - Pos: D,MD,M(D) - Ovr 70)
Alfredo Sotres (22 anos, Espanha - Pos: D(C) - Ovr 70)
Álex Pérez (20 anos, Espanha - Pos: D(C) - Ovr 65)
Liberto Navascués (19 anos, Espanha - Pos: D,MD,M(E) - Ovr 65)
Jorge Cestero (20 anos, Espanha - Pos: D,MD,M(C) - Ovr 75)
Izan Regueira (20 anos, Espanha - Pos: D,MD,M(C) - Ovr 65)
Lamini Fati (20 anos, Espanha - Pos: D(C) - Ovr 70)
Eric Gómez (22 anos, Espanha - Pos: D,MD,M,MA(E) - Ovr 65)
Álvaro Lezcano (18 anos, Espanha - Pos: D(DEC) - Ovr 65)
Javi Bailón (18 anos, Espanha - Pos: D,MD,M(D) - Ovr 65)
Diego Lacosta (18 anos, Espanha - Pos: D,MD,M(C) - Ovr 65)
Ferran Seco (18 anos, Espanha - Pos: D(C) - Ovr 65)
Ariel Nkoghe (19 anos, Espanha - Pos: D(EC) - Ovr 65)
Javi Mena (19 anos, Espanha - Pos: D,MD,M(E) - Ovr 65)
Meio-campistas
Dani Ceballos (29 anos, Espanha - Pos: M,MA(C) - Ovr 89)
Kylian Mbappé (27 anos, França - Pos: MA(E),A(EC) - Ovr 96)
Brahim Díaz (26 anos, Marrocos - Pos: MA,A(DEC) - Ovr 90)
Vinícius Júnior (25 anos, Brasil - Pos: MA(E),A(EC) - Ovr 95)
Goes Rodrygo (25 anos, Brasil - Pos: MA(DE),A(DEC) - Ovr 93)
Jude Bellingham (22 anos, Inglaterra - Pos: M,MA(EC) - Ovr 95)
Arda Güler (21 anos, Turquia - Pos: M(C),MA(DEC) - Ovr 90)
Felipe Endrick (19 anos, Brasil - Pos: MA(DE),A(DEC) - Ovr 88)
Mario Martín (22 anos, Espanha - Pos: MD,M(C) - Ovr 85)
Gonzalo García (22 anos, Espanha - Pos: MA,A(DEC) - Ovr 82)
Manuel Ángel (22 anos, Espanha - Pos: M,MA(C) - Ovr 77)
Jeremy de León (22 anos, Porto Rico - Pos: MA(DE) - Ovr 73)
Franco Mastantuono (18 anos, Argentina - Pos: MA(DEC),A(DE) - Ovr 87)
Daniel Yáñez (19 anos, Espanha - Pos: MA,A(DE) - Ovr 70)
Daniel Mesonero (20 anos, Espanha - Pos: M(C),MA(DC) - Ovr 65)
Thiago Pitarch (18 anos, Espanha - Pos: M,MA(C) - Ovr 76)
Pablo Montero (19 anos, Espanha - Pos: MD,M,MA(C) - Ovr 65)
Álvaro Leiva (21 anos, Espanha - Pos: MA,A(DEC) - Ovr 73)
César Palacios (21 anos, Espanha - Pos: M,MA,A(C) - Ovr 77)
Pol Fortuny (21 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 75)
Hugo de Llanos (21 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 73)
Pol Durán (19 anos, Espanha - Pos: MD,M,MA(C) - Ovr 68)
Álex Mora (18 anos, Espanha - Pos: MA,A(C) - Ovr 65)
Enzo Alves (16 anos, Espanha - Pos: MA,A(C) - Ovr 65)
Roberto Martín (19 anos, Espanha - Pos: M(C),MA(EC) - Ovr 65)
Carlos Rodríguez (22 anos, Espanha - Pos: MD,M(C) - Ovr 65)
Joan Mascaró (20 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 65)
Aimar Santiago (19 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 65)
Carlos Díez (19 anos, Espanha - Pos: MA(DEC) - Ovr 65)
Beto Martínez (19 anos, Espanha - Pos: MD,M,MA(C) - Ovr 65)
José Reyes (18 anos, Espanha - Pos: MA,A(EC) - Ovr 65)
Ignacio Gascón (19 anos, Espanha - Pos: MD,M(C) - Ovr 65)
Álvaro Vega (15 anos, Espanha - Pos: MA,A(EC) - Ovr 65)
Gabri Castrelo (19 anos, Espanha - Pos: M,MA(C) - Ovr 65)
Bruno Galassi (19 anos, Espanha - Pos: MD,M(C) - Ovr 65)
Marco Company (17 anos, Espanha - Pos: MD,M,MA(C) - Ovr 70)
Gabri Valero (18 anos, Espanha - Pos: MA(DEC) - Ovr 65)
Leon Westin Bryhn (17 anos, Suécia - Pos: M,MA(C) - Ovr 65)
Adrián Pérez (18 anos, Espanha - Pos: MA(DE) - Ovr 65)
Yeremaiah Ramos (17 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 65)
Manex Rezola (19 anos, Espanha - Pos: MA,A(DE) - Ovr 73)
Atacantes
Enrique Herrero (21 anos, Espanha - Pos: A(C) - Ovr 70)
Iker Gil (21 anos, Espanha - Pos: A(C) - Ovr 70)
Rachad Fettal (21 anos, Espanha - Pos: A(C) - Ovr 75)
Álvaro Ginés (21 anos, Espanha - Pos: A(C) - Ovr 67)
Jacobo Ortega (20 anos, Espanha - Pos: A(C) - Ovr 70)
Jaime Barroso (18 anos, Espanha - Pos: A(C) - Ovr 65)
Alexis Ciria (18 anos, Espanha - Pos: A(C) - Ovr 70)
Carlos Sánchez (16 anos, Espanha - Pos: A(C) - Ovr 65)
Fran Santamaría (18 anos, Espanha - Pos: A(C) - Ovr 70)

Real Oviedo
Goleiros
Aarón Escandell (30 anos, Espanha - Pos: G - Ovr 85)
Defensores
David Costas (31 anos, Espanha - Pos: D(C) - Ovr 84)
Leander Dendoncker (31 anos, Bélgica - Pos: D,MD,M(C) - Ovr 87)
Dani Calvo (32 anos, Espanha - Pos: D(C) - Ovr 83)
Nacho Vidal (31 anos, Espanha - Pos: D,MD,M(D) - Ovr 86)
Lucas Ahijado (31 anos, Espanha - Pos: D,MD,M(D),MA(DE) - Ovr 82)
Oier Luengo (28 anos, Espanha - Pos: D(DC) - Ovr 82)
Rahim Alhassane (24 anos, Níger - Pos: D(EC),MD(E) - Ovr 84)
Marco Esteban (20 anos, Espanha - Pos: D(DC) - Ovr 73)
Chukwuma Eze (22 anos, Nigéria - Pos: D(C) - Ovr 67)
Meio-campistas
Santi Cazorla (41 anos, Espanha - Pos: M,MA(C) - Ovr 83)
Ovie Ejaria (28 anos, Inglaterra - Pos: M(C),MA(DEC) - Ovr 80)
Jacobo González (29 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 79)
Luka Ilić (26 anos, Sérvia - Pos: M,MA(C) - Ovr 83)
Haissem Hassan (24 anos, Egito - Pos: MA,A(DE) - Ovr 85)
Kwasi Sibo (27 anos, Gana - Pos: MD,M(C) - Ovr 83)
Brandon Dominguès (25 anos, França - Pos: MA(DEC),A(DE) - Ovr 80)
Álex Cardero (22 anos, Espanha - Pos: M,MA(C) - Ovr 76)
Daniel Paraschiv (27 anos, Romênia - Pos: M,MA,A(C) - Ovr 82)
Alberto del Moral (25 anos, Espanha - Pos: MD,M,MA(C) - Ovr 80)
Alberto Reina (28 anos, Espanha - Pos: MD,M,MA(C) - Ovr 83)
Ilyas Chaira (25 anos, Marrocos - Pos: MA,A(DE) - Ovr 85)
Pablo Sáenz (25 anos, Espanha - Pos: MA,A(DEC) - Ovr 76)
Pablo Agudín (18 anos, Espanha - Pos: M,MA(C) - Ovr 73)
Atacantes

Real Sociedad
Goleiros
Álex Remiro (31 anos, Espanha - Pos: G - Ovr 90)
Unai Marrero (24 anos, Espanha - Pos: G - Ovr 80)
Adrián Zango (20 anos, Espanha - Pos: G - Ovr 65)
Defensores
Álvaro Odriozola (30 anos, Espanha - Pos: D,MD,M(D) - Ovr 83)
Igor Zubeldia (29 anos, Espanha - Pos: D,MD(C) - Ovr 89)
Sergio Gómez (25 anos, Espanha - Pos: D,MD,M(E),MA(DEC) - Ovr 88)
Aihen Muñoz (28 anos, Espanha - Pos: D,MD,M(E) - Ovr 88)
Jon Pacheco (25 anos, Espanha - Pos: D(C) - Ovr 88)
Javi López (24 anos, Espanha - Pos: D,MD,M(E) - Ovr 87)
Jon Aramburu (23 anos, Venezuela - Pos: D,MD,M(D) - Ovr 88)
Jon Martín (20 anos, Espanha - Pos: D(DC) - Ovr 85)
Iker Ropero (20 anos, Espanha - Pos: D(C) - Ovr 70)
Meio-campistas
Gonçalo Guedes (29 anos, Portugal - Pos: MA,A(DEC) - Ovr 87)
Mikel Oyarzabal (29 anos, Espanha - Pos: MA,A(DEC) - Ovr 92)
Carlos Soler (29 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 88)
Yangel Herrera (28 anos, Venezuela - Pos: MD,M,MA(C) - Ovr 89)
Takefusa Kubo (25 anos, Japão - Pos: MA(DEC),A(DE) - Ovr 91)
Brais Méndez (29 anos, Espanha - Pos: M,MA(DC) - Ovr 90)
Ander Barrenetxea (24 anos, Espanha - Pos: MA,A(DE) - Ovr 88)
Luka Sučić (23 anos, Croácia - Pos: M,MA(C) - Ovr 87)
Beñat Turrientes (24 anos, Espanha - Pos: MD,M(C) - Ovr 88)
Arsen Zakharyan (23 anos, Rússia - Pos: MA(DEC) - Ovr 87)
Pablo Marín (22 anos, Espanha - Pos: M,MA(C) - Ovr 85)
Mikel Goti (24 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 78)
Gassova Wesley (21 anos, Brasil - Pos: MA,A(DEC) - Ovr 81)
Jon Gorrotxategi (24 anos, Espanha - Pos: MD,M(C) - Ovr 85)
Atacantes
Carlos Fernández (30 anos, Espanha - Pos: A(C) - Ovr 83)
Jon Karrikaburu (23 anos, Espanha - Pos: A(C) - Ovr 82)
Orri Óskarsson (21 anos, Islândia - Pos: A(C) - Ovr 85)
Sydney Osazuwa (19 anos, Espanha - Pos: A(C) - Ovr 70)

Sevilla FC
Goleiros
Orjan Nyland (35 anos, Noruega - Pos: G - Ovr 85)
Rayan Azouagh (19 anos, Marrocos - Pos: G - Ovr 65)
Defensores
Nemanja Gudelj (34 anos, Sérvia - Pos: D,MD(C) - Ovr 88)
Fábio Cardoso (32 anos, Portugal - Pos: D(C) - Ovr 85)
Gabriel Suazo (28 anos, Chile - Pos: D,MD,M(E) - Ovr 86)
Teixeira Marcão (29 anos, Brasil - Pos: D(C) - Ovr 86)
Adrià Pedrosa (28 anos, Espanha - Pos: D,MD,M(E) - Ovr 87)
Tanguy Nianzou (23 anos, França - Pos: D(C) - Ovr 85)
Federico Gattoni (27 anos, Argentina - Pos: D(C) - Ovr 83)
Juanlu Sánchez (22 anos, Espanha - Pos: D,MD(D),M,MA(DC) - Ovr 87)
José Angel Carmona (24 anos, Espanha - Pos: D(DEC),MD,M(DE) - Ovr 87)
Kike Salas (24 anos, Espanha - Pos: D(EC) - Ovr 86)
Andrés Castrín (23 anos, Espanha - Pos: D(C) - Ovr 78)
Joaquin Oso (22 anos, Espanha - Pos: D,MD,M,MA(E) - Ovr 73)
Sergio Martínez (22 anos, Espanha - Pos: D(C) - Ovr 73)
Robert Jalade (21 anos, Romênia - Pos: D,MD(C) - Ovr 70)
Héctor Rangel (19 anos, Espanha - Pos: D(C) - Ovr 65)
Manu Arenas (20 anos, Espanha - Pos: D,MD,M(E) - Ovr 65)
David López (21 anos, Espanha - Pos: D,MD,M(E) - Ovr 70)
Meio-campistas
Alexis Sánchez (37 anos, Chile - Pos: MA,A(DEC) - Ovr 86)
Adnan Januzaj (31 anos, Bélgica - Pos: MA(DEC),A(DE) - Ovr 83)
Joan Jordán (31 anos, Espanha - Pos: MD,M,MA(C) - Ovr 86)
Djibril Sow (29 anos, Suíça - Pos: MD,M,MA(C) - Ovr 88)
Rafa Mir (28 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 86)
Chidera Ejuke (28 anos, Nigéria - Pos: MA,A(DE) - Ovr 85)
Rubén Vargas (27 anos, Suíça - Pos: MA(DEC),A(DE) - Ovr 88)
Lucien Agoumé (24 anos, França - Pos: MD,M(C) - Ovr 87)
Peque Fernández (23 anos, Espanha - Pos: MA,A(DEC) - Ovr 85)
Alfon González (27 anos, Espanha - Pos: MA,A(DE) - Ovr 86)
Manu Bueno (21 anos, Espanha - Pos: MD,M(C) - Ovr 78)
Isaac Romero (26 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 87)
Juan Cortéz (21 anos, México - Pos: M,MA(DE) - Ovr 67)
Nico Guillén (18 anos, Espanha - Pos: MD,M(C) - Ovr 70)
Atacantes
Akor Adams (26 anos, Nigéria - Pos: A(C) - Ovr 86)
Iker Villar (20 anos, Espanha - Pos: A(C) - Ovr 65)

Valencia CF
Goleiros
Stole Dimitrievski (32 anos, Macedónia do Norte - Pos: G - Ovr 86)
Cristian Rivero (28 anos, Espanha - Pos: G - Ovr 76)
Defensores
Dimitri Foulquier (33 anos, Guadalupe - Pos: D,MD,M(DE) - Ovr 87)
Josè Gayá (31 anos, Espanha - Pos: D,MD,M(E) - Ovr 89)
Renzo Saravia (32 anos, Argentina - Pos: D(DC),MD,M(D) - Ovr 84)
Mouctar Diakhaby (29 anos, Guiné - Pos: D(C) - Ovr 86)
Eray Cömert (28 anos, Suíça - Pos: D,MD(C) - Ovr 86)
Thierry Correia (27 anos, Portugal - Pos: D,MD,M(D) - Ovr 87)
Cenk Özkacar (25 anos, Turquia - Pos: D(C) - Ovr 85)
Jesús Vázquez (23 anos, Espanha - Pos: D,MD,M(E) - Ovr 83)
José Copete (26 anos, Espanha - Pos: D(C) - Ovr 86)
César Tarrega (24 anos, Espanha - Pos: D(C) - Ovr 88)
Iker Córdoba (20 anos, Espanha - Pos: D(EC) - Ovr 77)
Ismael Santana (22 anos, Espanha - Pos: D,MD,M(D),MA(DE) - Ovr 70)
Meio-campistas
Baptiste Santamaria (31 anos, França - Pos: MD,M(C) - Ovr 88)
Luis Rioja (32 anos, Espanha - Pos: MA,A(DE) - Ovr 87)
Guido Rodríguez (32 anos, Argentina - Pos: MD,M(C) - Ovr 87)
Sergi Canós (29 anos, Espanha - Pos: M,MA(DE) - Ovr 83)
José Luis Pepelu (27 anos, Espanha - Pos: MD,M(C) - Ovr 88)
Arnaut Danjuma (29 anos, Holanda - Pos: MA(DE),A(DEC) - Ovr 88)
Dani Raba (30 anos, Espanha - Pos: MA,A(DEC) - Ovr 85)
Filip Ugrinic (27 anos, Suíça - Pos: M,MA(DEC) - Ovr 85)
André Almeida (26 anos, Portugal - Pos: M,MA(C) - Ovr 88)
Diego López (24 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 88)
Javi Guerra (23 anos, Espanha - Pos: MD,M(C) - Ovr 89)
Pablo López (20 anos, Espanha - Pos: MA,A(DE) - Ovr 73)
Hamza Bellari (23 anos, Marrocos - Pos: MA,A(DE) - Ovr 70)
Atacantes
Umar Sadiq (29 anos, Nigéria - Pos: A(C) - Ovr 87)
Hugo Duro (26 anos, Espanha - Pos: A(C) - Ovr 88)
Alberto Marí (24 anos, Espanha - Pos: A(C) - Ovr 80)

Villarreal CF
Goleiros
Arnau Tenas (25 anos, Espanha - Pos: G - Ovr 84)
Diego Conde (27 anos, Espanha - Pos: G - Ovr 86)
Luiz Júnior (25 anos, Brasil - Pos: G - Ovr 88)
Alex Quevedo (22 anos, Espanha - Pos: G - Ovr 70)
Defensores
Juan Foyth (28 anos, Argentina - Pos: D(DC) - Ovr 89)
Tajon Buchanan (27 anos, Canadá - Pos: D,MD(D),M,MA(DE) - Ovr 88)
Logan Costa (25 anos, Cabo Verde - Pos: D(C) - Ovr 89)
Sergi Cardona (26 anos, Espanha - Pos: D,MD,M(E) - Ovr 90)
Renato Veiga (22 anos, Portugal - Pos: D(EC),MD(C) - Ovr 89)
Alex Freeman (21 anos, Estados Unidos - Pos: D,MD,M(D) - Ovr 82)
Carlos Romero (24 anos, Espanha - Pos: D,MD,M,MA(E) - Ovr 87)
Santiago Mouriño (24 anos, Uruguai - Pos: D(DC) - Ovr 87)
Willy Kambwala (21 anos, Congo DR - Pos: D(DC) - Ovr 82)
Pau Navarro (21 anos, Espanha - Pos: D(DC) - Ovr 82)
Fran Gil (21 anos, Espanha - Pos: D(EC) - Ovr 65)
Meio-campistas
Gerard Moreno (34 anos, Espanha - Pos: MA(D),A(DC) - Ovr 90)
Ayoze Pérez (32 anos, Espanha - Pos: MA,A(DEC) - Ovr 91)
Nicolas Pépé (31 anos, Costa do Marfim - Pos: MA(D),A(DC) - Ovr 88)
Santi Comesaña (29 anos, Espanha - Pos: MD,M,MA(C) - Ovr 90)
Pape Gueye (27 anos, Senegal - Pos: MD,M(C) - Ovr 89)
Ilias Akhomach (22 anos, Marrocos - Pos: MA,A(DE) - Ovr 87)
Alberto Moleiro (22 anos, Espanha - Pos: MA(DEC) - Ovr 90)
Ramón Terrats (25 anos, Espanha - Pos: MD,M(C) - Ovr 85)
Thiago Ojeda (23 anos, Argentina - Pos: M,MA,A(C) - Ovr 78)
Thiago Fernández (22 anos, Argentina - Pos: MA(DEC),A(DE) - Ovr 82)
Dani Requena (22 anos, Espanha - Pos: M,MA(C) - Ovr 78)
Luis Quintero (21 anos, Colômbia - Pos: MA(DEC),A(DE) - Ovr 73)
Víctor Moreno (20 anos, Espanha - Pos: MA,A(DE) - Ovr 73)
Toni Tamarit (20 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 73)
Iker Punzano (21 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 70)
Atacantes
Georges Mikautadze (25 anos, Geórgia - Pos: A(C) - Ovr 89)
Tani Oluwaseyi (26 anos, Canadá - Pos: A(C) - Ovr 86)
Álex Forés (25 anos, Espanha - Pos: A(C) - Ovr 82)
Pau Cabanes (21 anos, Espanha - Pos: A(C) - Ovr 78)
Pablo Arenzana (20 anos, Espanha - Pos: A(C) - Ovr 70)

RC Deportivo
Goleiros
Germán Parreño (33 anos, Espanha - Pos: G - Ovr 80)
Álvaro Fernández (28 anos, Espanha - Pos: G - Ovr 84)
Eric Puerto (23 anos, Espanha - Pos: G - Ovr 75)
Defensores
Sergio Escudero (36 anos, Espanha - Pos: D,MD,M(E) - Ovr 80)
Ximo Navarro (36 anos, Espanha - Pos: D(DC),MD(D) - Ovr 80)
Miguel Loureiro (29 anos, Espanha - Pos: D,MD,M(D) - Ovr 82)
Giacomo Quagliata (26 anos, Itália - Pos: D,MD,M(E) - Ovr 82)
Diego Villares (29 anos, Espanha - Pos: D(D),MD,M,MA(DC) - Ovr 82)
Álex Petxarroman (29 anos, Espanha - Pos: D(DC),MD,M(D) - Ovr 78)
Arnau Comas (26 anos, Espanha - Pos: D(C) - Ovr 80)
Dani Barcia (23 anos, Espanha - Pos: D,MD(C) - Ovr 82)
David Mella (21 anos, Espanha - Pos: D,MD(E),M,MA(DE) - Ovr 83)
Lucas Noubi (21 anos, Bélgica - Pos: D(DC) - Ovr 80)
Adrià Altimira (25 anos, Espanha - Pos: D,MD,M,MA(DE) - Ovr 83)
Meio-campistas
Cristian Herrera (35 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 80)
José Ángel Jurado (33 anos, Espanha - Pos: MD,M(C) - Ovr 80)
Riki Rodríguez (28 anos, Espanha - Pos: M(C),MA(DEC) - Ovr 82)
Yeremay Hernández (23 anos, Espanha - Pos: MA(DEC),A(DE) - Ovr 85)
Mario Soriano (24 anos, Espanha - Pos: MA(DEC) - Ovr 82)
Charlie Patino (22 anos, Inglaterra - Pos: MD,M,MA(C) - Ovr 80)
Luismi Cruz (25 anos, Espanha - Pos: MA,A(DEC) - Ovr 82)
Luis Chacón (26 anos, Espanha - Pos: MA,A(DEC) - Ovr 78)
Jairo Noriega (22 anos, Espanha - Pos: M,MA(C) - Ovr 73)
Diego Gómez (21 anos, Espanha - Pos: MA,A(DE) - Ovr 76)
Kevin Sánchez (21 anos, Espanha - Pos: MA(DE),A(DEC) - Ovr 73)
Rubén López (21 anos, Espanha - Pos: M,MA(C) - Ovr 73)
Adrián Guerrero (20 anos, Espanha - Pos: MA,A(DE) - Ovr 73)
Atacantes
Zakaria Eddahchouri (26 anos, Holanda - Pos: A(C) - Ovr 78)
Mohamed Bouldini (30 anos, Marrocos - Pos: A(C) - Ovr 82)
Martin Ochoa (21 anos, Espanha - Pos: A(C) - Ovr 73)
Bil Nsongo (21 anos, Camarões - Pos: A(C) - Ovr 73)
`, {}, [], 6000, 80, 4);
