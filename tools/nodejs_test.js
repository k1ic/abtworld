/* eslint-disable no-console */
require('dotenv').config();

const base64 = require('base64-url');
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { fromUnitToToken, fromTokenToUnit } = require('@arcblock/forge-util');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const { types } = require('@arcblock/mcrypto');

const { wallet } = require('../api/libs/auth');
const AssetPicList = require('../src/libs/asset_pic');
const env = require('../api/libs/env');

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));


(async () => {
  try {
    const ttl = Number("365");
    console.log('ttl=', ttl);
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();

