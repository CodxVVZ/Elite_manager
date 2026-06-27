import fs from 'fs';
const html = fs.readFileSync('sport_recife.html', 'utf-8');

const regex = /<td class="text-left text-dark" data-sort=".*?"><a style="text-transform:none" href="\/player\.php\?pid=\d+">(.*?)<\/a><\/td><td class="text-left text-dark" data-sort=".*?"><span data-toggle="tooltip" title=".*?">(.*?)<\/span><\/td><td class="text-center text-dark" .*?>(\d+)<\/td><td class="text-center text-dark" .*?>(\d+)<\/td>/g;

const players = [];
let match;
while ((match = regex.exec(html)) !== null) {
    players.push({
        name: match[1],
        pos: match[2],
        age: match[3],
        ovr: match[4]
    });
}
console.log(`Sport\nGoleiros`);
players.forEach(p => {
    console.log(`${p.name} (${p.age} anos, ${p.pos})`);
});
