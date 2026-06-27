import fs from 'fs';

const soccerWikiIds = {
  "Botafogo": 863,
  "Palmeiras": 851,
  "Flamengo": 859,
  "Grêmio": 849,
  "Corinthians": 866,
  "Coritiba": 855,
  "Internacional": 850,
  "São Paulo": 857,
  "Cruzeiro": 853,
  "Atlético Mineiro": 864,
  "Vasco da Gama": 858,
  "Fluminense": 865,
  "Bahia": 921,
  "Santos": 867,
  "Red Bull Bragantino": 932,
  "Vitória": 925,
  "Mirassol": 10565,
  "Chapecoense": 19685,
  "Athletico Paranaense": 854,
  "Remo": 6997,
  "América Mineiro": 3591,
  "Sport": 923,
  "Athletic": 14197, // Approximate or leave blank
  "São Bernardo": 16900,
  "Atlético Goianiense": 5917,
  "Vila Nova": 928,
  "Avaí": 6994,
  "Botafogo-SP": 10557,
  "CRB": 11082,
  "Ceará": 3593,
  "Criciúma": 929,
  "Cuiabá": 15481,
  "Fortaleza": 3583,
  "Goiás": 924,
  "Juventude": 922,
  "Londrina": 11091,
  "Novorizontino": 21873,
  "Náutico": 927,
  "Operário-PR": 20037,
  "Guarani": 926
};

// Check which are 404s
async function run() {
  for (const [name, id] of Object.entries(soccerWikiIds)) {
      const url = `https://cdn.soccerwiki.org/images/logos/clubs/${id}.png`;
      const r = await fetch(url);
      if (r.status !== 200) {
          console.log(`Failed: ${name} -> ${url}`);
      }
  }
}
run();
