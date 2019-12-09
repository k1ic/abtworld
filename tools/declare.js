/* eslint-disable no-console */
require('dotenv').config();

// eslint-disable-next-line import/no-extraneous-dependencies
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { wallet, newsflashWallet } = require('../api/libs/auth');
const env = require('../api/libs/env');

const appWallet = fromJSON(wallet);
const newsflashAppWallet = fromJSON(newsflashWallet);

async function getAccoutState(accoutAddr, chainId){
  var res = null;
  console.log('getAccoutState accoutAddr=', accoutAddr, 'chainId=', chainId);
  
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
    }`, 
    { conn: chainId }
  ); 
  return res;
}

(async () => {
  try {
    var res = null;
    
    //await ForgeSDK.getChainInfo({ conn: env.chainId }).then(console.log);
    //await ForgeSDK.getChainInfo({ conn: env.assetChainId }).then(console.log);
    
    /*declare account on app chain*/
    res = await getAccoutState(wallet.address, env.chainId);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await ForgeSDK.sendDeclareTx({
        tx: {
          itx: {
            moniker: 'abtworld',
          },
        },
        wallet: appWallet,
      });

      console.log('Application app wallet declared', wallet, 'on', env.chainId);
      console.log('Application app wallet declared', res, 'on', env.chainId);
    }else{
      console.log('Account '+wallet.address+' already exist', 'on', env.chainId);
    }
    
    res = await getAccoutState(newsflashWallet.address, env.chainId);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await ForgeSDK.sendDeclareTx({
        tx: {
          itx: {
            moniker: 'newsflash',
          },
        },
        wallet: newsflashAppWallet,
      });

      console.log('Application newsapp app wallet declared', newsflashWallet, 'on', env.chainId);
      console.log('Application newsapp app wallet declared', res, 'on', env.chainId);
    }else{
      console.log('Account '+newsflashWallet.address+' already exist', 'on', env.chainId);
    }
    
    /*declare account on asset chain*/
    res = await getAccoutState(wallet.address, env.assetChainId);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await ForgeSDK.sendDeclareTx({
          tx: {
            itx: {
              moniker: 'abtworld',
            },
          },
          wallet: appWallet,
        },
        { conn: env.assetChainId }
      );

      console.log('Application default app wallet declared', wallet, 'on', env.assetChainId);
      console.log('Application default app wallet declared', res, 'on', env.assetChainId);
    }else{
      console.log('Account '+wallet.address+' already exist', 'on', env.assetChainId);
    }
    
    res = await getAccoutState(newsflashWallet.address, env.assetChainId);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await ForgeSDK.sendDeclareTx({
          tx: {
            itx: {
              moniker: 'newsflash',
            },
          },
          wallet: newsflashAppWallet,
        },
        { conn: env.assetChainId }
      );

      console.log('Application newsapp app wallet declared', newsflashWallet, 'on', env.assetChainId);
      console.log('Application newsapp app wallet declared', res, 'on', env.assetChainId);
    }else{
      console.log('Account '+newsflashWallet.address+' already exist', 'on', env.assetChainId);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();
