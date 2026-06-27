import fs from 'fs';
import crypto from 'crypto';

const teams = [
  "Botafogo de Futebol e Regatas", 
  "Sociedade Esportiva Palmeiras", 
  "Clube de Regatas do Flamengo", 
  "Grêmio Foot-Ball Porto Alegrense", 
  "Sport Club Corinthians Paulista", 
  "Coritiba Foot Ball Club", 
  "Sport Club Internacional", 
  "São Paulo Futebol Clube", 
  "Cruzeiro Esporte Clube", 
  "Clube Atlético Mineiro", 
  "Club de Regatas Vasco da Gama", 
  "Fluminense Football Club", 
  "Esporte Clube Bahia", 
  "Santos Futebol Clube", 
  "Red Bull Bragantino", 
  "Esporte Clube Vitória", 
  "Mirassol Futebol Clube", 
  "Associação Chapecoense de Futebol", 
  "Club Athletico Paranaense", 
  "Clube do Remo", 
  "América Futebol Clube (Belo Horizonte)", 
  "Sport Club do Recife", 
  "Athletic Club (Minas Gerais)", 
  "São Bernardo Futebol Clube", 
  "Atlético Clube Goianiense", 
  "Vila Nova Futebol Clube", 
  "Avaí Futebol Clube", 
  "Botafogo Futebol Clube (Ribeirão Preto)", 
  "Clube de Regatas Brasil", 
  "Ceará Sporting Club", 
  "Criciúma Esporte Clube", 
  "Cuiabá Esporte Clube", 
  "Fortaleza Esporte Clube", 
  "Goiás Esporte Clube", 
  "Esporte Clube Juventude", 
  "Londrina Esporte Clube", 
  "Grêmio Novorizontino", 
  "Clube Náutico Capibaribe", 
  "Operário Ferroviário Esporte Clube", 
  "Guarani Futebol Clube"
];
const shortNames = [
  "Botafogo", "Palmeiras", "Flamengo", "Grêmio", "Corinthians", "Coritiba", "Internacional", "São Paulo", "Cruzeiro", "Atlético Mineiro", "Vasco da Gama", "Fluminense", "Bahia", "Santos", "Red Bull Bragantino", "Vitória", "Mirassol", "Chapecoense", "Athletico Paranaense", "Remo", "América Mineiro", "Sport", "Athletic", "São Bernardo", "Atlético Goianiense", "Vila Nova", "Avaí", "Botafogo-SP", "CRB", "Ceará", "Criciúma", "Cuiabá", "Fortaleza", "Goiás", "Juventude", "Londrina", "Novorizontino", "Náutico", "Operário-PR", "Guarani"
];

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

async function run() {
    let output = "const correctLogos = {\n";
    for (let i=0; i<teams.length; i++) {
        const team = teams[i];
        const short = shortNames[i];
        
        try {
            // Find wikidata item
            const wdSearch = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(team)}&language=pt&format=json`).then(r=>r.json());
            const id = wdSearch.search[0]?.id;
            if (!id) {
                console.log(`Not found: ${team}`);
                continue;
            }
            
            // Get P154 (logo image)
            const entity = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${id}&property=P154&format=json`).then(r=>r.json());
            const imageName = entity.claims?.P154?.[0]?.mainsnak?.datavalue?.value;
            
            if (imageName) {
                const normalized = imageName.replace(/ /g, '_');
                const hash = md5(normalized);
                const url = `https://upload.wikimedia.org/wikipedia/commons/${hash.substring(0,1)}/${hash.substring(0,2)}/${encodeURIComponent(normalized)}`;
                output += `  "${short}": "${url}",\n`;
            } else {
                console.log(`No logo image for ${team}`);
                output += `  "${short}": "",\n`;
            }
        } catch(e) {
            console.log("Error on ", team);
        }
    }
    output += "};\n";
    fs.writeFileSync('correct_logos.ts', output);
    console.log("Done");
}

run();
