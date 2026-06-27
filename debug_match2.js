const str = "604-Vinícius Júnior (25 anos, Brasil - Pos: MA(E),A(EC) - Ovr 95)";
const matches = [...str.matchAll(/(?:\d+\.-?\s*)?([A-Za-zÀ-ÿ\s\.\'\-]+?)(?:\s*\((\d+)\))?\s*\((.*?)\)/g)];
console.log(matches);
