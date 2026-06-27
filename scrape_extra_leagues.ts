import fs from 'fs';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const LEAGUES_TO_FETCH = [
  { id: 28, varName: 'ENG_A', level: 4, ovr: 80 },  // Premier League
  { id: 29, varName: 'ENG_B', level: 3, ovr: 72 }, // Championship
  { id: 89, varName: 'ESP_A', level: 4, ovr: 80 }, // La Liga
  { id: 90, varName: 'ESP_B', level: 3, ovr: 72 }, // La Liga 2
  { id: 51, varName: 'ITA_A', level: 4, ovr: 79 }, // Serie A
  { id: 52, varName: 'ITA_B', level: 3, ovr: 71 }, // Serie B
  { id: 39, varName: 'GER_A', level: 4, ovr: 79 }, // Bundesliga
  { id: 40, varName: 'GER_B', level: 3, ovr: 71 }, // 2. Bundesliga
  { id: 36, varName: 'FRA_A', level: 4, ovr: 78 }, // Ligue 1
  { id: 37, varName: 'FRA_B', level: 3, ovr: 70 }, // Ligue 2
  { id: 2, varName: 'ARG_A', level: 3, ovr: 75 }, // Argentina Primera
  { id: 3, varName: 'ARG_B', level: 2, ovr: 68 }, // Argentina B
];

async function run() {
    let outputExtra = `// Auto-generated\n`;

    for (const lg of LEAGUES_TO_FETCH) {
        console.log("Fetching league " + lg.varName + " (ID: " + lg.id + ")");
        let url = 'https://pt-br.soccerwiki.org/league.php?leagueid=' + lg.id;
        let html = await fetch(url).then(r => r.text());
        
        let teamRegex = /squad\.php\?clubid=(\d+)[^>]*>([^<]+)<\/a>/g;
        let teams = [];
        let seenIds = new Set();
        let match;
        while ((match = teamRegex.exec(html)) !== null) {
            let tName = match[2].trim();
            if (tName.includes('(')) continue; // Filter previous winners
            if (!seenIds.has(match[1])) {
                seenIds.add(match[1]);
                teams.push({id: match[1], name: tName});
            }
        }
        
        // Take maximum of 24 teams
        teams = teams.slice(0, 24);
        console.log("Found " + teams.length + " teams for " + lg.varName);

        let teamLogos = [];
        
        let teamPromises = teams.map(async (team, idx) => {
            let squadUrl = 'https://pt-br.soccerwiki.org/squad.php?clubid=' + team.id;
            let squadHtml = await fetch(squadUrl).then(r => r.text());
            
            let logoMatch = squadHtml.match(/<img class="lazyload d-block mx-auto mb-2" data-src="(.*?)"/);
            let logoStr = '';
            if (logoMatch) logoStr = '"' + team.name + '": "' + logoMatch[1] + '"';
            
            let tIndex = squadHtml.indexOf('<table id="datatable"');
            let tableText = tIndex !== -1 ? squadHtml.substring(tIndex, squadHtml.indexOf('</table>', tIndex)) : squadHtml;
            
            let gLines = ["Goleiros"];
            let dLines = ["Defensores"];
            let mLines = ["Meio-campistas"];
            let aLines = ["Atacantes"];

            let rx = /<a style="text-transform:none" href="\/player\.php\?pid=\d+">([^<]+)<\/a><\/td><td[^>]*>(?:<span[^>]*>)?([^<]+)(?:<\/span>)?<\/td><td[^>]*>(\d+)<\/td><td[^>]*>(\d+)<\/td>/g;
            let matchRx;
            // First we need to extract the raw table to also get exactly the spans with nationality.
            // Using cheerio for reliability would be much better since it handles html gracefully.
            const $ = cheerio.load(squadHtml);
            const rows = $('table.table-custom tbody tr');
            
            rows.each((i, row) => {
                const tds = $(row).find('td');
                if (tds.length === 0) return;
                const pName = $(tds[3]).find('a').text().trim() || $(tds[3]).text().trim();
                let nat = $(tds[1]).find('a').attr('title') || $(tds[1]).attr('data-sort') || "UNK";
                const pPos = $(tds[4]).text().trim();
                const pAge = $(tds[5]).text().trim();
                const pOvr = $(tds[6]).text().trim();
                
                if (!pName || !pAge) return;

                let line = pName + " (" + pAge + " anos, " + nat + " - Pos: " + pPos + " - Ovr " + pOvr + ")";
                
                if (pPos.startsWith('G')) {
                    gLines.push(line);
                } else if (pPos.startsWith('D')) {
                    dLines.push(line);
                } else if (pPos.startsWith('M')) {
                    mLines.push(line);
                } else if (pPos.startsWith('A')) {
                    aLines.push(line);
                } else {
                    mLines.push(line);
                }
            });
            
            let textStr = team.name + "\n" + 
                gLines.join('\n') + "\n" +
                dLines.join('\n') + "\n" +
                mLines.join('\n') + "\n" +
                aLines.join('\n');
                
            return { teamName: team.name, textStr: textStr, logoStr };
        });

        const results = await Promise.all(teamPromises);
        let teamRosters = results.map(r => r.textStr);
        teamLogos = results.map(r => r.logoStr).filter(Boolean);

        let fileContent = "export const " + lg.varName + "_TEAMS_RAW = `\n" + teamRosters.join('\n\n') + "\n`;\n";
        fileContent += "export const " + lg.varName + "_LOGOS: Record<string, string> = {\n  " + teamLogos.join(',\n  ') + "\n};\n";

        fs.writeFileSync('lib/' + lg.varName.toLowerCase() + '_rosters.ts', fileContent);
        outputExtra += 'import { ' + lg.varName + '_TEAMS_RAW, ' + lg.varName + '_LOGOS } from "./' + lg.varName.toLowerCase() + '_rosters";\n';
    }
    
    fs.writeFileSync('lib/zz_new_leagues.ts', outputExtra);
    console.log("Written zz_new_leagues.ts");
}
run();
