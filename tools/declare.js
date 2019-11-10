/* eslint-disable no-console */
require('dotenv').config();

// eslint-disable-next-line import/no-extraneous-dependencies
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { wallet, newsflashWallet } = require('../api/libs/auth');

const appWallet = fromJSON(wallet);
const newsflashAppWallet = fromJSON(newsflashWallet);

async function getAccoutState(accoutAddr){
  var res = null;
  console.log('getAccoutState accoutAddr=', accoutAddr);
  
  res = await ForgeSDK.doRawQuery(`{
    getAccountState(address: "${accoutAddr}") {
      code
      state {
        address
        balance
        moniker
        pk
      }
    }
  }`); 
  return res;
}

(async () => {
  try {
    var res = null;
    res = await getAccoutState(wallet.address);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await ForgeSDK.sendDeclareTx({
        tx: {
          itx: {
            moniker: 'abtworld',
          },
        },
        wallet: appWallet,
      });

      console.log('Application default app wallet declared', wallet);
      console.log('Application default app wallet declared', res);
    }else{
      console.log('Account '+wallet.address+' already exist');
    }
    
    res = await getAccoutState(newsflashWallet.address);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await ForgeSDK.sendDeclareTx({
        tx: {
          itx: {
            moniker: 'newsflash',
          },
        },
        wallet: newsflashAppWallet,
      });

      console.log('Application newsapp app wallet declared', newsflashWallet);
      console.log('Application newsapp app wallet declared', res);
    }else{
      console.log('Account '+newsflashWallet.address+' already exist');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();
