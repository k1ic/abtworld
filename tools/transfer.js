/* eslint-disable no-console */
require('dotenv').config();
const multibase = require('multibase');
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { fromTokenToUnit, fromUnitToToken } = require('@arcblock/forge-util');
const { fromAddress } = require('@arcblock/forge-wallet');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const { wallet, newsflashWallet, type } = require('../api/libs/auth');
const env = require('../api/libs/env');
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

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
    var accountState = null;
    var accountBalance = null;
    var transferHash = null;
    
    const { state } = await ForgeSDK.getForgeState(
      {},
      { ignoreFields: ['state.protocols', /\.txConfig$/, /\.gas$/] }
    );
    
    /* default app account */
    res = await getAccoutState(wallet.address);
    
    //console.log('default app getAccoutState res=', res);
    //console.log('default app getAccoutState state=', state);
    
    if(res && res.getAccountState && res.getAccountState.state){
      accountState = res.getAccountState.state;
      console.log('default app accountState=', accountState);
      accountBalance = parseFloat(fromUnitToToken(accountState.balance, state.token.decimal));
      console.log('default app accountBalance=', accountBalance);
      
      accountBalance = accountBalance.toFixed(6);
      if(accountBalance > 0){
        /*
        const transferValue = accountBalance;
        //const transferValue = 0.000001;
        transferHash = await ForgeSDK.sendTransferTx({
          tx: {
            itx: {
              to: process.env.APP_OWNER_ACCOUNT,
              value: fromTokenToUnit(transferValue, state.token.decimal),
            },
          },
          wallet: appWallet,
        });
        console.log('default app transferHash=', transferHash);
        */
      }else{
        console.log('Default app account balance is empty');
      }
    }
    
    /* newsflash app account */
    res = await getAccoutState(newsflashWallet.address);
    
    //console.log('newsflash app getAccoutState res=', res);
    //console.log('newsflash app getAccoutState state=', state);
    
    if(res && res.getAccountState && res.getAccountState.state){
      accountState = res.getAccountState.state;
      console.log('newsflash app accountState=', accountState);
      accountBalance = parseFloat(fromUnitToToken(accountState.balance, state.token.decimal));
      console.log('newsflash app accountBalance=', accountBalance);
      
      accountBalance = accountBalance.toFixed(6);
      if(accountBalance > 0){
        /*
        transferHash = await ForgeSDK.sendTransferTx({
          tx: {
            itx: {
              to: process.env.APP_OWNER_ACCOUNT,
              value: fromTokenToUnit(accountBalance, state.token.decimal),
            },
          },
          wallet: newsflashAppWallet,
        });
        console.log('newsflash app transferHash=', transferHash);
        */
      }else{
        console.log('newsflash app account balance is empty');
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();
