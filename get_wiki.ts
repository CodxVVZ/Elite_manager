import fs from 'fs';
const shortNames = [
  "Botafogo", "Palmeiras", "Flamengo", "Grêmio", "Corinthians", "Coritiba", "Internacional", "São Paulo", "Cruzeiro", "Atlético Mineiro", "Vasco da Gama", "Fluminense", "Bahia", "Santos", "Red Bull Bragantino", "Vitória", "Mirassol", "Chapecoense", "Athletico Paranaense", "Remo", "América Mineiro", "Sport", "Athletic", "São Bernardo", "Atlético Goianiense", "Vila Nova", "Avaí", "Botafogo-SP", "CRB", "Ceará", "Criciúma", "Cuiabá", "Fortaleza", "Goiás", "Juventude", "Londrina", "Novorizontino", "Náutico", "Operário-PR", "Guarani"
];
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

async function run() {
    let output = "export const brLogos: Record<string, string> = {\n";
    for(let i=0; i<teams.length; i++) {
        let title = encodeURIComponent(teams[i].replace(/ /g, '_'));
        const html = await fetch(`https://pt.wikipedia.org/wiki/${title}`).then(r=>r.text());
        // Find infobox image
        const match = html.match(/<td colspan="2" class="" style="text-align:center;">.*?src="(\/\/[^"]+)"/s);
        if (match) {
            output += `  "${shortNames[i]}": "https:${match[1]}",\n`;
        } else {
            console.log(`Failed for ${teams[i]}`);
            
            // Try standard image search
            const match2 = html.match(/<table class="infobox.*?<img.*?src="(\/\/[^"]+)"/s);
            if (match2) {
                output += `  "${shortNames[i]}": "https:${match2[1]}",\n`;
            } else {
                output += `  "${shortNames[i]}": "",\n`;
            }
        }
    }
    output += "};\n";
    fs.writeFileSync('wiki_urls.ts', output);
    console.log("Written!");
}
run();
