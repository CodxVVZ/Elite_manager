const str1 = "604-Vinícius Júnior (25 anos, Brasil - Pos: MA(E),A(EC) - Ovr 95)";
const str2 = "1. Fulano (25, Brasil - Ovr 70), 2. Ciclano (22, Argentina - Ovr 72)";

console.log([...str1.matchAll(/(?:\\d+\\.-?\\s*)?([A-Za-zÀ-ÿ\\s\\.\\'\\-]+?)(?:\\s*\\((\\d+)\\))?\\s*\\((.*)\\)/g)]);
console.log([...str2.matchAll(/(?:\\d+\\.\\s*-?\\s*)?([A-Za-zÀ-ÿ\\s\\.\\'\\-]+?)(?:\\s*\\((\\d+)\\))?\\s*\\((.*?)\\)/g)]);
