import fs from 'fs';
const wiki_urls = fs.readFileSync('wiki_urls.ts', 'utf-8');

let teamsFile = fs.readFileSync('lib/teams.ts', 'utf-8');

// Replace brBLogos
const matchBrB = teamsFile.match(/const brBLogos: Record<string, string> = {[\s\S]*?};/);
if (matchBrB) {
    const block = wiki_urls.trim().replace('export const brLogos: Record<string, string> = {', 'const brBLogos: Record<string, string> = {');
    teamsFile = teamsFile.replace(matchBrB[0], block);
}

// Replace clubs logoUrl
const clubsBlock = teamsFile.match(/const clubs:Club\[\]=\[([\s\S]*?)\];/);
if (clubsBlock) {
    let inner = clubsBlock[1];
    const lines = inner.split('\n');
    const newLines = lines.map(line => {
        const m = line.match(/name:"([^"]+)"/);
        if (m) {
            const name = m[1];
            // get correct url from brLogos string
            const rm = wiki_urls.match(new RegExp(`"${name}": "([^"]+)",`));
            if (rm) {
               return line.replace(/logoUrl:"[^"]+"/, `logoUrl:"${rm[1]}"`);
            }
        }
        return line;
    });
    teamsFile = teamsFile.replace(clubsBlock[1], newLines.join('\n'));
}

fs.writeFileSync('lib/teams.ts', teamsFile);
console.log("Replaced!");
