const puppeteer = require('puppeteer')
const fs = require('fs');

const args = process.argv.slice(2);

const scrape = async () => {
    const catalogs = [args[0]];
    const linksOfAcaras = [];
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.goto(catalogs[0], { waitUntil: 'load' });
    const linksOfCatalogs = await page.evaluate(() => { 
        return Array.from(document.getElementsByClassName('page-link')).map(element => {
            const a = Array.from(element.getElementsByTagName('a'));
            if(a[0] != undefined){
                return a[0].href;
            } else return "";
        });
    }, {});
    const uniqueValuesFromArray = [...new Set(linksOfCatalogs)];
    uniqueValuesFromArray.forEach(element => {
        if(element != "") catalogs.push(element);
    });
    for (const linkOfCatalog of catalogs){
        await page.goto(linkOfCatalog, { waitUntil: 'load' });
        await page.content();
        const acaras = await page.evaluate(() => {
            return Array.from(document.getElementsByClassName('showcase-static')).reduce((_, itens) => {
                    return Array.from(itens.getElementsByClassName('items-product')).map(item => item.getElementsByTagName('a')[0].href);
                }, {});
        });
        acaras.forEach(urls => linksOfAcaras.push(urls));
    }

    const data = [];
    for (const link of linksOfAcaras){
        await page.goto(link, { waitUntil: 'load' });
        await page.content();
        const fish = await page.evaluate(() => {
            const REGEX_FOR_GET_FLOAT_NUMBER = /[+-]?\d+(\.\d+)?/g;
            const obj = { url: location.href }
            const description = document.getElementsByClassName('board_htm description');
            const pElements = Array.from(description).reduce((_, inside) => inside.getElementsByTagName('p'), {});
            const arrayOfElementsSplited = []
            for (const element of pElements){
                const innerText = element.innerText;
                const arrayOfSplitedString = innerText.split(':');
                if(innerText === arrayOfSplitedString[0]) continue;
                arrayOfElementsSplited.push({ start: arrayOfSplitedString[0], end: arrayOfSplitedString[1] });
                if(arrayOfSplitedString[0] === "Alimentação") break;
            }
            arrayOfElementsSplited.forEach(splited => {
                switch(splited.start){
                    case "Nome popular": { obj.nome = splited.end.trim(); } break;
                    case "Nome Popular": { obj.nome = splited.end.trim(); } break;
                    case "Família": { obj.familia = splited.end.trim(); } break;
                    case "Origem": { obj.origin = splited.end.trim(); } break;
                    case "pH": {
                        const floats = splited.end.match(REGEX_FOR_GET_FLOAT_NUMBER).map(function(v) { return parseFloat(v); });
                        obj.medPh = (floats[0] + floats[1])/2.0;
                    } break;
                    case "Sociabilidade": { obj.sociabilidade = splited.end.trim(); } break;
                    case "Temperatura": {
                        const floats = splited.end.match(REGEX_FOR_GET_FLOAT_NUMBER).map(function(v) { return parseFloat(v); });
                        obj.medTemperatura = (floats[0] + floats[1])/2.0;;
                    } break;
                    case "Dureza da água": { obj.durezaAgua = splited.end.trim(); } break;
                    case "Tamanho adulto": { obj.medTamanho = splited.end.trim(); } break;
                    case "Alimentação": { obj.alimentacao = splited.end.trim(); } break;
                }
            });
            if(obj.nome === undefined && obj.familia === undefined && obj.origin === undefined && obj.medPh === undefined && 
                obj.sociabilidade === undefined && obj.medTemperatura === undefined && obj.durezaAgua === undefined && 
                obj.medTamanho === undefined && obj.alimentacao === undefined) return undefined;
            return obj;
        }, {});
        if(fish !== undefined) {
            data.push(fish);
        }
    }
    browser.close();
    return data;
}

function createJson(nameOfFile, content){
    var jsonContent = JSON.stringify(content, null, 2);

    fs.writeFile(nameOfFile, jsonContent, 'utf8', function (err) {
        if (err) return console.error(err)
    });
}

if(args[0] == undefined || args[1] == undefined){
    console.log("por favor insira os argumentos");
    console.log("por exemplo");
    console.log("node ./index.js http://www.rsdiscus.com.br/acaras-disco data.json");
} else {
    scrape().then((value) => {
        createJson(args[1], value);
    })
}

