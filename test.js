"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/teams.ts
var teams_exports = {};
__export(teams_exports, {
  COUNTRIES: () => COUNTRIES,
  LEAGUES: () => LEAGUES,
  teams: () => teams
});
module.exports = __toCommonJS(teams_exports);
function createRNG(seed) {
  let s = seed >>> 0;
  return () => {
    s += 1831565813;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var personalities = ["leader", "professional", "temperamental", "quiet", "ambitious"];
function attrsByPos(pos, ovr, rng) {
  const ri = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
  const sc = (base, bonus) => Math.min(99, Math.round(base * (ovr / 75) + ri(-3, 3) + bonus));
  switch (pos) {
    case "GK":
      return { pace: ri(40, 60), shooting: ri(20, 40), passing: ri(40, 65), dribbling: ri(30, 55), defense: sc(75, 10), physical: sc(70, 5) };
    case "CB":
      return { pace: ri(50, 70), shooting: ri(25, 50), passing: ri(50, 68), dribbling: ri(35, 58), defense: sc(78, 12), physical: sc(72, 8) };
    case "LB":
    case "RB":
      return { pace: sc(70, 8), shooting: ri(40, 62), passing: sc(65, 5), dribbling: ri(50, 70), defense: sc(70, 8), physical: sc(68, 5) };
    case "CDM":
      return { pace: ri(55, 72), shooting: ri(40, 62), passing: sc(68, 8), dribbling: ri(50, 70), defense: sc(72, 10), physical: sc(72, 8) };
    case "CM":
      return { pace: ri(58, 75), shooting: ri(50, 70), passing: sc(72, 10), dribbling: sc(65, 5), defense: ri(45, 68), physical: sc(65, 3) };
    case "CAM":
      return { pace: ri(62, 80), shooting: sc(68, 8), passing: sc(74, 10), dribbling: sc(74, 12), defense: ri(30, 55), physical: ri(50, 68) };
    case "LM":
    case "RM":
      return { pace: sc(74, 10), shooting: sc(65, 5), passing: sc(68, 8), dribbling: sc(72, 10), defense: ri(40, 62), physical: sc(65, 5) };
    case "LW":
    case "RW":
      return { pace: sc(78, 12), shooting: sc(70, 8), passing: sc(66, 5), dribbling: sc(78, 15), defense: ri(28, 50), physical: ri(55, 72) };
    case "ST":
      return { pace: sc(72, 8), shooting: sc(82, 15), passing: ri(45, 68), dribbling: sc(68, 8), defense: ri(22, 45), physical: sc(70, 8) };
    default:
      return { pace: sc(65, 0), shooting: sc(65, 0), passing: sc(65, 0), dribbling: sc(65, 0), defense: sc(65, 0), physical: sc(65, 0) };
  }
}
function buildReal(teamId, clubLevel, data) {
  const rng = createRNG(teamId * 777777 + 54321);
  const ri = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const st = ["star", "starter", "starter", "starter", "starter", "rotation", "rotation", "rotation", "rotation", "rotation", "rotation", "rotation", "rotation", "rotation", "reserve", "reserve", "reserve", "reserve", "reserve", "reserve", "reserve", "reserve", "reserve", "reserve", "reserve"];
  return data.slice(0, 25).map(([name, pos, age, height, ovr], i) => {
    const pot = Math.min(99, ovr + (age <= 19 ? ri(12, 22) : age <= 22 ? ri(6, 16) : age <= 25 ? ri(0, 8) : 0));
    const attrs = attrsByPos(pos, ovr, rng);
    return {
      id: teamId * 1e3 + i,
      name,
      position: pos,
      age,
      overall: ovr,
      potential: pot,
      height,
      ...attrs,
      fatigue: 100,
      morale: ri(68, 88),
      happiness: ri(68, 88),
      status: st[i] ?? "reserve",
      salary: Math.max(5, Math.round((ovr - 55) * clubLevel * 1.8)),
      contractYears: ri(1, 4),
      injuryWeeks: 0,
      personality: pick(personalities)
    };
  });
}
var PAL = [
  ["Weverton", "GK", 37, 189, 82],
  ["Marcelo Lomba", "GK", 38, 189, 72],
  ["Gustavo G\xF3mez", "CB", 31, 185, 82],
  ["Murilo", "CB", 27, 188, 81],
  ["Vitor Reis", "CB", 18, 186, 76],
  ["Naves", "CB", 22, 184, 72],
  ["Piquerez", "LB", 26, 184, 81],
  ["Caio Paulista", "LB", 26, 184, 76],
  ["Vanderlan", "LB", 22, 176, 73],
  ["Marcos Rocha", "RB", 36, 176, 75],
  ["Mayke", "RB", 32, 179, 77],
  ["An\xEDbal Moreno", "CDM", 25, 178, 81],
  ["Z\xE9 Rafael", "CM", 31, 175, 79],
  ["Richard R\xEDos", "CM", 24, 185, 79],
  ["Raphael Veiga", "CAM", 29, 176, 82],
  ["Maur\xEDcio", "CAM", 23, 174, 78],
  ["Gabriel Menino", "CM", 24, 176, 76],
  ["Felipe Anderson", "RW", 31, 175, 80],
  ["Dudu", "LW", 32, 166, 77],
  ["L\xE1zaro", "LW", 22, 181, 74],
  ["Est\xEAv\xE3o", "RW", 17, 176, 80],
  ["Rony", "ST", 29, 166, 78],
  ["Flaco L\xF3pez", "ST", 24, 190, 81]
];
var FLA = [
  ["Agust\xEDn Rossi", "GK", 29, 193, 82],
  ["Matheus Cunha", "GK", 23, 190, 74],
  ["L\xE9o Pereira", "CB", 28, 189, 82],
  ["Fabr\xEDcio Bruno", "CB", 28, 192, 81],
  ["L\xE9o Ortiz", "CB", 29, 185, 81],
  ["David Luiz", "CB", 37, 189, 78],
  ["Ayrton Lucas", "LB", 27, 180, 81],
  ["Alex Sandro", "LB", 34, 180, 78],
  ["Mat\xEDas Vi\xF1a", "LB", 27, 180, 79],
  ["Guillermo Varela", "RB", 31, 173, 76],
  ["Wesley", "RB", 21, 173, 77],
  ["Erick Pulgar", "CDM", 30, 187, 80],
  ["Nicol\xE1s De La Cruz", "CM", 27, 167, 83],
  ["Gerson", "CM", 27, 184, 84],
  ["Arrascaeta", "CAM", 30, 174, 84],
  ["Carlos Alcaraz", "CAM", 22, 176, 78],
  ["Allan", "CDM", 27, 174, 75],
  ["Everton Cebolinha", "LW", 28, 174, 80],
  ["Michael", "LW", 28, 166, 79],
  ["Gonzalo Plata", "RW", 24, 178, 78],
  ["Pedro", "ST", 27, 185, 85],
  ["Bruno Henrique", "ST", 34, 184, 79],
  ["Gabriel Barbosa", "ST", 28, 178, 80]
];
var COR = [
  ["Hugo Souza", "GK", 26, 199, 80],
  ["Matheus Donelli", "GK", 22, 189, 70],
  ["F\xE9lix Torres", "CB", 28, 187, 79],
  ["Andr\xE9 Ramalho", "CB", 32, 182, 78],
  ["Cac\xE1", "CB", 25, 187, 77],
  ["Gustavo Henrique", "CB", 32, 196, 74],
  ["Matheus Bidu", "LB", 25, 172, 76],
  ["Hugo", "LB", 27, 179, 72],
  ["Diego Palacios", "LB", 25, 169, 74],
  ["Fagner", "RB", 35, 168, 76],
  ["Matheuzinho", "RB", 24, 171, 76],
  ["Raniele", "CDM", 28, 183, 77],
  ["Jos\xE9 Mart\xEDnez", "CDM", 30, 179, 77],
  ["Charles", "CM", 28, 188, 75],
  ["Alex Santana", "CM", 29, 182, 76],
  ["Rodrigo Garro", "CAM", 27, 174, 82],
  ["Igor Coronado", "CAM", 32, 170, 78],
  ["Breno Bidon", "CM", 19, 178, 74],
  ["Yuri Alberto", "ST", 23, 182, 81],
  ["Memphis Depay", "ST", 31, 178, 83],
  ["\xC1ngel Romero", "RW", 32, 176, 78],
  ["Talles Magno", "LW", 22, 186, 77],
  ["Pedro Henrique", "RW", 34, 181, 73]
];
var CAM = [
  ["Everson", "GK", 34, 192, 80],
  ["Matheus Mendes", "GK", 26, 187, 72],
  ["Junior Alonso", "CB", 32, 184, 80],
  ["Lyanco", "CB", 28, 187, 78],
  ["Bruno Fuchs", "CB", 26, 190, 77],
  ["Maur\xEDcio Lemos", "CB", 29, 186, 76],
  ["Guilherme Arana", "LB", 27, 176, 82],
  ["Rubens", "LB", 23, 179, 74],
  ["Renzo Saravia", "RB", 31, 179, 76],
  ["Mariano", "RB", 38, 177, 72],
  ["Rodrigo Battaglia", "CDM", 33, 187, 80],
  ["Ot\xE1vio", "CDM", 30, 173, 78],
  ["Alan Franco", "CM", 26, 172, 77],
  ["Fausto Vera", "CM", 24, 181, 77],
  ["Gustavo Scarpa", "CAM", 31, 176, 82],
  ["Mat\xEDas Zaracho", "CAM", 26, 171, 80],
  ["Bernard", "CAM", 32, 164, 76],
  ["Paulinho", "LW", 24, 177, 82],
  ["Hulk", "ST", 38, 180, 83],
  ["Deyverson", "ST", 33, 187, 79],
  ["Eduardo Vargas", "ST", 35, 175, 76]
];
var GRE = [
  ["Agust\xEDn Marches\xEDn", "GK", 37, 188, 78],
  ["Ca\xEDque", "GK", 27, 198, 72],
  ["Walter Kannemann", "CB", 33, 185, 78],
  ["Rodrigo Ely", "CB", 31, 188, 76],
  ["Jemerson", "CB", 32, 184, 76],
  ["Pedro Geromel", "CB", 39, 190, 74],
  ["Reinaldo", "LB", 35, 178, 76],
  ["Mayk", "LB", 25, 175, 71],
  ["Jo\xE3o Pedro", "RB", 28, 180, 77],
  ["Fabio", "RB", 34, 172, 72],
  ["Math\xEDas Villasanti", "CDM", 28, 178, 81],
  ["Dodi", "CDM", 28, 180, 76],
  ["Pep\xEA", "CM", 27, 183, 75],
  ["Eden\xEDlson", "CM", 35, 175, 73],
  ["Franco Cristaldo", "CAM", 28, 175, 80],
  ["Miguel Monsalve", "CAM", 21, 178, 77],
  ["Yeferson Soteldo", "LW", 27, 160, 81],
  ["Cristian Pav\xF3n", "RW", 29, 174, 78],
  ["Alexander Aravena", "LW", 22, 172, 75],
  ["Martin Braithwaite", "ST", 33, 177, 80],
  ["Diego Costa", "ST", 36, 188, 77],
  ["Mat\xEDas Arezo", "ST", 22, 178, 73]
];
var INT = [
  ["Sergio Rochet", "GK", 32, 189, 81],
  ["Ivan", "GK", 27, 195, 73],
  ["Vit\xE3o", "CB", 24, 186, 81],
  ["Gabriel Mercado", "CB", 38, 181, 77],
  ["Igor Gomes", "CB", 23, 185, 74],
  ["Robert Renan", "CB", 21, 186, 76],
  ["Alexandro Bernabei", "LB", 24, 169, 79],
  ["Ren\xEA", "LB", 32, 175, 74],
  ["Bruno Gomes", "RB", 23, 174, 77],
  ["Braian Aguirre", "RB", 24, 175, 75],
  ["Fernando", "CDM", 37, 183, 79],
  ["Thiago Maia", "CDM", 28, 179, 78],
  ["R\xF4mulo", "CDM", 24, 180, 74],
  ["Alan Patrick", "CAM", 33, 177, 83],
  ["Bruno Tabata", "CAM", 27, 175, 78],
  ["Gabriel Carvalho", "CAM", 17, 175, 76],
  ["Wesley", "LW", 25, 170, 79],
  ["Wanderson", "LW", 30, 175, 77],
  ["Rafael Borr\xE9", "ST", 29, 174, 81],
  ["Enner Valencia", "ST", 35, 177, 80],
  ["Lucas Alario", "ST", 32, 184, 76]
];
var SPA = [
  ["Rafael", "GK", 35, 186, 81],
  ["Jandrei", "GK", 32, 186, 73],
  ["Robert Arboleda", "CB", 33, 192, 80],
  ["Alan Franco", "CB", 28, 183, 79],
  ["Nahuel Ferraresi", "CB", 26, 186, 77],
  ["Sabino", "CB", 28, 192, 75],
  ["Welington", "LB", 24, 175, 78],
  ["Jamal Lewis", "LB", 27, 178, 75],
  ["Rafinha", "RB", 39, 172, 76],
  ["Igor Vin\xEDcius", "RB", 27, 175, 77],
  ["Pablo Maia", "CDM", 23, 178, 82],
  ["Alisson", "CM", 31, 175, 81],
  ["Luiz Gustavo", "CDM", 37, 187, 79],
  ["Dami\xE1n Bobadilla", "CM", 23, 175, 78],
  ["Lucas Moura", "CAM", 32, 172, 83],
  ["Luciano", "CAM", 31, 181, 80],
  ["Wellington Rato", "RW", 32, 172, 77],
  ["Ferreirinha", "LW", 27, 174, 78],
  ["Erick", "RW", 27, 173, 75],
  ["Jonathan Calleri", "ST", 31, 181, 82],
  ["Andr\xE9 Silva", "ST", 27, 185, 77],
  ["William Gomes", "LW", 19, 175, 74]
];
var CRU = [
  ["C\xE1ssio", "GK", 37, 196, 80],
  ["Anderson", "GK", 26, 190, 73],
  ["Jo\xE3o Marcelo", "CB", 24, 188, 78],
  ["Z\xE9 Ivaldo", "CB", 28, 185, 77],
  ["Lucas Villalba", "CB", 30, 178, 75],
  ["Jonathan Jesus", "CB", 20, 185, 70],
  ["Marlon", "LB", 27, 178, 79],
  ["Kaiki", "LB", 22, 173, 74],
  ["William", "RB", 30, 175, 81],
  ["Wesley Gasolina", "RB", 25, 176, 71],
  ["Lucas Romero", "CDM", 30, 167, 78],
  ["Walace", "CDM", 30, 188, 79],
  ["Matheus Henrique", "CM", 27, 175, 79],
  ["Fabrizio Peralta", "CM", 22, 181, 73],
  ["Matheus Pereira", "CAM", 28, 175, 83],
  ["\xC1lvaro Barreal", "LW", 24, 172, 78],
  ["Mateus Vital", "CAM", 27, 175, 73],
  ["Kaio Jorge", "ST", 23, 175, 77],
  ["Juan Dinenno", "ST", 30, 186, 78],
  ["Lautaro D\xEDaz", "ST", 26, 181, 76],
  ["Gabriel Veron", "LW", 22, 176, 74]
];
var VAS = [
  ["L\xE9o Jardim", "GK", 30, 188, 81],
  ["Keiller", "GK", 28, 193, 73],
  ["Jo\xE3o Victor", "CB", 26, 187, 78],
  ["Maicon", "CB", 36, 191, 76],
  ["L\xE9o", "CB", 29, 183, 75],
  ["Robert Rojas", "CB", 28, 177, 74],
  ["Lucas Piton", "LB", 24, 175, 80],
  ["Victor Lu\xEDs", "LB", 31, 176, 72],
  ["Paulo Henrique", "RB", 28, 175, 77],
  ["Puma Rodr\xEDguez", "RB", 27, 183, 75],
  ["Hugo Moura", "CDM", 27, 183, 77],
  ["Mateus Carvalho", "CM", 23, 175, 76],
  ["Jair", "CM", 30, 178, 76],
  ["Sforza", "CDM", 23, 179, 74],
  ["Philippe Coutinho", "CAM", 32, 172, 81],
  ["Dimitri Payet", "CAM", 32, 175, 80],
  ["Paulinho", "CAM", 27, 175, 77],
  ["Pablo Vegetti", "ST", 36, 187, 81],
  ["David", "LW", 29, 178, 76],
  ["Adson", "RW", 24, 171, 76],
  ["Emerson Rodr\xEDguez", "LW", 24, 173, 74]
];
var FLU = [
  ["F\xE1bio", "GK", 45, 188, 72],
  ["Marcelo Pitaluga", "GK", 23, 193, 70],
  ["Vitor Eudes", "GK", 27, 193, 67],
  ["Ign\xE1cio", "CB", 29, 183, 76],
  ["Juan Freytes", "CB", 26, 185, 73],
  ["Julian Millan", "CB", 28, 185, 72],
  ["Igor Rabello", "CB", 31, 191, 75],
  ["Jemmes", "CB", 26, 182, 68],
  ["Samuel Xavier", "RB", 35, 168, 69],
  ["Guga", "RB", 27, 173, 71],
  ["Ren\xE9", "LB", 33, 175, 70],
  ["Guilherme Arana", "LB", 29, 175, 73],
  ["Martinelli", "CM", 24, 178, 73],
  ["Ot\xE1vio", "CDM", 32, 175, 71],
  ["Nonato", "CM", 28, 175, 69],
  ["H\xE9rcules", "CM", 25, 178, 70],
  ["Luciano Acosta", "CAM", 31, 160, 77],
  ["Ganso", "CAM", 36, 183, 71],
  ["Facundo Bernal", "CDM", 22, 188, 72],
  ["David Terans", "CAM", 31, 173, 71],
  ["Germ\xE1n Cano", "ST", 38, 178, 74],
  ["John Kennedy", "ST", 23, 173, 73],
  ["Yeferson Soteldo", "LW", 28, 160, 75],
  ["Jefferson Savarino", "RW", 29, 168, 71],
  ["Agust\xEDn Canobbio", "RW", 27, 175, 72]
];
var BAH = [
  ["Marcos Felipe", "GK", 30, 189, 79],
  ["Ronaldo", "GK", 29, 190, 71],
  ["Jo\xE3o Paulo", "GK", 30, 186, 69],
  ["L\xE9o Vieira", "GK", 35, 190, 62],
  ["Santiago Ramos Mingo", "CB", 24, 186, 78],
  ["Gabriel Xavier", "CB", 25, 190, 79],
  ["Kanu", "CB", 29, 186, 78],
  ["David Duarte", "CB", 31, 192, 74],
  ["Marcos Victor", "CB", 24, 188, 70],
  ["Gilberto", "RB", 33, 181, 71],
  ["Rom\xE1n G\xF3mez", "RB", 21, 178, 68],
  ["Luciano Juba", "LB", 26, 176, 77],
  ["Iago Borduchi", "LB", 29, 182, 75],
  ["Z\xE9 Guilherme", "LB", 21, 179, 64],
  ["Jean Lucas", "CM", 27, 181, 79],
  ["Rodrigo Nestor", "CM", 25, 175, 77],
  ["Caio Alexandre", "CDM", 27, 174, 77],
  ["Nicol\xE1s Acevedo", "CDM", 27, 173, 75],
  ["Everton Ribeiro", "CAM", 37, 170, 75],
  ["Erick", "CDM", 28, 176, 73],
  ["Erick Pulga", "LW", 25, 169, 80],
  ["Kike Olivera", "RW", 24, 171, 75],
  ["Willian Jos\xE9", "ST", 34, 189, 72],
  ["Everaldo", "ST", 34, 181, 69],
  ["Mateo Sanabria", "LW", 22, 172, 69]
];
var APA = [
  ["Santos", "GK", 36, 188, 74],
  ["Mycael", "GK", 22, 188, 71],
  ["Matheus Soares", "GK", 21, 193, 62],
  ["Carlos Ter\xE1n", "CB", 25, 188, 79],
  ["Habra\xE3o", "CB", 24, 184, 76],
  ["Tobias Figueiredo", "CB", 31, 188, 77],
  ["L\xE9o", "CB", 30, 183, 76],
  ["Aguirre", "CB", 29, 188, 75],
  ["Lucas Belezi", "CB", 22, 195, 66],
  ["Lucas Esquivel", "LB", 24, 184, 77],
  ["Fernando", "LB", 26, 176, 74],
  ["Gast\xF3n Benav\xEDdez", "RB", 30, 175, 75],
  ["Madson", "RB", 34, 183, 68],
  ["Patrick", "CDM", 33, 179, 78],
  ["Raul", "CDM", 29, 178, 77],
  ["Giuliano", "CAM", 35, 174, 72],
  ["Bruno Zapelli", "CAM", 23, 174, 76],
  ["Felipinho", "CDM", 24, 176, 73],
  ["Jo\xE3o Cruz", "CM", 19, 172, 64],
  ["\xC9lan Ricardo", "CDM", 21, 183, 66],
  ["Kevin Viveros", "ST", 25, 182, 77],
  ["Luiz Fernando", "ST", 29, 181, 78],
  ["Kevin Velasco", "RW", 28, 172, 76],
  ["Steven Mendoza", "LW", 33, 171, 71],
  ["Julimar", "LW", 24, 184, 73]
];
var BOT = [
  ["Leo Linck", "GK", 25, 196, 80],
  ["Raul", "GK", 28, 188, 75],
  ["Neto", "GK", 36, 191, 67],
  ["Cristian Loor", "GK", 20, 188, 61],
  ["Alexander Barboza", "CB", 31, 193, 80],
  ["Nahuel Ferraresi", "CB", 27, 191, 79],
  ["Bastos", "CB", 35, 183, 71],
  ["Ythallo", "CB", 21, 193, 66],
  ["Anthony", "CB", 20, 193, 64],
  ["Alex Telles", "LB", 33, 180, 77],
  ["Lucas Villalba", "LB", 31, 178, 73],
  ["Vitinho", "RB", 26, 175, 74],
  ["Mateo Ponte", "RB", 22, 178, 74],
  ["Santiago Rodr\xEDguez", "CAM", 26, 173, 82],
  ["Cristian Medina", "CM", 23, 178, 80],
  ["Danilo", "CDM", 25, 175, 79],
  ["Allan", "CDM", 35, 175, 70],
  ["Edenilson", "CM", 36, 175, 66],
  ["\xC1lvaro Montoro", "CAM", 19, 170, 65],
  ["Jordan Barrera", "CAM", 20, 180, 65],
  ["Arthur Cabral", "ST", 28, 185, 82],
  ["J\xFAnior Santos", "RW", 31, 188, 79],
  ["Matheus Martins", "LW", 22, 178, 78],
  ["Joaqu\xEDn Correa", "ST", 31, 188, 74],
  ["Nathan Fernandes", "LW", 21, 193, 68]
];
var CHA = [
  ["Rafael Santos", "GK", 37, 191, 66],
  ["L\xE9o", "GK", 35, 193, 64],
  ["Gabriel Werner", "GK", 22, 185, 61],
  ["Devity Cherutti", "GK", 35, 191, 63],
  ["Eduardo Doma", "CB", 27, 185, 67],
  ["Jo\xE3o Paulo", "CB", 28, 188, 67],
  ["Bressan", "CB", 33, 185, 65],
  ["Victor Caetano", "CB", 28, 183, 63],
  ["Bruno Leonardo", "CB", 29, 188, 64],
  ["Mancha", "LB", 25, 175, 62],
  ["Everton", "LB", 31, 176, 62],
  ["Felipe Vieira", "LB", 27, 178, 63],
  ["Walter Clar", "LB", 31, 178, 63],
  ["Gabriel Inoc\xEAncio", "RB", 31, 177, 64],
  ["Jorge Roa", "CDM", 33, 180, 66],
  ["Marlon", "CDM", 28, 178, 64],
  ["Vinicius", "CM", 26, 178, 64],
  ["Eduardo Person", "CM", 29, 177, 63],
  ["Giovanni Augusto", "CAM", 36, 175, 65],
  ["Rafael Carvalheira", "CAM", 26, 175, 62],
  ["Bruno Matias", "CDM", 27, 177, 63],
  ["Pedro Perotti", "ST", 28, 185, 65],
  ["Get\xFAlio", "ST", 28, 185, 65],
  ["Ka\xEDque Maciel", "LW", 25, 183, 63],
  ["R\xF4mulo", "ST", 31, 175, 63]
];
var COR_ITB = [
  // Coritiba
  ["Pedro Luccas", "GK", 22, 191, 69],
  ["Gabriel Leite", "GK", 38, 188, 64],
  ["Benassi", "GK", 22, 185, 61],
  ["Mat\xEDas Fracchia", "CB", 30, 188, 70],
  ["Bruno Melo", "CB", 33, 183, 66],
  ["Jacy Maranh\xE3o", "CB", 28, 193, 67],
  ["Tiago", "CB", 22, 191, 62],
  ["Rodrigo Moledo", "CB", 38, 188, 63],
  ["Zeca", "RB", 31, 170, 63],
  ["Alex", "LB", 32, 180, 67],
  ["Geovane", "RB", 37, 178, 62],
  ["Machado", "CDM", 30, 175, 67],
  ["Sebasti\xE1n G\xF3mez", "CM", 29, 173, 70],
  ["Clayson", "CAM", 31, 170, 67],
  ["Carlos De Pe\xF1a", "CAM", 34, 178, 67],
  ["Wallison Luiz", "CM", 28, 183, 65],
  ["Josu\xE9 Pesqueira", "CAM", 35, 175, 64],
  ["Jean Gabriel", "CM", 23, 177, 62],
  ["Nicolas Careca", "ST", 28, 188, 69],
  ["Vini Paulista", "RW", 25, 180, 67],
  ["Everaldo", "LW", 31, 185, 67],
  ["Dellatorre", "ST", 34, 183, 66],
  ["Iury", "ST", 30, 185, 67],
  ["Lucas Ronier", "RW", 21, 163, 62],
  ["Brand\xE3o", "ST", 21, 191, 63]
];
var SNT = [
  // Santos
  ["Gabriel Braz\xE3o", "GK", 25, 193, 74],
  ["Di\xF3genes", "GK", 25, 185, 69],
  ["Rodrigo Falc\xE3o", "GK", 21, 191, 63],
  ["Z\xE9 Ivaldo", "CB", 29, 185, 74],
  ["Lucas Ver\xEDssimo", "CB", 30, 188, 74],
  ["Luan Peres", "CB", 31, 191, 71],
  ["Adonis Frias", "CB", 28, 188, 70],
  ["Mayke", "RB", 33, 178, 69],
  ["Igor", "RB", 29, 175, 69],
  ["Gonzalo Escobar", "LB", 29, 170, 69],
  ["Willian Ar\xE3o", "CDM", 34, 183, 72],
  ["Jo\xE3o Schmidt", "CDM", 32, 183, 73],
  ["Z\xE9 Rafael", "CM", 32, 175, 70],
  ["Gabriel Menino", "CM", 25, 178, 74],
  ["Thaciano", "CM", 31, 183, 70],
  ["Christian Oliva", "CM", 29, 178, 71],
  ["\xC1lvaro Barreal", "CAM", 25, 173, 71],
  ["Miguel Terceros", "CAM", 22, 178, 67],
  ["Neymar", "LW", 34, 175, 83],
  ["Gabriel Barbosa", "ST", 29, 178, 80],
  ["Rony", "RW", 31, 168, 73],
  ["Mois\xE9s", "LW", 29, 178, 71],
  ["Benjam\xEDn Rollheiser", "RW", 26, 173, 70],
  ["Lautaro D\xEDaz", "ST", 27, 180, 71],
  ["Marcelo T\xF3rrez", "CB", 19, 188, 61]
];
var VIT = [
  // Vitória
  ["Lucas Arcanjo", "GK", 27, 188, 73],
  ["Yuri Sena", "GK", 25, 191, 65],
  ["Gabriel", "GK", 33, 193, 67],
  ["Fintelman", "GK", 24, 196, 64],
  ["Cac\xE1", "CB", 27, 188, 71],
  ["Camutanga", "CB", 32, 188, 67],
  ["Riccieli", "CB", 27, 183, 67],
  ["Neris", "CB", 33, 191, 65],
  ["Edu", "CB", 25, 185, 66],
  ["Nathan", "RB", 23, 180, 65],
  ["Ramon", "RB", 25, 173, 64],
  ["Luan C\xE2ndido", "LB", 25, 188, 68],
  ["Jamerson", "LB", 27, 180, 64],
  ["Gabriel Baralhas", "CDM", 27, 178, 69],
  ["Ronald", "CM", 28, 170, 67],
  ["R\xFAben Ismael", "CM", 27, 183, 67],
  ["Matheusinho", "CAM", 27, 175, 68],
  ["Emmanuel Mart\xEDnez", "CM", 31, 170, 67],
  ["Z\xE9 Vitor", "CDM", 26, 193, 65],
  ["Caique", "CDM", 30, 178, 65],
  ["Renato Kayzer", "ST", 30, 178, 70],
  ["Renzo L\xF3pez", "ST", 32, 193, 68],
  ["Marinho", "RW", 35, 168, 66],
  ["Erick", "RW", 28, 173, 66],
  ["Aitor Cantalapiedra", "RW", 30, 178, 65]
];
var MIR = [
  // Mirassol
  ["Georgemy", "GK", 30, 196, 71],
  ["Alex Muralha", "GK", 36, 188, 67],
  ["Walter", "GK", 38, 188, 64],
  ["Lucas Oliveira", "CB", 30, 188, 69],
  ["Willian Machado", "CB", 29, 183, 68],
  ["Jo\xE3o Victor Carroll", "CB", 28, 188, 68],
  ["Rodrigues", "CB", 28, 188, 68],
  ["Igor Marques", "RB", 27, 178, 67],
  ["Reinaldo", "LB", 36, 178, 64],
  ["Victor Luis", "LB", 32, 180, 66],
  ["Daniel Borges", "RB", 33, 175, 66],
  ["Neto Moura", "CM", 29, 175, 71],
  ["Yuri", "CDM", 32, 173, 67],
  ["Shaylon", "CAM", 29, 180, 70],
  ["Jos\xE9 Aldo", "CAM", 27, 175, 68],
  ["Gabriel", "CDM", 32, 185, 67],
  ["Lucas Mugni", "CAM", 34, 180, 67],
  ["Chico", "CM", 34, 175, 66],
  ["Tiquinho Soares", "ST", 35, 188, 70],
  ["Nathan Foga\xE7a", "ST", 26, 178, 70],
  ["Alesson", "RW", 27, 173, 67],
  ["Everton", "LW", 29, 178, 67],
  ["Antonio Galeano", "RW", 26, 170, 66],
  ["Andr\xE9 Luis", "ST", 32, 183, 66],
  ["Edson Carioca", "LW", 28, 178, 66]
];
var REM = [
  // Remo
  ["Marcelo Rangel", "GK", 37, 185, 67],
  ["Ygor Vinhas", "GK", 32, 193, 65],
  ["Leo Lang", "GK", 27, 168, 63],
  ["Klaus", "CB", 32, 188, 66],
  ["Reynaldo", "CB", 29, 185, 65],
  ["Luan Martins", "CB", 26, 188, 65],
  ["Cristian Tassano", "CB", 29, 185, 64],
  ["Rafael Castro", "CB", 30, 188, 64],
  ["Pedro", "RB", 32, 183, 63],
  ["Savio", "RB", 30, 175, 62],
  ["Alan Rodr\xEDguez", "LB", 25, 173, 64],
  ["Jorge", "LB", 30, 183, 62],
  ["Victor Cantillo", "CDM", 32, 180, 67],
  ["Pedro Castro", "CM", 33, 180, 65],
  ["Giovanni Pavani", "CM", 29, 178, 64],
  ["Nathan", "CAM", 30, 180, 64],
  ["R\xE9gis", "CAM", 33, 170, 63],
  ["Dod\xF4", "CAM", 31, 178, 64],
  ["Yago", "CM", 24, 175, 62],
  ["Madison", "CDM", 27, 173, 63],
  ["Pedro Rocha", "ST", 31, 180, 65],
  ["Jaderson", "RW", 25, 170, 64],
  ["Marrony", "LW", 27, 180, 64],
  ["Diego Hern\xE1ndez", "RW", 25, 175, 63],
  ["Jo\xE3o Pedro", "ST", 29, 185, 64]
];
var RBB = [
  // Red Bull Bragantino
  ["Cleiton", "GK", 28, 191, 78],
  ["Tiago Volpi", "GK", 35, 191, 69],
  ["Fernando Costa", "GK", 22, 191, 66],
  ["Fabr\xEDcio", "GK", 25, 191, 66],
  ["Guzm\xE1n Rodr\xEDguez", "CB", 26, 183, 71],
  ["Eduardo Santos", "CB", 28, 196, 69],
  ["Alix Vinicius", "CB", 26, 196, 69],
  ["Pedro Henrique", "CB", 30, 188, 71],
  ["Gustavo Marques", "CB", 24, 188, 68],
  ["Juninho Capixaba", "LB", 28, 175, 70],
  ["Vanderlan", "LB", 23, 183, 68],
  ["Agust\xEDn Sant'Anna", "RB", 28, 175, 70],
  ["Jos\xE9 Hurtado", "RB", 24, 178, 68],
  ["Fabinho", "CDM", 24, 178, 71],
  ["Gabriel", "CDM", 33, 170, 67],
  ["Matheus Fernandes", "CM", 27, 183, 70],
  ["Ramires", "CM", 25, 175, 68],
  ["Ignacio Sosa", "CM", 22, 175, 68],
  ["Lucas Barbosa", "CAM", 25, 193, 68],
  ["Gustavinho", "CAM", 22, 175, 67],
  ["Eduardo Sasha", "ST", 34, 175, 67],
  ["Isidro Pitta", "ST", 26, 183, 70],
  ["Fernando", "ST", 27, 175, 68],
  ["Jos\xE9 Herrera", "RW", 23, 173, 65],
  ["Henry Mosquera", "LW", 24, 173, 67]
];
var clubs = [
  { id: 1, name: "Botafogo", abbreviation: "BOT", city: "Rio de Janeiro", clubLevel: 3, balance: 14e3, monthlyIncome: 850, objective: "Classificar para a Copa", real: BOT, leagueId: "BR_A" },
  { id: 2, name: "Palmeiras", abbreviation: "PAL", city: "S\xE3o Paulo", clubLevel: 4, balance: 25e3, monthlyIncome: 1800, objective: "Lutar pelo t\xEDtulo", real: PAL, leagueId: "BR_A" },
  { id: 3, name: "Flamengo", abbreviation: "FLA", city: "Rio de Janeiro", clubLevel: 4, balance: 28e3, monthlyIncome: 1950, objective: "Lutar pelo t\xEDtulo", real: FLA, leagueId: "BR_A" },
  { id: 4, name: "Gr\xEAmio", abbreviation: "GRE", city: "Porto Alegre", clubLevel: 3, balance: 13e3, monthlyIncome: 800, objective: "Classificar para a Copa", real: GRE, leagueId: "BR_A" },
  { id: 5, name: "Corinthians", abbreviation: "COR", city: "S\xE3o Paulo", clubLevel: 4, balance: 22e3, monthlyIncome: 1600, objective: "Lutar pelo t\xEDtulo", real: COR, leagueId: "BR_A" },
  { id: 6, name: "Coritiba", abbreviation: "CTB", city: "Curitiba", clubLevel: 2, balance: 7e3, monthlyIncome: 450, objective: "Terminar no meio da tabela", real: COR_ITB, leagueId: "BR_A" },
  { id: 7, name: "Internacional", abbreviation: "INT", city: "Porto Alegre", clubLevel: 3, balance: 13500, monthlyIncome: 810, objective: "Classificar para a Copa", real: INT, leagueId: "BR_A" },
  { id: 8, name: "S\xE3o Paulo", abbreviation: "SPA", city: "S\xE3o Paulo", clubLevel: 3, balance: 15e3, monthlyIncome: 900, objective: "Classificar para a Copa", real: SPA, leagueId: "BR_A" },
  { id: 9, name: "Cruzeiro", abbreviation: "CRU", city: "Belo Horizonte", clubLevel: 3, balance: 12e3, monthlyIncome: 780, objective: "Terminar no top 8", real: CRU, leagueId: "BR_A" },
  { id: 10, name: "Atl\xE9tico Mineiro", abbreviation: "CAM", city: "Belo Horizonte", clubLevel: 4, balance: 24e3, monthlyIncome: 1700, objective: "Lutar pelo t\xEDtulo", real: CAM, leagueId: "BR_A" },
  { id: 11, name: "Vasco da Gama", abbreviation: "VAS", city: "Rio de Janeiro", clubLevel: 3, balance: 11500, monthlyIncome: 750, objective: "Terminar no top 8", real: VAS, leagueId: "BR_A" },
  { id: 12, name: "Fluminense", abbreviation: "FLU", city: "Rio de Janeiro", clubLevel: 3, balance: 12500, monthlyIncome: 790, objective: "Classificar para a Copa", real: FLU, leagueId: "BR_A" },
  { id: 13, name: "Bahia", abbreviation: "BAH", city: "Salvador", clubLevel: 2, balance: 8e3, monthlyIncome: 530, objective: "Terminar no meio da tabela", real: BAH, leagueId: "BR_A" },
  { id: 14, name: "Santos", abbreviation: "SAN", city: "Santos", clubLevel: 3, balance: 1e4, monthlyIncome: 680, objective: "Terminar no top 8", real: SNT, leagueId: "BR_A" },
  { id: 15, name: "Red Bull Bragantino", abbreviation: "RBB", city: "Bragan\xE7a Paulista", clubLevel: 2, balance: 9e3, monthlyIncome: 580, objective: "Terminar no top 10", real: RBB, leagueId: "BR_A" },
  { id: 16, name: "Vit\xF3ria", abbreviation: "VIT", city: "Salvador", clubLevel: 2, balance: 6500, monthlyIncome: 420, objective: "Terminar no meio da tabela", real: VIT, leagueId: "BR_A" },
  { id: 17, name: "Mirassol", abbreviation: "MIR", city: "Mirassol", clubLevel: 2, balance: 6e3, monthlyIncome: 380, objective: "Terminar no meio da tabela", real: MIR, leagueId: "BR_A" },
  { id: 18, name: "Chapecoense", abbreviation: "CHA", city: "Chapec\xF3", clubLevel: 1, balance: 3e3, monthlyIncome: 220, objective: "Evitar o rebaixamento", real: CHA, leagueId: "BR_A" },
  { id: 19, name: "Athletico Paranaense", abbreviation: "APA", city: "Curitiba", clubLevel: 3, balance: 12e3, monthlyIncome: 760, objective: "Classificar para a Copa", real: APA, leagueId: "BR_A" },
  { id: 20, name: "Remo", abbreviation: "REM", city: "Bel\xE9m", clubLevel: 1, balance: 2800, monthlyIncome: 190, objective: "Evitar o rebaixamento", real: REM, leagueId: "BR_A" }
];
var COUNTRIES = {
  "BR": { name: "Brasil", flag: "\u{1F1E7}\u{1F1F7}" },
  "ENG": { name: "Inglaterra", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}" },
  "ESP": { name: "Espanha", flag: "\u{1F1EA}\u{1F1F8}" },
  "ITA": { name: "It\xE1lia", flag: "\u{1F1EE}\u{1F1F9}" },
  "GER": { name: "Alemanha", flag: "\u{1F1E9}\u{1F1EA}" },
  "FRA": { name: "Fran\xE7a", flag: "\u{1F1EB}\u{1F1F7}" },
  "ARG": { name: "Argentina", flag: "\u{1F1E6}\u{1F1F7}" },
  "URU": { name: "Uruguai", flag: "\u{1F1FA}\u{1F1FE}" },
  "COL": { name: "Col\xF4mbia", flag: "\u{1F1E8}\u{1F1F4}" },
  "CHI": { name: "Chile", flag: "\u{1F1E8}\u{1F1F1}" }
};
var LEAGUES = {
  "BR_A": { name: "S\xE9rie A", division: 1, country: "BR" },
  "BR_B": { name: "S\xE9rie B", division: 2, country: "BR" },
  "BR_C": { name: "S\xE9rie C", division: 3, country: "BR" },
  "BR_D": { name: "S\xE9rie D", division: 4, country: "BR" },
  "ENG_A": { name: "Premier League", division: 1, country: "ENG" },
  "ENG_B": { name: "Championship", division: 2, country: "ENG" },
  "ESP_A": { name: "La Liga", division: 1, country: "ESP" },
  "ESP_B": { name: "La Liga 2", division: 2, country: "ESP" },
  "ITA_A": { name: "Serie A", division: 1, country: "ITA" },
  "ITA_B": { name: "Serie B", division: 2, country: "ITA" },
  "GER_A": { name: "Bundesliga", division: 1, country: "GER" },
  "GER_B": { name: "2. Bundesliga", division: 2, country: "GER" },
  "FRA_A": { name: "Ligue 1", division: 1, country: "FRA" },
  "FRA_B": { name: "Ligue 2", division: 2, country: "FRA" },
  "ARG_A": { name: "Liga Profesional", division: 1, country: "ARG" },
  "ARG_B": { name: "Primera Nacional", division: 2, country: "ARG" },
  "URU_A": { name: "Primera Divisi\xF3n", division: 1, country: "URU" },
  "URU_B": { name: "Segunda Divisi\xF3n", division: 2, country: "URU" },
  "COL_A": { name: "Primera A", division: 1, country: "COL" },
  "COL_B": { name: "Primera B", division: 2, country: "COL" },
  "CHI_A": { name: "Primera Divisi\xF3n", division: 1, country: "CHI" },
  "CHI_B": { name: "Primera B", division: 2, country: "CHI" }
};
var COUNTRY_PREFIXES = {
  BR: ["Clube", "Sociedade", "Associa\xE7\xE3o", "Gr\xEAmio", "Desportiva", "Atl\xE9tico"],
  ENG: ["AFC", "United", "City", "Town", "Rovers", "Athletic", "Wanderers", "Sporting"],
  FRA: ["Olympique", "Racing", "Stade", "AS", "FC", "Sporting"],
  GER: ["FC", "SV", "VfB", "FSV", "Borussia", "Eintracht", "Dynamo"],
  ITA: ["AC", "AS", "FC", "Inter", "Sportiva", "Calcio"],
  ESP: ["Real", "Atl\xE9tico", "Deportivo", "Sporting", "UD", "CD", "FC"],
  ARG: ["Club Atl\xE9tico", "Deportivo", "Racing", "Independiente", "Defensa"],
  URU: ["Club", "Nacional", "Atl\xE9tico", "Deportivo", "Racing"],
  COL: ["Deportivo", "Atl\xE9tico", "Real", "Sporting", "Independiente"],
  CHI: ["Deportivo", "Atl\xE9tico", "Club", "CD", "Uni\xF3n"]
};
var COUNTRY_CITIES = {
  BR: ["S\xE3o Paulo", "Rio de Janeiro", "Belo Horizonte", "Porto Alegre", "Curitiba", "Recife", "Salvador", "Fortaleza", "Goi\xE2nia", "Campinas"],
  ENG: ["London", "Manchester", "Liverpool", "Birmingham", "Leeds", "Sheffield", "Bristol", "Nottingham", "Leicester", "Newcastle"],
  FRA: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Montpellier", "Strasbourg", "Bordeaux", "Lille"],
  GER: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "D\xFCsseldorf", "Leipzig", "Dortmund", "Essen"],
  ITA: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Bari", "Catania"],
  ESP: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Murcia", "Palma", "Las Palmas", "Bilbao"],
  ARG: ["Buenos Aires", "C\xF3rdoba", "Rosario", "Mendoza", "Tucum\xE1n", "La Plata", "Mar del Plata", "Salta", "Santa Fe", "San Juan"],
  URU: ["Montevideo", "Salto", "Paysand\xFA", "Las Piedras", "Rivera", "Maldonado", "Tacuaremb\xF3", "Melo", "Mercedes", "Artigas"],
  COL: ["Bogot\xE1", "Medell\xEDn", "Cali", "Barranquilla", "Cartagena", "C\xFAcuta", "Bucaramanga", "Pereira", "Santa Marta", "Ibagu\xE9"],
  CHI: ["Santiago", "Puente Alto", "Maip\xFA", "La Florida", "Antofagasta", "Vi\xF1a del Mar", "Valpara\xEDso", "Talcahuano", "Temuco", "Rancagua"]
};
function generateFakeName(country, index, rng) {
  const prefixes = COUNTRY_PREFIXES[country] || ["FC", "Club", "Athletic"];
  const cities = COUNTRY_CITIES[country] || ["City A", "City B", "City C", "City D", "City E", "City F", "City G", "City H", "City I", "City J"];
  const ri = (max) => Math.floor(rng() * max);
  const pre = prefixes[ri(prefixes.length)];
  const cit = cities[index % cities.length] + (index >= cities.length ? ` ${Math.floor(index / cities.length) + 1}` : "");
  return rng() > 0.5 ? `${pre} ${cit}` : `${cit} ${pre}`;
}
var BR_FIRST_NAMES = ["Gabriel", "Lucas", "Matheus", "Pedro", "Jo\xE3o", "Thiago", "Guilherme", "Rafael", "Felipe", "Gustavo", "Vinicius", "Vitor", "Arthur", "Leonardo", "Rodrigo", "Bruno", "Eduardo", "Diego", "Andr\xE9", "Fernando", "Caio", "Renato", "Alexandre", "Marcelo", "Ricardo", "Carlos", "Paulo", "Antonio", "Roberto", "Marcos"];
var BR_LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa", "Mendes", "Rocha", "Dias", "Moura", "Nunes", "Cardoso", "Teixeira", "Melo", "Cavalcante", "Pinto"];
var ENG_FIRST_NAMES = ["Jack", "Harry", "Oliver", "George", "Charlie", "Jacob", "Thomas", "James", "William", "Joshua", "Arthur", "Leo", "Noah", "Oscar", "Alfie", "Freddie", "Archie", "Isaac", "Theo", "Joseph", "Samuel", "Max"];
var ENG_LAST_NAMES = ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies", "Robinson", "Wright", "Thompson", "Evans", "Walker", "White", "Roberts", "Green", "Hall", "Wood", "Jackson", "Clarke", "Harris"];
var ESP_FIRST_NAMES = ["Alejandro", "Hugo", "Daniel", "Pablo", "\xC1lvaro", "Adri\xE1n", "David", "Diego", "Javier", "Mario", "Sergio", "Marcos", "Carlos", "Mart\xEDn", "Manuel", "V\xEDctor", "Jorge", "Iv\xE1n", "Fernando", "Ra\xFAl", "Iker"];
var ESP_LAST_NAMES = ["Garc\xEDa", "Rodr\xEDguez", "Gonz\xE1lez", "Fern\xE1ndez", "L\xF3pez", "Mart\xEDnez", "S\xE1nchez", "P\xE9rez", "G\xF3mez", "Mart\xEDn", "Jim\xE9nez", "Ruiz", "Hern\xE1ndez", "D\xEDaz", "Moreno", "Mu\xF1oz", "\xC1lvarez", "Romero", "Alonso", "Guti\xE9rrez", "Navarro"];
function generateFakeNameForPlayer(country, rng) {
  const ri = (max) => Math.floor(rng() * max);
  let firstNames = BR_FIRST_NAMES;
  let lastNames = BR_LAST_NAMES;
  if (country === "ENG") {
    firstNames = ENG_FIRST_NAMES;
    lastNames = ENG_LAST_NAMES;
  } else if (country === "ESP") {
    firstNames = ESP_FIRST_NAMES;
    lastNames = ESP_LAST_NAMES;
  } else if (country === "CHI" || country === "ARG" || country === "URU" || country === "COL") {
    firstNames = ESP_FIRST_NAMES;
    lastNames = ESP_LAST_NAMES;
  }
  return `${firstNames[ri(firstNames.length)]} ${lastNames[ri(lastNames.length)]}`;
}
function generateFakeTeam(id, name, leagueId, level, ovrBase, country = "BR") {
  const rng = createRNG(id * 99999);
  const ri = (a, b) => Math.floor(rng() * (b - a + 1)) + a;
  const positions = ["GK", "GK", "CB", "CB", "CB", "CB", "LB", "LB", "RB", "RB", "CDM", "CDM", "CM", "CM", "CAM", "CAM", "LW", "RW", "ST", "ST", "ST"];
  const players = positions.map((pos, i) => {
    const age = ri(18, 35);
    const ovr = ri(ovrBase - 5, ovrBase + 5);
    const pot = Math.min(99, ovr + (age <= 19 ? ri(12, 22) : age <= 22 ? ri(6, 16) : age <= 25 ? ri(0, 8) : 0));
    const attrs = attrsByPos(pos, ovr, rng);
    const st = i < 11 ? "starter" : "reserve";
    const playerName = generateFakeNameForPlayer(country, rng);
    return {
      id: id * 100 + i,
      name: playerName,
      position: pos,
      age,
      overall: ovr,
      potential: pot,
      height: ri(170, 195),
      ...attrs,
      fatigue: 100,
      morale: 75,
      happiness: 75,
      status: st,
      salary: ri(5, 50),
      contractYears: ri(1, 4),
      injuryWeeks: 0,
      personality: "professional"
    };
  });
  return {
    id,
    name,
    abbreviation: name.substring(0, 3).toUpperCase(),
    city: "Cidade",
    clubLevel: level,
    balance: 5e3,
    monthlyIncome: 500,
    objective: "Competir",
    players,
    leagueId
  };
}
var teams = [
  ...clubs.map((c) => ({
    id: c.id,
    name: c.name,
    abbreviation: c.abbreviation,
    city: c.city,
    clubLevel: c.clubLevel,
    balance: c.balance,
    monthlyIncome: c.monthlyIncome,
    objective: c.objective,
    players: buildReal(c.id, c.clubLevel, c.real),
    leagueId: c.leagueId
  }))
];
var ENG_A_OVERRIDE = [
  { id: 400, name: "Manchester City", abbreviation: "MCI", city: "Manchester", clubLevel: 4, ovr: 88, logoUrl: "https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg" },
  { id: 401, name: "Arsenal", abbreviation: "ARS", city: "London", clubLevel: 4, ovr: 85, logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg" },
  { id: 402, name: "Liverpool", abbreviation: "LIV", city: "Liverpool", clubLevel: 4, ovr: 85, logoUrl: "https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg" },
  { id: 403, name: "Real Madrid", abbreviation: "RMA", city: "Madrid", clubLevel: 4, ovr: 87, logoUrl: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg" }
  // ok maybe in ENG for tests
];
var BR_B_OVERRIDE = [
  { id: 100, name: "Am\xE9rica-MG", abbreviation: "AME", city: "Belo Horizonte", clubLevel: 2, ovr: 71, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Am%C3%A9rica_Futebol_Clube_%28MG%29.svg/120px-Am%C3%A9rica_Futebol_Clube_%28MG%29.svg.png" },
  { id: 101, name: "Athletic-MG", abbreviation: "ATH", city: "S\xE3o Jo\xE3o del-Rei", clubLevel: 2, ovr: 68, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Escudo_Athletic_Club_%28SJDR%29.png/120px-Escudo_Athletic_Club_%28SJDR%29.png" },
  { id: 102, name: "Atl\xE9tico-GO", abbreviation: "ACG", city: "Goi\xE2nia", clubLevel: 2, ovr: 71, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Atl%C3%A9tico_Clube_Goianiense_logo.svg/120px-Atl%C3%A9tico_Clube_Goianiense_logo.svg.png" },
  { id: 103, name: "Ava\xED", abbreviation: "AVA", city: "Florian\xF3polis", clubLevel: 2, ovr: 70, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Avai_FC_%2805-E%29_-_SC.svg/120px-Avai_FC_%2805-E%29_-_SC.svg.png" },
  { id: 104, name: "Botafogo-SP", abbreviation: "BFC", city: "Ribeir\xE3o Preto", clubLevel: 2, ovr: 69, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Botafogo_FC_%28SP%29.svg/120px-Botafogo_FC_%28SP%29.svg.png" },
  { id: 105, name: "Cear\xE1", abbreviation: "CEA", city: "Fortaleza", clubLevel: 2, ovr: 73, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Cear%C3%A1_Sporting_Club_logo.svg/120px-Cear%C3%A1_Sporting_Club_logo.svg.png" },
  { id: 106, name: "CRB", abbreviation: "CRB", city: "Macei\xF3", clubLevel: 2, ovr: 70, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Clube_de_Regatas_Brasil_logo.svg/120px-Clube_de_Regatas_Brasil_logo.svg.png" },
  { id: 107, name: "Crici\xFAma", abbreviation: "CRI", city: "Crici\xFAma", clubLevel: 2, ovr: 71, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Criciuma_Esporte_Clube.svg/120px-Criciuma_Esporte_Clube.svg.png" },
  { id: 108, name: "Cuiab\xE1", abbreviation: "CUI", city: "Cuiab\xE1", clubLevel: 2, ovr: 72, logoUrl: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f9/Cuiab%C3%A1_Esporte_Clube.svg/120px-Cuiab%C3%A1_Esporte_Clube.svg.png" },
  { id: 109, name: "Fortaleza", abbreviation: "FOR", city: "Fortaleza", clubLevel: 2, ovr: 73, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Fortaleza_Esporte_Clube_logo.svg/120px-Fortaleza_Esporte_Clube_logo.svg.png" },
  { id: 110, name: "Goi\xE1s", abbreviation: "GOI", city: "Goi\xE2nia", clubLevel: 2, ovr: 72, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Goi%C3%A1s_Esporte_Clube_logo.svg/120px-Goi%C3%A1s_Esporte_Clube_logo.svg.png" },
  { id: 111, name: "Juventude", abbreviation: "JUV", city: "Caxias do Sul", clubLevel: 2, ovr: 71, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Esporte_Clube_Juventude_logo.svg/120px-Esporte_Clube_Juventude_logo.svg.png" },
  { id: 112, name: "Londrina", abbreviation: "LON", city: "Londrina", clubLevel: 2, ovr: 68, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Londrina_Esporte_Clube_logo.svg/120px-Londrina_Esporte_Clube_logo.svg.png" },
  { id: 113, name: "N\xE1utico", abbreviation: "NAU", city: "Recife", clubLevel: 2, ovr: 69, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Clube_N%C3%A1utico_Capibaribe_logo.svg/120px-Clube_N%C3%A1utico_Capibaribe_logo.svg.png" },
  { id: 114, name: "Novorizontino", abbreviation: "NOV", city: "Novo Horizonte", clubLevel: 2, ovr: 71, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Gremio_Novorizontino.svg/120px-Gremio_Novorizontino.svg.png" },
  { id: 115, name: "Oper\xE1rio-PR", abbreviation: "OPE", city: "Ponta Grossa", clubLevel: 2, ovr: 70, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Oper%C3%A1rio_Ferrovi%C3%A1rio_Esporte_Clube.svg/120px-Oper%C3%A1rio_Ferrovi%C3%A1rio_Esporte_Clube.svg.png" },
  { id: 116, name: "Ponte Preta", abbreviation: "PON", city: "Campinas", clubLevel: 2, ovr: 70, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Associa%C3%A7%C3%A3o_Atl%C3%A9tica_Ponte_Preta_logo.svg/120px-Associa%C3%A7%C3%A3o_Atl%C3%A9tica_Ponte_Preta_logo.svg.png" },
  { id: 117, name: "S\xE3o Bernardo", abbreviation: "SBE", city: "S\xE3o Bernardo do Campo", clubLevel: 2, ovr: 68, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/S%C3%A3o_Bernardo_Futebol_Clube_-_escudo.svg/120px-S%C3%A3o_Bernardo_Futebol_Clube_-_escudo.svg.png" },
  { id: 118, name: "Sport", abbreviation: "SPT", city: "Recife", clubLevel: 2, ovr: 72, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Sport_Club_do_Recife_logo.svg/120px-Sport_Club_do_Recife_logo.svg.png" },
  { id: 119, name: "Vila Nova", abbreviation: "VIL", city: "Goi\xE2nia", clubLevel: 2, ovr: 70, logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Vila_Nova_Futebol_Clube.svg/120px-Vila_Nova_Futebol_Clube.svg.png" }
];
var fakeTeamsData = [
  ...BR_B_OVERRIDE.map((override) => ({ id: override.id, country: "BR", league: "BR_B", level: override.clubLevel, ovr: override.ovr, override })),
  ...Array.from({ length: 20 }).map((_, i) => ({ id: 200 + i, country: "BR", league: "BR_C", level: 1, ovr: 61 })),
  ...Array.from({ length: 20 }).map((_, i) => ({ id: 300 + i, country: "BR", league: "BR_D", level: 1, ovr: 55 })),
  ...ENG_A_OVERRIDE.map((override, i) => ({ id: override.id, country: "ENG", league: "ENG_A", level: override.clubLevel, ovr: override.ovr, override })),
  ...Array.from({ length: 16 }).map((_, i) => ({ id: 404 + i, country: "ENG", league: "ENG_A", level: 4, ovr: 82 })),
  ...Array.from({ length: 24 }).map((_, i) => ({ id: 500 + i, country: "ENG", league: "ENG_B", level: 3, ovr: 74 })),
  ...Array.from({ length: 20 }).map((_, i) => ({ id: 600 + i, country: "ESP", league: "ESP_A", level: 4, ovr: 81 })),
  ...Array.from({ length: 22 }).map((_, i) => ({ id: 700 + i, country: "ESP", league: "ESP_B", level: 3, ovr: 73 })),
  ...Array.from({ length: 20 }).map((_, i) => ({ id: 800 + i, country: "ITA", league: "ITA_A", level: 4, ovr: 80 })),
  ...Array.from({ length: 20 }).map((_, i) => ({ id: 900 + i, country: "ITA", league: "ITA_B", level: 3, ovr: 72 })),
  ...Array.from({ length: 18 }).map((_, i) => ({ id: 1e3 + i, country: "GER", league: "GER_A", level: 4, ovr: 81 })),
  ...Array.from({ length: 18 }).map((_, i) => ({ id: 1100 + i, country: "GER", league: "GER_B", level: 3, ovr: 73 })),
  ...Array.from({ length: 18 }).map((_, i) => ({ id: 1200 + i, country: "FRA", league: "FRA_A", level: 4, ovr: 79 })),
  ...Array.from({ length: 18 }).map((_, i) => ({ id: 1300 + i, country: "FRA", league: "FRA_B", level: 3, ovr: 71 })),
  ...Array.from({ length: 28 }).map((_, i) => ({ id: 1400 + i, country: "ARG", league: "ARG_A", level: 3, ovr: 75 })),
  ...Array.from({ length: 38 }).map((_, i) => ({ id: 1500 + i, country: "ARG", league: "ARG_B", level: 2, ovr: 68 })),
  ...Array.from({ length: 16 }).map((_, i) => ({ id: 1600 + i, country: "URU", league: "URU_A", level: 3, ovr: 71 })),
  ...Array.from({ length: 14 }).map((_, i) => ({ id: 1700 + i, country: "URU", league: "URU_B", level: 2, ovr: 65 })),
  ...Array.from({ length: 20 }).map((_, i) => ({ id: 1800 + i, country: "COL", league: "COL_A", level: 3, ovr: 72 })),
  ...Array.from({ length: 16 }).map((_, i) => ({ id: 1900 + i, country: "COL", league: "COL_B", level: 2, ovr: 65 })),
  ...Array.from({ length: 16 }).map((_, i) => ({ id: 2e3 + i, country: "CHI", league: "CHI_A", level: 3, ovr: 71 })),
  ...Array.from({ length: 16 }).map((_, i) => ({ id: 2100 + i, country: "CHI", league: "CHI_B", level: 2, ovr: 65 }))
];
fakeTeamsData.forEach((ft, idx) => {
  const rng = createRNG(ft.id * 88888);
  const name = ft.override?.name || generateFakeName(ft.country, idx, rng);
  const team = generateFakeTeam(ft.id, name, ft.league, ft.level, ft.ovr, ft.country);
  if (ft.override) {
    team.abbreviation = ft.override.abbreviation;
    team.city = ft.override.city;
    team.logoUrl = ft.override.logoUrl;
    const REAL_PLAYERS = {
      400: [
        { name: "Ederson", pos: "GK" },
        { name: "Kyle Walker", pos: "RB" },
        { name: "Ruben Dias", pos: "CB" },
        { name: "John Stones", pos: "CB" },
        { name: "Josko Gvardiol", pos: "LB" },
        { name: "Rodri", pos: "CDM" },
        { name: "Kevin De Bruyne", pos: "CM" },
        { name: "Bernardo Silva", pos: "CM" },
        { name: "Phil Foden", pos: "RW" },
        { name: "Jeremy Doku", pos: "LW" },
        { name: "Erling Haaland", pos: "ST" },
        { name: "Stefan Ortega", pos: "GK" },
        { name: "Nathan Ake", pos: "CB" },
        { name: "Manuel Akanji", pos: "CB" },
        { name: "Rico Lewis", pos: "RB" },
        { name: "Jack Grealish", pos: "LW" },
        { name: "Mateo Kovacic", pos: "CM" },
        { name: "Matheus Nunes", pos: "CM" },
        { name: "Oscar Bobb", pos: "RW" },
        { name: "Julian Alvarez", pos: "ST" }
      ],
      401: [
        { name: "David Raya", pos: "GK" },
        { name: "Ben White", pos: "RB" },
        { name: "William Saliba", pos: "CB" },
        { name: "Gabriel Magalhaes", pos: "CB" },
        { name: "Oleksandr Zinchenko", pos: "LB" },
        { name: "Declan Rice", pos: "CDM" },
        { name: "Martin Odegaard", pos: "CM" },
        { name: "Kai Havertz", pos: "CM" },
        { name: "Bukayo Saka", pos: "RW" },
        { name: "Gabriel Martinelli", pos: "LW" },
        { name: "Gabriel Jesus", pos: "ST" },
        { name: "Aaron Ramsdale", pos: "GK" },
        { name: "Takehiro Tomiyasu", pos: "RB" },
        { name: "Jakub Kiwior", pos: "CB" },
        { name: "Jurrien Timber", pos: "CB" },
        { name: "Thomas Partey", pos: "CDM" },
        { name: "Jorginho", pos: "CM" },
        { name: "Leandro Trossard", pos: "LW" },
        { name: "Reiss Nelson", pos: "RW" },
        { name: "Eddie Nketiah", pos: "ST" }
      ],
      402: [
        { name: "Alisson Becker", pos: "GK" },
        { name: "Alexander-Arnold", pos: "RB" },
        { name: "Virgil van Dijk", pos: "CB" },
        { name: "Ibrahima Konate", pos: "CB" },
        { name: "Andrew Robertson", pos: "LB" },
        { name: "Wataru Endo", pos: "CDM" },
        { name: "Alexis Mac Allister", pos: "CM" },
        { name: "Dominik Szoboszlai", pos: "CM" },
        { name: "Mohamed Salah", pos: "RW" },
        { name: "Luis Diaz", pos: "LW" },
        { name: "Darwin Nunez", pos: "ST" },
        { name: "Caoimhin Kelleher", pos: "GK" },
        { name: "Joe Gomez", pos: "CB" },
        { name: "Jarell Quansah", pos: "CB" },
        { name: "Kostas Tsimikas", pos: "LB" },
        { name: "Conor Bradley", pos: "RB" },
        { name: "Harvey Elliott", pos: "CM" },
        { name: "Curtis Jones", pos: "CM" },
        { name: "Cody Gakpo", pos: "LW" },
        { name: "Diogo Jota", pos: "ST" }
      ],
      403: [
        { name: "Thibaut Courtois", pos: "GK" },
        { name: "Dani Carvajal", pos: "RB" },
        { name: "Antonio Rudiger", pos: "CB" },
        { name: "Eder Militao", pos: "CB" },
        { name: "Ferland Mendy", pos: "LB" },
        { name: "Aurelien Tchouameni", pos: "CDM" },
        { name: "Federico Valverde", pos: "CM" },
        { name: "Jude Bellingham", pos: "CAM" },
        { name: "Rodrygo", pos: "RW" },
        { name: "Vinicius Junior", pos: "LW" },
        { name: "Kylian Mbappe", pos: "ST" },
        { name: "Andriy Lunin", pos: "GK" },
        { name: "David Alaba", pos: "CB" },
        { name: "Nacho", pos: "CB" },
        { name: "Lucas Vazquez", pos: "RB" },
        { name: "Fran Garcia", pos: "LB" },
        { name: "Eduardo Camavinga", pos: "CM" },
        { name: "Luka Modric", pos: "CM" },
        { name: "Brahim Diaz", pos: "CAM" },
        { name: "Joselu", pos: "ST" }
      ]
    };
    const realRoster = REAL_PLAYERS[ft.id];
    if (realRoster) {
      team.players = team.players.map((p, i) => {
        if (i < realRoster.length) {
          const rp = realRoster[i];
          const newAttrs = attrsByPos(rp.pos, p.overall, rng);
          return {
            ...p,
            name: rp.name,
            position: rp.pos,
            ...newAttrs
          };
        }
        return p;
      });
    }
  }
  teams.push(team);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  COUNTRIES,
  LEAGUES,
  teams
});
