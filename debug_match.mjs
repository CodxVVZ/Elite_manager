import fs from 'fs';
const rawStr = `594-Álvaro Lezcano (18 anos, Espanha - Pos: D(DEC) - Ovr 65)
603-Brahim Díaz (26 anos, Marrocos - Pos: MA,A(DEC) - Ovr 90)
604-Vinícius Júnior (25 anos, Brasil - Pos: MA(E),A(EC) - Ovr 95)
605-Goes Rodrygo (25 anos, Brasil - Pos: MA(DE),A(DEC) - Ovr 93)`;

const lines = rawStr.split('\\n');
for (const line of lines) {
    const rx = /^([^\\-]+?)(?:\\s*-\\s*([^\\(]+))?\\s*\\((.*?)\\)$/;
    const m = line.match(rx);
    if (!m) {
        // another pattern?
        const matches = line.matchAll(/(?:\\d+\\.\\s*-?\\s*)?([A-Za-zÀ-ÿ\\s\\.\\'\\-]+?)(?:\\s*\\((\\d+)\\))?\\s*\\((.*?)\\)/g);
        for(let match of matches) {
            console.log("match[3]:", match[3]);
            console.log(match[3].match(/(\\d+)\\s*anos,?\\s*(.*?)\\s*(?:-|,)\\s*Pos:\\s*(.*?)\\s*(?:-|,)\\s*Ovr\\s*(\\d+)/i));
        }
    }
}
