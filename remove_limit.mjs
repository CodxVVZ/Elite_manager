import fs from 'fs';
const content = fs.readFileSync('lib/teams.ts', 'utf8');
const newContent = content.replace(/&& currentTeam\.players\.length < 45/g, '');
fs.writeFileSync('lib/teams.ts', newContent);
