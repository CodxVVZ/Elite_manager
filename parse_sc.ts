import fs from 'fs';
import * as cheerio from 'cheerio';

const teamMappings = {
    "América Mineiro": 1614,
    "Sport": 923,
    "Athletic": 6341,
    "São Bernardo": 3122,
    "Atlético Goianiense": 1581,
    "Vila Nova": 1457,
    "Avaí": 1414,
    "Botafogo-SP": 2802,
    "CRB": 2015,
    "Ceará": 1458,
    "Criciúma": 1772,
    "Cuiabá": 2416,
    "Fortaleza": 296,
    "Goiás": 297,
    "Juventude": 299,
    "Londrina": 2881,
    "Novorizontino": 3481,
    "Náutico": 922,
    "Operário-PR": 2848,
    "Guarani": 1515
};

async function run() {
    let output = "export const BR_B_TEAMS_RAW = `\n";
    let logosOut = "export const BR_B_LOGOS: Record<string, string> = {\n";
    
    for (const [teamName, id] of Object.entries(teamMappings)) {
        console.log("Fetching " + teamName + "...");
        output += teamName + "\n";
        logosOut += `  "${teamName}": "https://cdn.soccerwiki.org/images/logos/clubs/${id}.png",\n`;
        
        try {
            const html = await fetch(`https://pt-br.soccerwiki.org/squad.php?clubid=${id}`).then(r=>r.text());
            const $ = cheerio.load(html);
            
            const positions = {
                "G": "Goleiros",
                "D": "Defensores (D)",
                "M": "Meio-campistas (M)",
                "A": "Atacantes (A)"
            };
            
            // Loop over positions
            for (const [posCode, posName] of Object.entries(positions)) {
                output += posName + "\n";
                // Table doesn't have an ID easily to grab, but player rows have specific structure
                // We'll iterate all trs in the table
                const rows = $('table.table-custom tbody tr');
                
                rows.each((i, row) => {
                    const tds = $(row).find('td');
                    if (tds.length === 0) return;
                    
                    const posEl = $(tds[4]).text().trim(); // typically position is 5th column 
                    // 0: Number (td)
                    // 1: Nationality (td img alt/title)
                    // 2: Photo (td)
                    // 3: Name (td a)
                    // 4: Position (td span)
                    // 5: Age
                    // 6: Rating
                    
                    const number = $(tds[0]).text().trim();
                    const name = $(tds[3]).find('a').text().trim() || $(tds[3]).text().trim();
                    let nat = "";
                    const flagImg = $(tds[1]).find('span'); // it's a map flag-icon
                    if (flagImg.length > 0) {
                        nat = $(tds[1]).find('a').attr('title') || $(tds[1]).attr('data-sort') || "Brasil";
                    }
                    if (!nat) nat = "Brasil";
                    
                    let rowPos = $(tds[4]).text().trim();
                    let age = $(tds[5]).text().trim();
                    let height = "0"; // height is not visible here
                    let ovr = $(tds[6]).text().trim();
                    
                    let translatedNat = nat;
                    if (nat === "Brazil") translatedNat = "Brasil";
                    else if (nat === "Argentina") translatedNat = "Argentina";
                    else if (nat === "Colombia") translatedNat = "Colômbia";
                    else if (nat === "Uruguay") translatedNat = "Uruguai";
                    else if (nat === "Paraguay") translatedNat = "Paraguai";
                    
                    if (rowPos.startsWith(posCode)) {
                        const numStr = number && number !== "0" ? ` - ${number}` : '';
                        let info = [];
                        if (age) info.push(`${age} anos`);
                        info.push(translatedNat);
                        if (ovr) info.push(`Ovr ${ovr}`);
                        
                        output += `${name}${numStr} (${info.join(', ')})\n`;
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
    fs.writeFileSync('lib/br_b_rosters.ts', output + "\n" + logosOut);
    console.log("Done writing lib/br_b_rosters.ts");
}
run();
