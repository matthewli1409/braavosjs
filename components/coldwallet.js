const fs = require('fs');
const { RESTv2 } = require('bfx-api-node-rest');

module.exports = class CW {
  constructor(fundName) {
    this.cw = Object.values(
      JSON.parse(fs.readFileSync('data/coldwallet.json', 'utf8'))
    );
    this.rest = new RESTv2({});
    this.fundName = fundName;
    this.lastPrices = {};
    this.balances = [];
    this.allData = [];
    this.aum = null;
    this.pos = { usd: {}, size: {} };
  }

  async main() {
    await Promise.all([this.getPrices()]);
    await this.combinePrice();
    this.setAum();
    this.setPos();
  }

  async getPrices() {
    let symbols = this.cw.map(c => `t${c.coin.toUpperCase()}USD`);

    if (symbols.length > 0) {
      const tickers = await this.rest.tickers(symbols);
      tickers.forEach(item => (this.lastPrices[item[0]] = item[7]));
    }
  }

  async combinePrice() {
    this.cw.map(c => {
      const amountBase = this.lastPrices[`t${c.coin}USD`] * c.amount;
      this.allData.push({ ...c, amountBase });
    });
  }

  async getAum() {
    this.allData.map(p => {
      const asset = p.coin.toLowerCase();
      return (res[asset] = p.amountBase);
    });
  }

  setAum() {
    const aum = this.allData.reduce((prev, next) => prev + next.amountBase, 0);
    this.aum = { fundName: this.fundName, aum };
  }

  setPos() {
    this.allData.map(p => {
      const asset = p.coin.toLowerCase();
      this.pos['usd'][asset] = p.amountBase;
      this.pos['size'][asset] = p.amount;
    });
  }
};
