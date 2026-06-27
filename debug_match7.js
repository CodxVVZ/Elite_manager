const str1 = "604-Vinícius Júnior (25 anos, Brasil - Pos: MA(E),A(EC) - Ovr 95)";
const rxLine = /^(?:\d+[-\.\s]+)?(.*?)\s*\((.*)\)$/;
console.log(str1.match(rxLine));
