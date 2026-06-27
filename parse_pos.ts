import fs from 'fs';
import * as cheerio from 'cheerio';

async function testFetch() {
    let html = await fetch('https://pt-br.soccerwiki.org/squad.php?clubid=403').then(r => r.text());
    const $ = cheerio.load(html);
    const rows = $('table.table-custom tbody tr');
    rows.each((i, row) => {
        const tds = $(row).find('td');
        if (tds.length === 0) return;
        const name = $(tds[3]).find('a').text().trim() || $(tds[3]).text().trim();
        const pos = $(tds[4]).text().trim();
        console.log(name + " -> " + pos);
    });
}
testFetch();
