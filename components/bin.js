const Binance = require('node-binance-api');
const util = require('util');

module.exports = class Bin {
  constructor(apiKey, apiSecret, fundName) {
    this.bin = new Binance().options({ APIKEY: apiKey, APISECRET: apiSecret });
    this.fundName = fundName;
    this.lastPrices = {};
    this.balances = {};
    this.allData = [];
    this.aum = null;
    this.pos = { usd: {}, size: {} };
  }

  async main() {
    await Promise.all([this.getBalances(), this.getPrices()]);
    await this.combinePricePos();
    this.setAum();
    this.setPos();
  }

  async getPrices() {
    this.lastPrices = await this.bin.prices();
  }

  async getBalances() {
    const balances = await util.promisify(this.bin.balance)();
    this.balances = balances;
  }

  async combinePricePos() {
    for (let asset in this.balances) {
      let obj = this.balances[asset];
      obj.available = parseFloat(obj.available);
      if (!obj.available) continue;

      const amountBase =
        obj.available * this.lastPrices[`${asset}USDT`]
          ? obj.available * this.lastPrices[`${asset}USDT`]
          : 0;

      this.allData.push({
        coin: asset,
        amount: obj.available,
        amountBase: amountBase,
      });
    }
  }

  setAum() {
    const aum = this.allData.reduce((prev, next) => prev + next.amountBase, 0);
    this.aum = { fundName: this.fundName, aum };
  }

  setPos() {
    this.allData.map(p => {
      if (p.amountBase !== 0) {
        const asset = p.coin.toLowerCase();
        this.pos['usd'][asset] = p.amountBase;
        this.pos['size'][asset] = p.amount;
      }
    });
  }
};
