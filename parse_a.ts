import fs from 'fs';
import * as cheerio from 'cheerio';

const teamMappings = {
    "Palmeiras": 300,
    "Flamengo": 294,
    "Grêmio": 602,
    "Corinthians": 290,
    "Internacional": 298,
    "São Paulo": 306,
    "Cruzeiro": 292,
    "Atlético Mineiro": 286,
    "Vasco da Gama": 307,
    "Fluminense": 295,
    "Bahia": 1473,
    "Santos": 304,
    "Red Bull Bragantino": 1447,
    "Botafogo": 288,
    "Coritiba": 291,
    "Vitória": 1237,
    "Mirassol": 2813,
    "Chapecoense": 2379,
    "Athletico Paranaense": 287,
    "Remo": 2476,
    "Sport Recife": 923,
    "Guarani": 1515
};

async function run() {
    let output = "export const BR_A_TEAMS_RAW = `\n";
    let logosOut = "export const BR_A_LOGOS: Record<string, string> = {\n";
    
    for (const [teamName, id] of Object.entries(teamMappings)) {
        console.log("Fetching " + teamName + "...");
        output += teamName + "\n";
        
        try {
            const html = await fetch(`https://pt-br.soccerwiki.org/squad.php?clubid=${id}`).then(r=>r.text());
            const $ = cheerio.load(html);
            
            logosOut += `  "${teamName}": "https://cdn.soccerwiki.org/images/logos/clubs/${id}.png",\n`;

            const positions = {
                "G": "Goleiros",
                "D": "Defensores (D)",
                "M": "Meio-campistas (M)",
                "A": "Atacantes (A)"
            };
            
            for (const [posCode, posName] of Object.entries(positions)) {
                output += posName + "\n";
                const rows = $('table.table-custom tbody tr');
                
                rows.each((i, row) => {
                    const tds = $(row).find('td');
                    if (tds.length === 0) return;
                    
                    const number = $(tds[0]).text().trim();
                    const name = $(tds[3]).find('a').text().trim() || $(tds[3]).text().trim();
                    let nat = "";
                    const flagImg = $(tds[1]).find('span');
                    if (flagImg.length > 0) {
                        nat = $(tds[1]).find('a').attr('title') || $(tds[1]).attr('data-sort') || "Brasil";
                    }
                    if (!nat) nat = "Brasil";
                    
                    let rowPos = $(tds[4]).text().trim();
                    let age = $(tds[5]).text().trim();
                    let ovr = $(tds[6]).text().trim();
                    
                    let translatedNat = nat;
                    if (nat === "Brazil") translatedNat = "Brasil";
                    else if (nat === "Argentina") translatedNat = "Argentina";
                    else if (nat === "Colombia") translatedNat = "Colômbia";
                    else if (nat === "Uruguay") translatedNat = "Uruguai";
                    else if (nat === "Paraguay") translatedNat = "Paraguai";
                    
                        if (rowPos.startsWith(posCode)) {
                            let info = [];
                            if (age) info.push(age + " anos");
                            info.push(translatedNat);
                            info.push("Pos: " + rowPos);
                            if (ovr) info.push("Ovr " + ovr);
                            
                            output += `${name} (${info.join(', ')})\n`;
                        }
                });
            }
            output += "\n";
        } catch(e) {
            console.error("Error for " + teamName, e);
        }
    }
    
    output += "`;\n";
    logosOut += "};\n";
    fs.writeFileSync('lib/br_a_rosters.ts', output + "\n" + logosOut);
    console.log("Done writing lib/br_a_rosters.ts");
}
run();
