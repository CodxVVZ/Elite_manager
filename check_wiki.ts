import fs from 'fs';

const urls = [
"https://upload.wikimedia.org/wikipedia/commons/5/52/Botafogo_de_Futebol_e_Regatas_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/a/ac/Escudo_do_Gremio.svg",
"https://upload.wikimedia.org/wikipedia/pt/b/b4/Corinthians_simbolo.png",
"https://upload.wikimedia.org/wikipedia/commons/a/ab/Coritiba_FBC_%282011%29_-_Paran%C3%A1.svg",
"https://upload.wikimedia.org/wikipedia/commons/f/f1/Escudo_do_Sport_Club_Internacional.svg",
"https://upload.wikimedia.org/wikipedia/commons/4/4b/S%C3%A3o_Paulo_Futebol_Clube.svg",
"https://upload.wikimedia.org/wikipedia/commons/9/90/Cruzeiro_Esporte_Clube_%28logo%29.svg",
"https://upload.wikimedia.org/wikipedia/commons/2/27/Clube_Atl%C3%A9tico_Mineiro_logo.svg",
"https://upload.wikimedia.org/wikipedia/pt/a/ac/CRVascodaGama.png",
"https://upload.wikimedia.org/wikipedia/commons/a/a3/Fluminense_FC_escudo.svg",
"https://upload.wikimedia.org/wikipedia/commons/9/90/Esporte_Clube_Bahia_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/3/35/Santos_logo.svg",
"https://upload.wikimedia.org/wikipedia/en/2/2c/Red_Bull_Bragantino.svg",
"https://upload.wikimedia.org/wikipedia/commons/e/ec/Esporte_Clube_Vit%C3%B3ria_logo.svg",
"https://upload.wikimedia.org/wikipedia/pt/8/87/Mirassol_FC.png",
"https://upload.wikimedia.org/wikipedia/commons/3/3c/Associa%C3%A7%C3%A3o_Chapecoense_de_Futebol_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/b/b3/CA_Athletico_Paranaense.svg",
"https://upload.wikimedia.org/wikipedia/commons/d/dd/Clube_do_Remo.svg",
"https://upload.wikimedia.org/wikipedia/commons/a/ac/Am%C3%A9rica_Futebol_Clube_%28MG%29.svg",
"https://upload.wikimedia.org/wikipedia/commons/b/b2/Sport_Club_do_Recife_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Athletic_Club_-_SJDR.svg/1200px-Athletic_Club_-_SJDR.svg.png",
"https://upload.wikimedia.org/wikipedia/commons/f/fa/S%C3%A3o_Bernardo_Futebol_Clube_-_escudo.svg",
"https://upload.wikimedia.org/wikipedia/commons/0/00/Atletico-goianiense-escudo.svg",
"https://upload.wikimedia.org/wikipedia/commons/3/3b/Vila_Nova_Futebol_Clube.svg",
"https://upload.wikimedia.org/wikipedia/commons/a/a4/Ava%C3%AD_F.C._logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/4/41/Botafogo_Futebol_Clube_%28Ribeir%C3%A3o_Preto%29_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/1/15/Clube_de_Regatas_Brasil_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/3/38/Cear%C3%A1_Sporting_Club_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/7/7b/Criciuma.svg",
"https://upload.wikimedia.org/wikipedia/en/b/b1/Cuiaba_EC_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/0/0b/Fortaleza_Esporte_Clube_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/9/91/Goi%C3%A1s_Esporte_Clube_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/d/de/Esporte_Clube_Juventude_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/f/f3/Londrina_Esporte_Clube_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/1/18/Gremio_Novorizontino.svg",
"https://upload.wikimedia.org/wikipedia/commons/4/4e/Clube_N%C3%A1utico_Capibaribe_logo.svg",
"https://upload.wikimedia.org/wikipedia/commons/3/3b/Oper%C3%A1rio_Ferrovi%C3%A1rio_Esporte_Clube.svg",
"https://upload.wikimedia.org/wikipedia/commons/c/c5/Guarani_Futebol_Clube_logo.svg"
];

async function check() {
    for (let u of urls) {
        const r = await fetch(u);
        if (r.status !== 200) {
            console.log("Broken: " + u);
        }
    }
}
check();
