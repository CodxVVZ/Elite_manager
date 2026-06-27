import fs from 'fs';

async function fetchRoster() {
  const html = await fetch('https://pt-br.soccerwiki.org/squad.php?clubid=923').then(r => r.text());
  console.log(html.length);
  fs.writeFileSync('sport_recife.html', html);
}
fetchRoster();
