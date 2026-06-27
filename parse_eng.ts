import fs from 'fs';
import * as cheerio from 'cheerio';

const teamMappings = {
    "Manchester City": 400,
    "Arsenal": 401,
    "Liverpool": 402,
    "Real Madrid": 403, // Not real ENG, but we keep the ID from previous tests
    // Or I'll just map the whole Premier League!
};

async function run() {
    // Actually let's fetch all teams dynamically from League 28!
    const leagueHtml = await fetch(`https://pt-br.soccerwiki.org/league.php?leagueid=28`).then(r=>r.text());
    const regex = /squad\.php\?clubid=(\d+)[^>]*>([^<]+)<\/a>/g;
    let m;
    const teamMap = new Map();
    while ((m = regex.exec(leagueHtml)) !== null) {
        teamMap.set(m[2].trim(), m[1]);
    }
    
    // De-duplicate team maps since there are duplicate entries on the page
    const finalTeams: Record<string, string> = {};
    for (const [name, id] of teamMap.entries()) {
        if (!name.includes('(')) finalTeams[name] = id;
    }
    
    let output = "export const ENG_A_TEAMS_RAW = `\n";
    let logosOut = "export const ENG_A_LOGOS: Record<string, string> = {\n";
    
    for (const [teamName, id] of Object.entries(finalTeams)) {
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
                        nat = $(tds[1]).find('a').attr('title') || $(tds[1]).attr('data-sort') || "Inglaterra";
                    }
                    if (!nat) nat = "Inglaterra";
                    
                    let rowPos = $(tds[4]).text().trim();
                    let age = $(tds[5]).text().trim();
                    let ovr = $(tds[6]).text().trim();
                    
                    let translatedNat = nat;
                    if (nat === "England") translatedNat = "Inglaterra";
                    else if (nat === "France") translatedNat = "França";
                    else if (nat === "Spain") translatedNat = "Espanha";
                    else if (nat === "Brazil") translatedNat = "Brasil";
                    else if (nat === "Argentina") translatedNat = "Argentina";
                    else if (nat === "Germany") translatedNat = "Alemanha";
                    else if (nat === "Italy") translatedNat = "Itália";
                    else if (nat === "Netherlands") translatedNat = "Holanda";
                    else if (nat === "Portugal") translatedNat = "Portugal";
                    else if (nat === "Belgium") translatedNat = "Bélgica";
                    
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
    fs.writeFileSync('lib/eng_a_rosters.ts', output + "\n" + logosOut);
    console.log("Done writing lib/eng_a_rosters.ts");
}
run();
