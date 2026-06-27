import { teams } from "./lib/teams";
const rma = teams.find(t => t.name === "Real Madrid");
console.log(rma?.players.slice(10, 40).map(p => `${p.name} - ${p.position} - ${p.nationality}`));
