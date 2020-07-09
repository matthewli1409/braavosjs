const { Bitstamp } = require('node-bitstamp');

module.exports = class Bits {
  constructor(key, secret, clientId, fundName) {
    this.bits = new Bitstamp({ key, secret, clientId });
    this.fundName = fundName;
    this.lastPrices = {};
    this.balances = [];
    this.allData = [];
    this.aum = null;
    this.pos = { usd: {}, size: {} };
  }

  async main() {
    await Promise.all([this.getBalances()]);
    await this.getPrices();
    this.setAum();
    this.setPos();
    this.bits.close();
  }

  async getPrices() {
    for (let x in this.balances) {
      const _ = await this.bits
        .ticker(this.balances[x]['ticker'])
        .then(({ body }) => {
          const amountBase = parseFloat(this.balances[x]['balance']) * body.bid;
          this.allData.push({ ...this.balances[x], amountBase: amountBase });
        });
    }
  }

  async getBalances() {
    let balances = [];
    await this.bits.balance().then(({ body: data }) => {
      balances = data;
    });

    for (let asset in balances) {
      const assetSplit = asset.split('_');
      if (
        (assetSplit[assetSplit.length - 1] === 'available') &
        (parseFloat(balances[asset]) !== 0)
      ) {
        this.balances.push({
          asset: assetSplit[0],
          balance: parseFloat(balances[asset]),
          ticker: `${assetSplit[0]}usd`,
        });
      }
    }
  }

  setAum() {
    const aum = this.allData.reduce((prev, next) => prev + next.amountBase, 0);
    this.aum = { fundName: this.fundName, aum };
  }

  setPos() {
    this.allData.map(p => {
      this.pos['usd'][p.asset] = p.amountBase;
      this.pos['size'][p.asset] = p.balance;
    });
  }
};
