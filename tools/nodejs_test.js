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
const {
  getDateByDeltaYear,
  getDateByDeltaMonth,
  getDateByDeltaDay,
  getDateByDeltaHour,
  dateDiffInDay,
  dateDiffInHour,
} = require('../api/libs/time');

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));


(async () => {
  try {
    const ttl = Number("365");
    console.log('ttl=', ttl);
    
    var time = null;
    time = getDateByDeltaYear(0);
    console.log('current time=',time);
    time = getDateByDeltaYear(-2);
    console.log('2 year before time=',time);
    time = getDateByDeltaYear(2);
    console.log('2 year after time=',time);
    time = getDateByDeltaMonth(-2);
    console.log('2 month before time=',time);
    time = getDateByDeltaMonth(2);
    console.log('2 month after time=',time);
    time = getDateByDeltaDay(-2);
    console.log('2 day before time=',time);
    time = getDateByDeltaDay(2);
    console.log('2 day after time=',time);
    time = getDateByDeltaHour(-2);
    console.log('2 hour before time=',time);
    time = getDateByDeltaHour(2);
    console.log('2 hour after time=',time);
    
    var days = 0;
    days = dateDiffInDay(new Date(), getDateByDeltaYear(-2));
    console.log('day diff in days=', days);
    days = dateDiffInDay(new Date(), getDateByDeltaMonth(-2));
    console.log('day diff in days=', days);
    days = dateDiffInDay(new Date(), getDateByDeltaDay(-2));
    console.log('day diff in days=', days);
    
    var hours = 0;
    hours = dateDiffInHour(new Date(), getDateByDeltaDay(-2));
    console.log('day diff in hours=', hours);
    hours = dateDiffInHour(new Date(), getDateByDeltaHour(-2));
    console.log('day diff in hours=', hours);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();

