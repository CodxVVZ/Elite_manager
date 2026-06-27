import { getOverrides } from './lib/test_parser_module';
const over = getOverrides();
const rma = over.find(o => o.name === 'Real Madrid');
console.log(rma?.players?.length);
console.log(rma?.players?.find(p => p.name.includes("Vinícius")));
