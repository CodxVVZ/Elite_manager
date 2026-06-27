import fs from 'fs';

const brTeams = [
  "Botafogo", "Palmeiras", "Flamengo", "Grêmio", "Corinthians", "Coritiba", "Internacional", "São Paulo", "Cruzeiro", "Atlético Mineiro", "Vasco da Gama", "Fluminense", "Bahia", "Santos", "Red Bull Bragantino", "Vitória", "Mirassol", "Chapecoense", "Athletico Paranaense", "Remo", "América Mineiro", "Sport", "Athletic", "São Bernardo", "Atlético Goianiense", "Vila Nova", "Avaí", "Botafogo-SP", "CRB", "Ceará", "Criciúma", "Cuiabá", "Fortaleza", "Goiás", "Juventude", "Londrina", "Novorizontino", "Náutico", "Operário-PR", "Guarani"
];

async function getLogo(team: string) {
    const term = encodeURIComponent(team + " futebol escudo");
    // Just hitting wikipedia API for page images
    const url = `https://pt.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(team + ' (futebol)')}`;
    const r = await fetch(url).then(res => res.json());
    
    // Check pages
    let pages = r.query.pages;
    let img = Object.values(pages)[0]?.original?.source;
    if (!img) {
        const url2 = `https://pt.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(team)}`;
        const r2 = await fetch(url2).then(res => res.json());
        img = Object.values(r2.query.pages)[0]?.original?.source;
    }
    return img || "";
}

async function run() {
    for (const team of brTeams) {
        let logo = await getLogo(team);
        if(!logo) {  
           let logo3 = await getLogo("Futebol " + team);
           console.log(`"${team}": "${logo3}",`);
        } else {
           console.log(`"${team}": "${logo}",`);
        }
    }
}
run();
