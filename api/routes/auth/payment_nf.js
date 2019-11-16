/* eslint-disable no-console */
const multibase = require('multibase');
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { fromTokenToUnit, fromUnitToToken } = require('@arcblock/forge-util');
const { fromAddress } = require('@arcblock/forge-wallet');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const { wallet, newsflashWallet, type } = require('../../libs/auth');
const env = require('../../libs/env');
//const AssetPicList = require('../../../src/libs/asset_pic');
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));
const { Picture } = require('../../models');
const { getNewsForUploadToChain, cleanUserDeadNews } = require('../newsflash');
const { createNewsflahAsset, listAssets } = require('../../libs/assets');

//const appWallet = fromJSON(wallet);
//const newsflashAppWallet = fromJSON(newsflashWallet);

const appWallet = fromSecretKey(process.env.APP_SK, type);
const newsflashAppWallet = fromSecretKey(process.env.APP_NEWSFLASH_SK, type);

async function waitAndGetTxHash(hash){
  var res = null;
  var i = 0;
  if (typeof(hash) == "undefined" || !hash || hash.length == 0) {
    return null;
  }
  
  try {
    for(i=0;i<150;i++){
      res = await ForgeSDK.doRawQuery(`{
        getTx(hash: "${hash}") {
          code
          info {
            tx {
              from
              itxJson
            }
          }
        }
      }`);
      if(res && res.getTx && res.getTx.code === 'OK' && res.getTx.info){
        break;
      }else{
        await sleep(100);
      }
    }
    console.log('waitAndGetTxHash counter', i);    
  } catch (err) {
    console.error('waitAndGetTxHash error', err);
  }
  
  return res;
}

async function newsflashPaymentHookV2(hash, forgeState, userDid) {
  try {
    console.log('newsflashPaymentHookV2');
    
    const txRes = await waitAndGetTxHash(hash);
    
    if(txRes && txRes.getTx && txRes.getTx.code === 'OK' && txRes.getTx.info){
      const tx_memo = JSON.parse(txRes.getTx.info.tx.itxJson.data.value);
      const tx_value = parseFloat(fromUnitToToken(txRes.getTx.info.tx.itxJson.value, forgeState.token.decimal));
      const tx_from = txRes.getTx.info.tx.from;
      const tx_to = txRes.getTx.info.tx.itxJson.to;
      var transferHash = null;
      var res = null;
            
      console.log('Hook tx from:', tx_from, 'to: ', tx_to);
      console.log('Hook tx_value=', tx_value, 'tx_memo=', tx_memo);
      console.log('Hook tx_memo.module=', tx_memo.module);
      if(tx_memo.module == 'newsflash'){
        console.log('newsflash tx hook');
              
        if(typeof(tx_memo.para.asset_did) != "undefined" && tx_memo.para.asset_did.length > 0){
          var newsflash_doc = await getNewsForUploadToChain(tx_memo.para.asset_did);
          if(newsflash_doc){
            /*create asset*/
            transferHash = await createNewsflahAsset(tx_memo.para.asset_did);
            
            /*Update newsflash doc*/
            if(transferHash && transferHash.length > 0){              
              /*pay back and update doc*/
              var pay_value_for_dapp_owner = tx_value/2;
              var remain_value_for_minner = tx_value - pay_value_for_dapp_owner;
              pay_value_for_dapp_owner = pay_value_for_dapp_owner.toFixed(6);
              remain_value_for_minner = remain_value_for_minner.toFixed(6);
              console.log('hook pay dapp owner=',pay_value_for_dapp_owner,'minner=',remain_value_for_minner);
              
              console.log('update newsflash doc');
              newsflash_doc.news_hash = transferHash;
              newsflash_doc.hash_href = env.chainHost.replace('/api', '/node/explorer/txs/')+transferHash;
              newsflash_doc.minner_balance = String(remain_value_for_minner);
              newsflash_doc.state = 'chained';
              await newsflash_doc.save();
              
              try {
                transferHash = await ForgeSDK.sendTransferTx({
                  tx: {
                    itx: {
                      to: process.env.APP_OWNER_ACCOUNT,
                      value: fromTokenToUnit(pay_value_for_dapp_owner, forgeState.token.decimal),
                    },
                  },
                  wallet: newsflashAppWallet,
                });
                console.log('pay for dapp owner', transferHash);
              } catch (err) {
                transferHash = null;
                console.error('pay for dapp owner err', err);
              }       
            }else{
              transferHash = await ForgeSDK.sendTransferTx({
                tx: {
                  itx: {
                    to: tx_from,
                    value: fromTokenToUnit(tx_value, forgeState.token.decimal),
                    data: {
                      typeUrl: 'json',
                      value: tx_memo,
                    },
                  },
                },
                wallet: newsflashAppWallet,
              });
              console.log('return back the token to user because of create asset error', transferHash);
            }
                  
            /*clean dead news*/
            await cleanUserDeadNews(userDid);
            console.log('clean dead news for user', userDid);
          }else{
            /*return back the token to user when asset not exist*/
            transferHash = await ForgeSDK.sendTransferTx({
              tx: {
                itx: {
                  to: tx_from,
                  value: fromTokenToUnit(tx_value, forgeState.token.decimal),
                  data: {
                    typeUrl: 'json',
                    value: tx_memo,
                  },
                },
              },
              wallet: newsflashAppWallet,
            });
            console.log('return back the token to user because of asset not exist in db', transferHash);
          }
        }       
      }
    }
  } catch (err) {
    console.error('newsflashPaymentHookV2 error', err);
  } 
}

module.exports = {
  action: 'payment_nf',
  claims: {
    signature: async ({ extraParams: { locale, toPay, dapp, para } }) => {
      const { state } = await ForgeSDK.getForgeState(
        {},
        { ignoreFields: ['state.protocols', /\.txConfig$/, /\.gas$/] }
      );
      var tx_memo = {};
      var pay_to_addr = null;
      
      console.log('toPay=', toPay);
      console.log('dapp=', dapp);
      console.log('para=', para);
      
      if (typeof(dapp) != "undefined" && dapp && dapp.length > 0){
        switch(dapp){
          case 'newsflash':
            pay_to_addr = newsflashWallet.address;
            break;
          default:
            pay_to_addr = wallet.address;
            break;
        }
      }else{
        pay_to_addr = wallet.address;
      }
      
      /*Init tx_memo*/
      tx_memo['module'] = dapp;
      tx_memo['para'] = JSON.parse(para);
      //console.log('tx_memo=', JSON.stringify(tx_memo));
      console.log('pay_nf.claims tx_memo=', tx_memo);
      
      const description = {
        en: `Please pay ${toPay} ${state.token.symbol}`,
        zh: `需支付 ${toPay} ${state.token.symbol}`,
      };

      return {
        txType: 'TransferTx',
        txData: {
          itx: {
            to: pay_to_addr,
            value: fromTokenToUnit(toPay, state.token.decimal),
            data: {
              typeUrl: 'json',
              value: tx_memo,
            },
          },
        },
        description: description[locale] || description.en,
      };
    },
  },
  onAuth: async ({ claims, userDid, extraParams: { locale } }) => {
    console.log('pay_nf.onAuth', { claims, userDid });
    try {
      const claim = claims.find(x => x.type === 'signature');
      const tx = ForgeSDK.decodeTx(multibase.decode(claim.origin));
      const user = fromAddress(userDid);
      const { state } = await ForgeSDK.getForgeState(
        {},
        { ignoreFields: ['state.protocols', /\.txConfig$/, /\.gas$/] }
      );

      const hash = await ForgeSDK.sendTransferTx({
        tx,
        wallet: user,
        signature: claim.sig,
      });

      console.log('pay_nf.onAuth', hash);
      
      /*payment hook for newsflash*/
      newsflashPaymentHookV2(hash, state, userDid);
      
      return { hash, tx: claim.origin };
    } catch (err) {
      console.error('pay.onAuth.error', err);
      const errors = {
        en: 'Payment failed!',
        zh: '支付失败',
      };
      throw new Error(errors[locale] || errors.en);
    }
  },
};