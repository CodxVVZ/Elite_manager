const fs = require('fs');

const input = `
América Mineiro
Goleiros
Italo Brito (19 anos, Brasil)
Gustavo - 1 (33 anos, 1.85 m, Brasil)
William - 19 (28 anos, 1.93 m, Brasil)
Cássio - 27 (24 anos, 1.88 m, Brasil)
Defensores
Heitor (22 anos, 1.85 m, Brasil)
Emerson Santos - 2 (31 anos, 1.83 m, Brasil)
Nathan Cardoso - 3 (31 anos, 1.91 m, Brasil)
Rafael Barcelos - 4 (22 anos, 1.83 m, Brasil)
Paulinho - 6 (21 anos, 1.83 m, Brasil)
Samuel - 12 (22 anos, 1.78 m, Brasil)
Léo Alaba - 22 (26 anos, 1.78 m, Brasil)
Luidy - 30 (17 anos, Brasil)
Dalbert - 36 (32 anos, 1.80 m, Brasil)
Jhonny Cardinoti Pedro - 42 (24 anos, 1.78 m, Brasil)
Wesley Augusto Henn Marth - 43 (26 anos, Brasil)
Thallyson - 44 (20 anos, Brasil)
Ricardo Silva - 45 (33 anos, 1.91 m, Brasil)
Artur - 96 (31 anos, 1.78 m, Brasil)
Meio-campistas
Kaique Zizero (19 anos, 1.78 m, Brasil)
Fernando Elizari - 5 (35 anos, 1.73 m, Argentina)
Felipe Amaral - 8 (22 anos, Brasil)
Yago Souza - 10 (20 anos, 1.73 m, Brasil)
Thauan Willians Jesus Silva - 11 (22 anos, 1.83 m, Brasil)
Alê - 16 (35 anos, 1.83 m, Brasil)
Eduardo Luiz Person - 21 (29 anos, Brasil)
Yago Santos - 33 (23 anos, 1.83 m, Brasil)
Otávio Gonçalves - 55 (20 anos, Brasil)
Val - 97 (29 anos, 1.75 m, Brasil)
Atacantes
Zé Lucas - 58 (18 anos, 1.75 m, Brasil)
Gabriel De Sousa Barros - 7 (24 anos, 1.73 m, Brasil)
Willian - 9 (39 anos, 1.70 m, Brasil)
Gonzalo Mastriani - 17 (33 anos, 1.80 m, Uruguai)
Paulo Victor - 20 (25 anos, 1.80 m, Brasil)
Everton Sidnei De Brito - 23 (31 anos, 1.70 m, Brasil)
Yarlen - 67 (20 anos, 1.78 m, Brasil)
Matías Segovia - 77 (23 anos, 1.68 m, Paraguai)
Pedro Geovane Paranhos Santos - 80 (19 anos, Brasil)
Jhonatan Lima - 88 (20 anos, 1.83 m, Brasil)

Sport
Goleiros
Halls - 1 (26 anos, Brasil)
Dênis - 12 (39 anos, 1.88 m, Brasil)
Thiago Couto - 26 (27 anos, 1.88 m, Brasil)
Antônio Adriano - 42 (23 anos, Brasil)
Victor Hugo Barbosa De Farias - 79 (19 anos, Brasil)
Erick - 90 (19 anos, Brasil)
Defensores
Marcelo - 3 (23 anos, Brasil)
Ze Marcos - 4 (28 anos, 1.88 m, Brasil)
Marcelo Benevenuto - 5 (30 anos, 1.80 m, Brasil)
Mádson - 13 (34 anos, 1.83 m, Brasil)
Habraão - 28 (24 anos, 1.88 m, Brasil)
Davi Gabriel - 29 (28 anos, 1.83 m, Brasil)
Felipinho - 60 (29 anos, Brasil)
Patrick - 63 (21 anos, Brasil)
Rafinha - 66 (20 anos, Brasil)
Augusto Pucci - 68 (18 anos, Brasil)
Cordeiro - 72 (21 anos, Brasil)
Caio Moura - 73 (18 anos, Brasil)
Matheus Bessa - 74 (18 anos, Brasil)
Richarlyson - 78 (18 anos, Brasil)
Edson Pereira - 96 (25 anos, 1.73 m, Brasil)
Meio-campistas
Biel - 6 (24 anos, 1.83 m, Brasil)
Yago Felipe - 7 (31 anos, 1.75 m, Brasil)
Max - 8 (25 anos, 1.75 m, Brasil)
Carlos De Peña - 10 (34 anos, 1.78 m, Uruguai)
José Gabriel - 23 (27 anos, 1.85 m, Brasil)
Clayson - 25 (31 anos, 1.70 m, Brasil)
Fábio Matheus - 47 (23 anos, Brasil)
Pedro - 48 (25 anos, Brasil)
Adriel - 54 (19 anos, Brasil)
Felipinho Santos - 67 (19 anos, Brasil)
Breno - 70 (21 anos, Brasil)
Atacantes
Pedro Perotti - 9 (28 anos, 1.85 m, Brasil)
Gustavo Maia - 11 (25 anos, 1.68 m, Brasil)
Chrystian - 30 (24 anos, 1.78 m, Brasil)
Marlon - 31 (28 anos, Brasil)
Dedé - 65 (20 anos, Brasil)
Lipão - 71 (19 anos, Brasil)
Maron - 75 (19 anos, Brasil)
Arthur Moreira - 76 (18 anos, Brasil)
Micael - 77 (20 anos, Brasil)
Thalis - 80 (21 anos, Brasil)
Jefinho - 82 (19 anos, Brasil)
Fernandinho - 84 (19 anos, Brasil)
Iury - 95 (30 anos, 1.85 m, Brasil)
Zé Roberto - 99 (32 anos, 1.83 m, Brasil)

Athletic
Goleiros
Luan Polli (33 anos, 1.88 m, Brasil)
Glauco (31 anos, 1.91 m, Brasil)
Jhonatan (35 anos, 1.91 m, Brasil)
Eduardo Freire (22 anos, 1.88 m, Brasil)
Defensores
Jhonatan (26 anos, 1.85 m, Brasil)
Sidimar (33 anos, 1.85 m, Brasil)
Philipe Sampaio (31 anos, 1.91 m, Brasil)
Zeca (32 anos, 1.70 m, Brasil)
Matheus Pimenta (20 anos, 1.75 m, Brasil)
Diogo Batista (22 anos, 1.83 m, Brasil)
Lucas Belezi (23 anos, 1.85 m, Brasil)
Douglas Pelé (26 anos, Brasil)
Rodrigo (22 anos, 1.83 m, Brasil)
Enzo (23 anos, Brasil)
Marcelo Henrique (21 anos, Brasil)
Felipe Vieira (21 anos, 1.88 m, Brasil)
Kazim (21 anos, Brasil)
João Vitor (19 anos, Brasil)
Gustavo Morais Melo (1.93 m, Brasil)
Matheus De Oliveira Pimenta (Brasil)
Meio-campistas
Fabrício Isidoro (34 anos, 1.73 m, Brasil)
Leandro Silva (27 anos, 1.75 m, Brasil)
Ian Luccas (23 anos, Brasil)
Gustavinho (24 anos, 1.75 m, Brasil)
Gian Cabezas (21 anos, 1.80 m, Colômbia)
Jota (22 anos, 1.83 m, Brasil)
Pedro Oliveira (27 anos, 1.75 m, Brasil)
Kauan Lindes (22 anos, Brasil)
Alexandre Cesar (21 anos, Brasil)
Caick José Ferreira Ramos (20 anos, Brasil)
João Miguel Da Costa Pereira (22 anos, Brasil)
Atacantes
Ronaldo Tavares (28 anos, 1.93 m, Portugal)
Léo Chú (26 anos, 1.78 m, Brasil)
Dixon Vera (23 anos, Equador)
Otávio Bruno (23 anos, Brasil)
Gabriel Moyses (23 anos, 1.91 m, Brasil)
Kauan (21 anos, 1.73 m, Brasil)
Oluwasegun Otusanya (21 anos, 1.85 m, Nigéria)
Ruan Assis (22 anos, Brasil)
Max (24 anos, 1.83 m, Brasil)
Caua Medeiros Araujo (21 anos, Brasil)
Gabriel Da Silva Sinfronio (20 anos, Brasil)
Samuel Da Conceição Schirmer (20 anos, 1.83 m, Brasil)
Luiz Fernando Souza Santos (18 anos, 1.78 m, Brasil)

São Bernardo
Goleiros
Alex Alves - 1 (39 anos, 1.91 m, Brasil)
Júnior Oliveira - 12 (36 anos, 1.88 m, Brasil)
Matheus Nogueira - 40 (28 anos, 1.91 m, Brasil)
Defensores
Rodrigo Ferreira - 2 (31 anos, 1.78 m, Brasil)
Helder Gomes Maciel - 3 (36 anos, 1.88 m, Brasil)
Pablo - 4 (34 anos, 1.80 m, Brasil)
Matheus Salustiano - 5 (33 anos, 1.83 m, Brasil)
Pará - 6 (30 anos, 1.68 m, Brasil)
João Pedro - 16 (21 anos, Brasil)
Hugo - 21 (31 anos, 1.68 m, Brasil)
Wellington Jesus Cardoso - 25 (24 anos, 1.93 m, Brasil)
Mário Sérgio - 33 (32 anos, 1.78 m, Brasil)
Jemerson - 35 (33 anos, 1.83 m, Brasil)
Luizão - 90 (24 anos, 1.88 m, Brasil)
Augusto - 97 (29 anos, 1.85 m, Brasil)
Meio-campistas
Foguinho - 8 (33 anos, 1.80 m, Brasil)
Lino - 17 (29 anos, 1.78 m, Brasil)
Felipe Rodrigues Saraiva Freitas - 20 (18 anos, Brasil)
Eduardo - 26 (25 anos, Brasil)
João Paulo - 28 (35 anos, 1.68 m, Brasil)
Júnior Urso - 30 (37 anos, 1.80 m, Brasil)
Lucas Fernandes - 31 (28 anos, 1.75 m, Brasil)
Rodrigo Andrade - 32 (29 anos, 1.75 m, Brasil)
Hyoran - 42 (33 anos, 1.75 m, Brasil)
Marcão Silva - 77 (35 anos, 1.85 m, Brasil)
Atacantes
Lucas Rian Santos Oliveira - 7 (25 anos, Brasil)
Felipe Garcia - 9 (35 anos, 1.85 m, Brasil)
Fabrício Daniel - 10 (28 anos, 1.83 m, Brasil)
Pedro Vitor - 11 (28 anos, 1.73 m, Brasil)
Neto Costa - 19 (29 anos, 1.83 m, Brasil)
Pablo Dyego - 22 (32 anos, 1.78 m, Brasil)
Echaporã - 27 (26 anos, 1.70 m, Brasil)
Pedrinho - 29 (26 anos, 1.75 m, Brasil)
Daniel Davi Simao Roque - 37 (20 anos, Brasil)
Daniel Amorim - 89 (36 anos, 1.91 m, Brasil)
`;

function parse() {
  const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
  
  const teamsData = [];
  let currentTeam = null;
  let currentCategory = "M";

  function assignPos(cat) {
      if (!currentTeam) return "CM";
      if (cat === "G") return "GK";
      if (cat === "D") {
          if (currentTeam.posCounts.CB < 4) { currentTeam.posCounts.CB++; return "CB"; }
          if (currentTeam.posCounts.RB < 2) { currentTeam.posCounts.RB++; return "RB"; }
          if (currentTeam.posCounts.LB < 2) { currentTeam.posCounts.LB++; return "LB"; }
          currentTeam.posCounts.CB++; return "CB";
      }
      if (cat === "M") {
          if (currentTeam.posCounts.CM < 3) { currentTeam.posCounts.CM++; return "CM"; }
          if (currentTeam.posCounts.CDM < 2) { currentTeam.posCounts.CDM++; return "CDM"; }
          if (currentTeam.posCounts.CAM < 2) { currentTeam.posCounts.CAM++; return "CAM"; }
          if (currentTeam.posCounts.RM < 1) { currentTeam.posCounts.RM++; return "RM"; }
          if (currentTeam.posCounts.LM < 1) { currentTeam.posCounts.LM++; return "LM"; }
          currentTeam.posCounts.CM++; return "CM";
      }
      if (cat === "A") {
          if (currentTeam.posCounts.ST < 2) { currentTeam.posCounts.ST++; return "ST"; }
          if (currentTeam.posCounts.RW < 2) { currentTeam.posCounts.RW++; return "RW"; }
          if (currentTeam.posCounts.LW < 2) { currentTeam.posCounts.LW++; return "LW"; }
          currentTeam.posCounts.ST++; return "ST";
      }
      return "CM";
  }

  const knownTeams = ["América Mineiro", "Sport", "Athletic", "São Bernardo", "Atlético Goianiense", "Vila Nova", "Avaí", "Botafogo-SP", "CRB", "Ceará", "Criciúma", "Cuiabá", "Fortaleza", "Goiás", "Juventude", "Londrina", "Novorizontino", "Náutico", "Operário-PR"];

  function getTeam(name) {
     let t = teamsData.find(x => x.name === name);
     if (!t) {
        t = { name, players: [], posCounts: { GK: 0, CB: 0, LB: 0, RB: 0, CDM: 0, CM: 0, CAM: 0, RM: 0, LM: 0, RW: 0, LW: 0, ST: 0 }, j: 1 };
        teamsData.push(t);
     }
     return t;
  }

  for (const line of lines) {
    if (knownTeams.includes(line)) {
      currentTeam = getTeam(line);
      continue;
    }

    if (line.toLowerCase().includes("goleiro")) { currentCategory = "G"; continue; }
    if (line.toLowerCase().includes("defensor")) { currentCategory = "D"; continue; }
    if (line.toLowerCase().includes("meio-campista") || line.toLowerCase().includes("meia")) { currentCategory = "M"; continue; }
    if (line.toLowerCase().includes("atacante")) { currentCategory = "A"; continue; }

    const matches = [...line.matchAll(/([A-ZÀ-Ÿa-zà-ÿ0-9\s\.\'-]+?)(?:\s*-\s*(\d+))?\s*\(([^)]+)\)/g)];
    
    for (const match of matches) {
       let name = match[1].trim();
       let matchNum = match[2] ? parseInt(match[2]) : 0;
       let age = 22;
       
       if (name === "Meio-campistas" || name === "Atacantes" || name === "Goleiros" || name === "Defensores") continue;
       if (match[3].includes("anos")) {
          const am = match[3].match(/(\d+) anos/);
          if (am) age = parseInt(am[1]);
       }

       if (currentTeam && name.length > 2) {
           currentTeam.players.push({
               name: name,
               jerseyNumber: matchNum > 0 ? matchNum : currentTeam.j++,
               age,
               position: assignPos(currentCategory)
           });
       }
    }
  }

  let jsOut = "export const parsedTeamsData = {\n";
  for (const t of teamsData) {
      jsOut += `  "${t.name}": [\n`;
      for (const p of t.players) {
          jsOut += `    { name: "${p.name}", jerseyNumber: ${p.jerseyNumber}, age: ${p.age}, pos: "${p.position}" },\n`;
      }
      jsOut += `  ],\n`;
  }
  jsOut += "};\n";
  
  const fsLib = require('fs');
  fsLib.writeFileSync('parsedData.ts', jsOut);
}

parse();
