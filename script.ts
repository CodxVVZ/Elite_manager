import fs from 'fs';
const data = JSON.parse(fs.readFileSync('public/db.json', 'utf8'));
console.log(JSON.stringify(data.teams[0], null, 2));

