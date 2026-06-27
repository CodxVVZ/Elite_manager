import fs from 'fs';

let content = fs.readFileSync('lib/teams.ts', 'utf-8');

const posOverride = `export const PLAYER_POS_OVERRIDE: Record<string, string> = {
  "Vinícius Júnior": "LW", "Goes Rodrygo": "RW", "Kylian Mbappé": "ST", "Felipe Endrick": "ST",
  "Eduardo Camavinga": "CM", "Federico Valverde": "CM", "Aurélien Tchouameni": "CDM", 
  "Trent Alexander-Arnold": "RB", "Brahim Díaz": "CAM", "Arda Güler": "RM", "Jude Bellingham": "CAM",
  "Lamine Yamal": "RW", "Belloli Raphinha": "LW", "Ansu Fati": "LW", "Ferrán Torres": "LW", "Dani Olmo": "CAM",
  "Marc Casadó": "CDM", "Erling Haaland": "ST", "Phil Foden": "RW", "Bernardo Silva": "RM", "Kevin De Bruyne": "CAM",
  "Bukayo Saka": "RW", "Gabriel Martinelli": "LW", "Martin Ødegaard": "CAM", "Cole Palmer": "CAM", "Noni Madueke": "RW",
  "Bruno Fernandes": "CAM", "Marcus Rashford": "LW", "Alejandro Garnacho": "LW", "Jadon Sancho": "LW", "Antony": "RW",
  "Mohamed Salah": "RW", "Luis Díaz": "LW", "Diogo Jota": "ST", "Cody Gakpo": "LW", "Son Heung-min": "LW",
  "Dejan Kulusevski": "RW", "James Maddison": "CAM", "Ousmane Dembélé": "RW", "Bradley Barcola": "LW",
  "Marco Asensio": "RW", "Antoine Griezmann": "ST", "Julian Alvarez": "ST", "Leroy Sané": "RW",
  "Kingsley Coman": "LW", "Jamal Musiala": "CAM", "Florian Wirtz": "CAM", "Rafael Leão": "LW",
  "Christian Pulisic": "RW", "Khvicha Kvaratskhelia": "LW", "Lautaro Martínez": "ST", "Marcus Thuram": "ST",
  "Riyad Mahrez": "RW", "Neymar Jr": "LW", "Lionel Messi": "RW", "Cristiano Ronaldo": "ST",
  "Rayan Cherki": "CAM", "Nico Williams": "LW", "Moreira Savinho": "RW", "Jérémy Doku": "LW", "Jack Grealish": "LW"
};`;

// Also fix foreign players for typical stars
const extraForeign = `  "Vinícius Júnior": "BR", "Goes Rodrygo": "BR", "Felipe Endrick": "BR", "Éder Militão": "BR",
  "Kylian Mbappé": "FRA", "Eduardo Camavinga": "FRA", "Aurélien Tchouameni": "FRA", "Ferland Mendy": "FRA",
  "Thibaut Courtois": "BEL", "Andriy Lunin": "UKR", "Antonio Rüdiger": "GER", "Federico Valverde": "URU",
  "Jude Bellingham": "ENG", "Arda Güler": "TUR", "Lamine Yamal": "ESP", "Belloli Raphinha": "BR",
  "Brahim Díaz": "MAR", "Dani Ceballos": "ESP", "Fran García": "ESP", "Joan Martínez": "ESP",
  "Robert Lewandowski": "POL", "Wojciech Szczęsny": "POL", "Marc-André Ter Stegen": "GER", "Frenkie de Jong": "NED",
  "Andreas Christensen": "DEN", "Ronald Araújo": "URU", "Jules Koundé": "FRA", "Dani Olmo": "ESP", "Marc Casadó": "ESP", "Fermín López": "ESP", "Pablo Gavi": "ESP", "Gonzalez Pedri": "ESP",
  "Erling Haaland": "NOR", "Kevin De Bruyne": "BEL", "Bernardo Silva": "POR", "Rúben Dias": "POR", "Ederson": "BR", "Joško Gvardiol": "CRO", "Mateo Kovačić": "CRO", "Jérémy Doku": "BEL",
  "Martin Ødegaard": "NOR", "Gabriel Martinelli": "BR", "Gabriel Magalhães": "BR", "Gabriel Jesus": "BR", "William Saliba": "FRA",
  "Becker Alisson": "BR",
  "Bruno Fernandes": "POR", "Lisandro Martínez": "ARG", "Alejandro Garnacho": "ARG", "Casemiro": "BR", "Antony": "BR",
  "Mohamed Salah": "EGY", "Luis Díaz": "COL", "Darwin Núñez": "URU", "Alisson Becker": "BR", "Virgil van Dijk": "NED",
  "Son Heung-min": "KOR", "Dejan Kulusevski": "SWE", "Cristian Romero": "ARG", "Richarlison": "BR",
  "Lucas Paquetá": "BR", "Bruno Guimarães": "BR", "Joelinton": "BR",
  "Antoine Griezmann": "FRA", "Jan Oblak": "SVN",
`;

if (!content.includes('PLAYER_POS_OVERRIDE')) {
    content = content.replace('export const FOREIGN_PLAYERS: Record<string, string> = {', posOverride + '\n\nexport const FOREIGN_PLAYERS: Record<string, string> = {\n' + extraForeign);
}

// Modify assignPos to use PLAYER_POS_OVERRIDE
content = content.replace('function assignPos(cat: string, name: string) {', 'function assignPos(cat: string, name: string) {\n      if (PLAYER_POS_OVERRIDE[name]) return PLAYER_POS_OVERRIDE[name];');

fs.writeFileSync('lib/teams.ts', content);
console.log("Fixed!");
