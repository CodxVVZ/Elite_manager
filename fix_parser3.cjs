const fs = require('fs');
const content = fs.readFileSync('lib/teams.ts', 'utf8');

const startMarker = '      const matches = [...line.matchAll';
const p1 = content.indexOf(startMarker);
const p2 = content.indexOf('      } else {\\n         // handle cases with no parentheses', p1);

const replacement = "      const linePattern = /^(?:\\\\d+[-.\\\\s]+)?(.*?)\\\\s*\\\\((.*)\\\\)$/;\n" +
"      const lineMatch = line.match(linePattern);\n" +
"      if (lineMatch) {\n" +
"          matchName = lineMatch[1].trim();\n" +
"          const inside = lineMatch[2];\n" +
"          \n" +
"          let exactPos = '';\n" +
"          const m2 = inside.match(/(\\\\d+)\\\\s*anos,?\\\\s*(.*?)\\\\s*(?:-|,)\\\\s*Pos:\\\\s*(.*?)\\\\s*(?:-|,)\\\\s*Ovr\\\\s*(\\\\d+)/i);\n" +
"          if (m2) {\n" +
"              age = parseInt(m2[1]);\n" +
"              parsedNat = m2[2].trim();\n" +
"              exactPos = m2[3] ? m2[3].trim() : '';\n" +
"              ovrStr = m2[4].trim();\n" +
"          } else {\n" +
"              const parts = inside.split(',').map(p => p.trim());\n" +
"              const agePart = parts.find(p => p.includes('anos'));\n" +
"              const ovrPart = inside.split('-').find(p => p.includes('Ovr'));\n" +
"              if (agePart) {\n" +
"                  const am = agePart.match(/(\\\\d+)\\\\s*anos/);\n" +
"                  if (am) age = parseInt(am[1]);\n" +
"              }\n" +
"              if (ovrPart) {\n" +
"                  const om = ovrPart.match(/Ovr (\\\\d+)/);\n" +
"                  if (om) ovrStr = om[1];\n" +
"              }\n" +
"              const natPart = parts.find(p => !p.includes('anos') && !p.includes('Ovr') && p.length > 2);\n" +
"              if (natPart) {\n" +
"                  parsedNat = natPart.split('-')[0].trim();\n" +
"              }\n" +
"          }\n" +
"          \n" +
"          if (matchName.length > 2 && !knownTeams.includes(matchName)) {\n" +
"              let finalPos = '';\n" +
"              if (exactPos) {\n" +
"                  if (exactPos.startsWith('G')) finalPos = 'GK';\n" +
"                  else if (exactPos.includes('A(C)') || exactPos === 'A') finalPos = 'ST';\n" +
"                  else if (exactPos.includes('MA(C)')) finalPos = 'CAM';\n" +
"                  else if (exactPos.includes('A(EC)') || exactPos.includes('A(E)') || exactPos.includes('MA(E)')) finalPos = 'LW';\n" +
"                  else if (exactPos.includes('A(DC)') || exactPos.includes('A(D)') || exactPos.includes('MA(D)')) finalPos = 'RW';\n" +
"                  else if (exactPos.includes('M(E)') || exactPos.includes('MD(E)')) finalPos = 'LM';\n" +
"                  else if (exactPos.includes('M(D)') || exactPos.includes('MD(D)')) finalPos = 'RM';\n" +
"                  else if (exactPos.includes('MD') && !exactPos.includes('E') && !exactPos.includes('D')) finalPos = 'CDM';\n" +
"                  else if (exactPos.includes('M(C)') || exactPos === 'M') finalPos = 'CM';\n" +
"                  else if (exactPos.includes('D(E)') || exactPos.includes('D(EC)')) finalPos = 'LB';\n" +
"                  else if (exactPos.includes('D(D)') || exactPos.includes('D(DC)')) finalPos = 'RB';\n" +
"                  else if (exactPos.includes('D') && !exactPos.includes('MD')) finalPos = 'CB';\n" +
"                  else if (exactPos.includes('A')) finalPos = 'ST';\n" +
"                  else finalPos = 'CM';\n" +
"              }\n" +
"              const pos = finalPos || assignPos(currentCategory, matchName);\n" +
"              if (pos) {\n" +
"                  currentTeam.players.push({\n" +
"                      name: matchName,\n" +
"                      jerseyNumber: currentTeam.j++,\n" +
"                      age,\n" +
"                      ovrParam: ovrStr ? parseInt(ovrStr) : undefined,\n" +
"                      position: pos,\n" +
"                      nationality: parsedNat\n" +
"                  });\n" +
"              }\n" +
"          }\n";

const before = content.substring(0, p1);
const endMarker = "      } else {";
const p3 = content.indexOf(endMarker, p1);
const after = content.substring(p3);
fs.writeFileSync('lib/teams.ts', before + replacement + "\n" + after);
