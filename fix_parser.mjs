import fs from 'fs';
const content = fs.readFileSync('lib/teams.ts', 'utf8');

const regexToReplace = /const matches = \[\.\.\.line\.matchAll\(\/\(\[A\-ZÀ-Ÿa-zà-ÿ0-9\\\\s\\\\.\\\\'\-\\\]\+\?\)\(\\\?:\\\\s\*-\\?\\\\s\*\(\\\\d\+\)\)\?\\\\s\*\\\\\(\(\[\^\\)\]\+\)\\\\\\)\/g\)\\];\s*if \(matches\.length > 0\) \{[\s\S]*?\} else \{/g;

const replacement = \`const linePattern = /^(?:\\\\d+[-.\\\\s]+)?(.*?)\\\\s*\\\\((.*)\\\\)$/;
      const lineMatch = line.match(linePattern);
      if (lineMatch) {
          matchName = lineMatch[1].trim();
          const inside = lineMatch[2];
          
          let exactPos = "";
          const m2 = inside.match(/(\\\\d+)\\\\s*anos,?\\\\s*(.*?)\\\\s*(?:-|,)\\\\s*Pos:\\\\s*(.*?)\\\\s*(?:-|,)\\\\s*Ovr\\\\s*(\\\\d+)/i);
          if (m2) {
              age = parseInt(m2[1]);
              parsedNat = m2[2].trim();
              exactPos = m2[3] ? m2[3].trim() : "";
              ovrStr = m2[4].trim();
          } else {
              // Fallback
              const parts = inside.split(',').map(p => p.trim());
              const agePart = parts.find(p => p.includes("anos"));
              const ovrPart = inside.split('-').find(p => p.includes("Ovr"));
              if (agePart) {
                  const am = agePart.match(/(\\\\d+)\\\\s*anos/);
                  if (am) age = parseInt(am[1]);
              }
              if (ovrPart) {
                  const om = ovrPart.match(/Ovr (\\\\d+)/);
                  if (om) ovrStr = om[1];
              }
              const natPart = parts.find(p => !p.includes("anos") && !p.includes("Ovr") && p.length > 2);
              if (natPart) {
                  parsedNat = natPart.split('-')[0].trim();
              }
          }
          
          if (matchName.length > 2 && !knownTeams.includes(matchName)) {
              let finalPos = "";
              if (exactPos) {
                  if (exactPos.startsWith("G")) finalPos = "GK";
                  else if (exactPos.includes("A(C)") || exactPos === "A") finalPos = "ST";
                  else if (exactPos.includes("MA(C)")) finalPos = "CAM";
                  else if (exactPos.includes("A(EC)") || exactPos.includes("A(E)") || exactPos.includes("MA(E)")) finalPos = "LW";
                  else if (exactPos.includes("A(DC)") || exactPos.includes("A(D)") || exactPos.includes("MA(D)")) finalPos = "RW";
                  else if (exactPos.includes("M(E)") || exactPos.includes("MD(E)")) finalPos = "LM";
                  else if (exactPos.includes("M(D)") || exactPos.includes("MD(D)")) finalPos = "RM";
                  else if (exactPos.includes("MD") && !exactPos.includes("E") && !exactPos.includes("D")) finalPos = "CDM";
                  else if (exactPos.includes("M(C)") || exactPos === "M") finalPos = "CM";
                  else if (exactPos.includes("D(E)") || exactPos.includes("D(EC)")) finalPos = "LB";
                  else if (exactPos.includes("D(D)") || exactPos.includes("D(DC)")) finalPos = "RB";
                  else if (exactPos.includes("D") && !exactPos.includes("MD")) finalPos = "CB";
                  else if (exactPos.includes("A")) finalPos = "ST";
                  else finalPos = "CM";
              }

              const pos = finalPos || assignPos(currentCategory, matchName);
              if (pos) {
                  currentTeam.players.push({
                      name: matchName,
                      jerseyNumber: currentTeam.j++,
                      age,
                      ovrParam: ovrStr ? parseInt(ovrStr) : undefined,
                      position: pos,
                      nationality: parsedNat
                  });
              }
          }
      } else {\`;

// Because the regex string is hard to escape, let's just do standard string manipulation using split and join on the block boundaries.
let modified = content;
const startSentinel = "const matches = [...line.matchAll(/([A-ZÀ-Ÿa-zà-ÿ0-9\\s\\.\\'-]+?)(?:\\s*-\\s*(\\d+))?\\s*\\(([^)]+)\\)/g)];";
const endSentinel = "} else {\\n         // handle cases with no parentheses but maybe name - number";

if(modified.includes(startSentinel) && modified.includes(endSentinel)) {
    const parts1 = modified.split(startSentinel);
    const parts2 = parts1[1].split(endSentinel);
    
    modified = parts1[0] + replacement + "\\n         // handle cases with no parentheses but maybe name - number" + parts2[1];
    fs.writeFileSync('lib/teams.ts', modified);
    console.log("Replaced successfully!");
} else {
    console.log("Could not find start or end sentinels.", !!modified.includes(startSentinel), !!modified.includes(endSentinel));
    // Let's find exactly what's there
    console.log("Start text:", modified.substring(modified.indexOf("const matches = [...line.matchAll"), modified.indexOf("const matches = [...line.matchAll") + 100));
}
