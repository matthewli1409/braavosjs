const { RESTv2 } = require('bfx-api-node-rest');
const _ = require('lodash');

module.exports = class BFX {
  constructor(apiKey, apiSecret, fundName, base = 'USD') {
    this.rest = new RESTv2({ apiKey, apiSecret });
    this.base = base;
    this.fundName = fundName;
    this.margPos = [];
    this.wallets = [];
    this.lastPrices = {};
    this.fx = {};
    this.allData = {};
    this.aum = null;
    this.pos = { usd: {}, size: {} };
  }

  async main() {
    await Promise.all([this.getMarginPos(), this.getWallet(), this.getFX()]);
    await this.setPrices();
    await this.combinePrices();
    this.setAum();
    this.setPos();
  }

  async getMarginPos() {
    this.margPos = await this.rest.positions();
  }

  async getWallet() {
    const wallets = await this.rest.balances();
    this.wallets = wallets.map(w => {
      return {
        ...w,
        amount: parseFloat(w.amount),
        currency: w.currency.toUpperCase(),
        ticker: `t${w.currency.toUpperCase()}USD`,
      };
    });
  }

  async setPrices() {
    let symbols = this.margPos.map(p => p[0]);
    this.wallets.map(w => symbols.push(w.ticker));
    symbols = _.uniq(symbols);

    if (symbols.length > 0) {
      const tickers = await this.rest.tickers(symbols);
      tickers.forEach(item => (this.lastPrices[item[0]] = item[7]));
    }
  }

  async combinePrices() {
    this.allData = this.margPos.map(p => {
      return {
        coin: p[0].slice(1, 4),
        ticker: p[0],
        amount: p[2],
        amountBase: p[2] * this.lastPrices[p[0]],
        pnl: p[6],
        type: 'margin',
      };
    });

    this.wallets.forEach(w => {
      let amountBase = 0;
      if (w.currency === this.base) {
        amountBase = w.amount;
      } else if (w.currency === 'GBP') {
        amountBase = w.amount * this.fx['GBP'];
      } else {
        amountBase =
          w.amount * this.lastPrices[w.ticker]
            ? w.amount * this.lastPrices[w.ticker]
            : 0;
      }
      this.allData.push({
        coin: w.currency,
        ticker: w.ticker,
        amount: w.amount,
        amountBase: amountBase,
        type: 'exchange',
      });
    });
  }

  setAum() {
    let aum = 0;
    this.allData.forEach(p => {
      if (p.type === 'margin') {
        aum += p.pnl;
      } else if (p.type === 'exchange') {
        aum += p.amountBase;
      }
    });
    this.aum = { fundName: this.fundName, aum };
  }

  setPos() {
    this.allData.forEach(p => {
      const asset = p.coin.toLowerCase();
      this.pos['usd'][asset] =
        this.pos['usd'][asset] + p.amountBase
          ? this.pos['usd'][asset] + p.amountBase
          : p.amountBase;
      this.pos['size'][asset] =
        this.pos['size'][asset] + p.amount
          ? this.pos['size'][asset] + p.amount
          : p.amount;
    });
  }

  async fxRate(ccy1, ccy2) {
    const fx = await this.rest.exchangeRate(ccy1, ccy2);
    return fx;
  }

  async getFX() {
    const fx = await this.rest.exchangeRate('GBP', 'USD');
    this.fx = { GBP: fx };
  }
};
