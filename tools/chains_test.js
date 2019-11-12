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
        var tx_memo = {};
        
        /*Init tx_memo*/
        tx_memo['module'] = 'test';
        tx_memo['para'] = {
          content1: '中国信息通信研究院、中国通信标准化协会、中国互联网协会、可信区块链推进计划共同主办的“2019可信区块链峰会”在北京召开',
          content2: '中国信息通信研究院、中国通信标准化协会、中国互联网协会、可信区块链推进计划共同主办的“2019可信区块链峰会”在北京召开',
          content3: '中国信息',
        };
        console.log('tx_memo=', JSON.stringify(tx_memo));
        
        /*tx data value support max length 191*/
        console.log('tx_memo.length=', JSON.stringify(tx_memo).length);
        
        transferHash = await ForgeSDK.sendTransferTx({
          tx: {
            itx: {
              to: process.env.APP_OWNER_ACCOUNT,
              value: fromTokenToUnit(0.001, state.token.decimal),
              data: {
                typeUrl: 'json',
                value: tx_memo,
              },
            },
          },
          wallet: appWallet,
        });
        console.log('default app transferHash=', transferHash);
        
      }else{
        console.log('Default app account balance is empty');
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();
