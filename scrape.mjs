import fs from 'fs';

async function run() {
  const leagueUrl = "https://pt-br.soccerwiki.org/league.php?leagueid=28";
  const html = await fetch(leagueUrl, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  }).then(r => r.text());
  console.log("Length:", html.length);
  fs.writeFileSync('league.html', html);
}
run();
