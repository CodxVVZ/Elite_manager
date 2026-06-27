import fs from 'fs';
import { ESP_A_TEAMS_RAW } from './lib/esp_a_rosters';
const parseRosterDataCode = fs.readFileSync('lib/teams.ts', 'utf8');

const regex = /function parseRosterData[\s\S]*?return overrides;\n}/;
const match = parseRosterDataCode.match(regex);
const parserSrc = match[0];

fs.writeFileSync('lib/test_parser_module.ts', `
export const PLAYER_POS_OVERRIDE: Record<string, string> = { "Neymar": "LW" };
${parserSrc}
export const getOverrides = () => parseRosterData(\`${ESP_A_TEAMS_RAW}\`, {}, [], 6000, 80, 4);
`);
