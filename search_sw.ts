import fs from 'fs';
const terms = ["Mirassol", "Chapecoense", "Athletico Paranaense", "Remo", "Athletic", "São Bernardo", "Botafogo-SP", "CRB", "Cuiabá", "Londrina", "Novorizontino", "Operário-PR"];

async function run() {
    for (const t of terms) {
        const h = await fetch(`https://pt-br.soccerwiki.org/search/club?q=${encodeURIComponent(t)}`).then(r=>r.text());
        const match = h.match(/clubid=(\d+)/);
        console.log(`${t}: ${match ? match[1] : 'Not Found'}`);
    }
}
run();
