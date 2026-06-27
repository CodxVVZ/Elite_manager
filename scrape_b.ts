import fs from 'fs';

async function run() {
    console.log("Fetching league page...");
    const text = await fetch('https://pt-br.soccerwiki.org/league.php?leagueid=15').then(r=>r.text());
    
    const lines = text.split('\n');
    let teams = [];
    
    // Find lines with squad.php?clubid=
    for (const line of lines) {
        let match = line.match(/squad\.php\?clubid=(\d+)[^>]*>([^<]+)<\/a>/);
        if (match) {
            // some have images before, let's refine
            const nameMatch = line.match(/>([^<]+)<\/a>/g);
            // Actually, let's use a regex across the text
        }
    }
    
    const regex = /squad\.php\?clubid=(\d+)[^>]*>([^<]+)<\/a>/g;
    let m;
    const teamMap = new Map();
    while ((m = regex.exec(text)) !== null) {
        teamMap.set(m[2].trim(), m[1]);
    }
    
    console.log(teamMap);
}
run();
