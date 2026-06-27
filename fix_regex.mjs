import fs from 'fs';
const content = fs.readFileSync('lib/teams.ts', 'utf8');
const newContent = content.replace(
    /const m2 = match\[3\]\.match\(\/\(\\\\d\+\)\\\\s\*anos,\?\\\\s\*\(\.\*\?\)\\\\s\*\(\\\?:-\|,\\\\s\*\)Pos:\\\\s\*\(\.\*\?\)\\\\s\*\(\\\?:-\|,\\\\s\*\)Ovr\\\\s\*\(\\\\d\+\)\/\);/g,
    'const m2 = match[3].match(/(\\d+)\\s*anos,?\\s*(.*?)\\s*(?:-|,)\\s*Pos:\\s*(.*?)\\s*(?:-|,)\\s*Ovr\\s*(\\d+)/i);'
);
// Above regex had to be carefully escaped to match literally if I wanted to use string replacer.
// Let's just do a simple replace:
const fixedContent = content.split('const m2 = match[3].match(/(\\d+)\\s*anos,?\\s*(.*?)\\s*(?:-|,\\s*)Pos:\\s*(.*?)\\s*(?:-|,\\s*)Ovr\\s*(\\d+)/);').join('const m2 = match[3].match(/(\\d+)\\s*anos,?\\s*(.*?)\\s*(?:-|,)\\s*Pos:\\s*(.*?)\\s*(?:-|,)\\s*Ovr\\s*(\\d+)/i);');

fs.writeFileSync('lib/teams.ts', fixedContent);
