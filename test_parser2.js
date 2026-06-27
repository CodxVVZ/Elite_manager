import fs from 'fs';

const content = fs.readFileSync('lib/teams.ts', 'utf8');

const raw = fs.readFileSync('lib/esp_a_rosters.ts', 'utf8');
let rawStr = raw.replace('export const ESP_A_TEAMS_RAW = `', '');
rawStr = rawStr.substring(0, rawStr.length - 1); // remove backtick

// Extract parser function
const parserMatch = content.match(/function parseRosterData[\s\S]*?return overrides;\n}/);
if (!parserMatch) throw new Error("Parser not found");

const parserCode = parserMatch[0].replace('function parseRosterData', 'function parseRosterDataTest');
// assignPos mock
const assignPos = (c,n)=> 'CM';

eval(`
var assignPos = function(c, n) { return 'CM'; };
` + parserCode);

const overrides = parseRosterDataTest(rawStr, {}, [], 6000, 80, 4);

const rma = overrides.find(o => o.name === 'Real Madrid');
if (!rma) {
   console.log("Real Madrid not found!");
} else {
   console.log("Real Madrid total players parsed: " + rma.players?.length);
   console.log(rma.players.filter(p => !p.position.match(/GK|CB|LB|RB|CDM|CM|CAM|LM|RM|LW|RW|ST/)));
   console.log(rma.players.slice(0, 5));
   console.log("Has Vini? " + !!rma.players.find(p => p.name.includes('Vin')));
   const vini = rma.players.find(p => p.name.includes('Vin'));
   console.log(vini);
}
