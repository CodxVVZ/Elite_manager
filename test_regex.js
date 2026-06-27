const regex = /(\d+)\s*anos,?\s*(.*?)\s*(?:-|,\s*)Pos:\s*(.*?)\s*(?:-|,\s*)Ovr\s*(\d+)/i;
const str = "25 anos, Brasil - Pos: MA(E),A(EC) - Ovr 95";
const regex2 = /(\d+)\s*anos,?\s*(.*?)\s*-\s*Pos:\s*(.*?)\s*-\s*Ovr\s*(\d+)/i;
console.log(str.match(regex2));
