const fs = require('fs');

const BFX = require('./components/bfx');
const Bin = require('./components/bin');
const Bits = require('./components/bits');
const CW = require('./components/coldwallet');

const main = async () => {
  const config = Object.values(
    JSON.parse(fs.readFileSync('config/config.json', 'utf8'))
  );

  const _ = new BFX({});
  const baseCcy = await _.fxRate('GBP', 'USD');

  const aums = [];
  const pos = [];
  let coldAum = 0;
  let hotAum = 0;

  const promises = config.map(async m => {
    switch (m.EXCHANGE) {
      case 'BITFINEX': {
        const _ = new BFX(m.KEY, m.SECRET, m.FUNDNAME);
        await _.main();
        aumObj = _.aum;
        hotAum += aumObj.aum;
        aums.push(aumObj);
        pos.push(_.pos);
        console.log(`${m.FUNDNAME} aum: ${aumObj.aum}`);
        break;
      }
      case 'BINANCE': {
        const _ = new Bin(m.KEY, m.SECRET, m.FUNDNAME);
        await _.main();
        aumObj = _.aum;
        hotAum += aumObj.aum;
        aums.push(aumObj);
        pos.push(_.pos);
        console.log(`${m.FUNDNAME} aum: ${aumObj.aum}`);
        break;
      }
      case 'BITSTAMP': {
        const _ = new Bits(m.KEY, m.SECRET, m.USERNAME, m.FUNDNAME);
        await _.main();
        aumObj = _.aum;
        hotAum += aumObj.aum;
        aums.push(aumObj);
        pos.push(_.pos);
        console.log(`${m.FUNDNAME} aum: ${aumObj.aum}`);
        break;
      }
      case 'COLDWALLET': {
        const _ = new CW(m.FUNDNAME);
        await _.main();
        aumObj = _.aum;
        coldAum += aumObj.aum;
        aums.push(aumObj);
        pos.push(_.pos);
        console.log(`${m.FUNDNAME} aum: ${aumObj.aum}`);
        break;
      }
    }
  });
  await Promise.all(promises);

  const _posUsd = pos.map(p => p.usd);
  const _posSize = pos.map(p => p.size);

  const posSize = {};
  _posSize.map(p => {
    let entries = Object.entries(p);
    for (const [key, value] of entries) {
      posSize[key] = posSize[key] + value ? posSize[key] + value : value;
    }
  });
  console.log('\nPOSITIONS BY SIZE:');
  console.log(Object.entries(posSize).sort((a, b) => b[1] - a[1]));

  const posUsd = {};
  _posUsd.map(p => {
    let entries = Object.entries(p);
    for (const [key, value] of entries) {
      posUsd[key] = posUsd[key] + value ? posUsd[key] + value : value;
    }
  });
  console.log('\nPOSITIONS BY USD:');

  let coinUsd = 0;
  for (const p in posUsd) {
    if (!['usd', 'gbp', 'eur'].includes(p)) {
      coinUsd += posUsd[p];
    }
  }

  console.log(Object.entries(posUsd).sort((a, b) => b[1] - a[1]));

  const totalAum = aums.reduce((prev, next) => prev + next.aum, 0);
  console.log(`\nGBPUSD: ${baseCcy}`);
  console.log(`COLD AUM (Base): ${(coldAum / baseCcy).toFixed(2)}`);
  console.log(`HOT AUM (Base): ${(hotAum / baseCcy).toFixed(2)}`);
  console.log(`AUM ($): ${totalAum.toFixed(2)}`);
  console.log(`AUM (Base): ${(totalAum / baseCcy).toFixed(2)}`);

  const expPerc = coinUsd / totalAum;
  console.log(
    `\nCOIN ($) Invested ${coinUsd.toFixed(2)} (${(expPerc * 100).toFixed(2)}%)`
  );
  const coinGbp = coinUsd / baseCcy;
  console.log(
    `COIN (£) Invested ${coinGbp.toFixed(2)} (${(expPerc * 100).toFixed(2)}%)`
  );

  fs.writeFile('data/cold_aum.txt', coldAum / baseCcy, function (err) {
    if (err) return console.log(err);
  });
  fs.writeFile('data/hot_aum.txt', hotAum / baseCcy, function (err) {
    if (err) return console.log(err);
  });
  fs.writeFile('data/total_aum_usd.txt', totalAum, function (err) {
    if (err) return console.log(err);
  });
};

main();
