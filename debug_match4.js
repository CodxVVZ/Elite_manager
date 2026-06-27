const str1 = "604-Vinícius Júnior (25 anos, Brasil - Pos: MA(E),A(EC) - Ovr 95)";

// A better regex for a line:
// Optional number-prefix like "604-" or "1." or "1. "
// Then Name: "Vinícius Júnior "
// Then Parentheses: "(25 anos, Brasil - Pos: MA(E),A(EC) - Ovr 95)"

const rxLine = /^(?:\\d+[-.\\s]*)*([^(]+?)\\s*\\((.*)\\)$/;
console.log(str1.match(rxLine));
