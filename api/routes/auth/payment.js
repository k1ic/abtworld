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
const { Picture, Newsflash } = require('../../models');
const { cleanUserDeadNews } = require('../newsflash');
const { forgeTxValueSecureConvert, waitAndGetTxHash } = require('../../libs/transactions');

//const appWallet = fromJSON(wallet);
//const newsflashAppWallet = fromJSON(newsflashWallet);

const appWallet = fromSecretKey(process.env.APP_SK, type);
const newsflashAppWallet = fromSecretKey(process.env.APP_NEWSFLASH_SK, type);

async function paymentHook(hash, forgeState, userDid) {
  try {
    console.log('paymentHook');
    
    const txRes = await waitAndGetTxHash(hash, env.chainId);
    
    if(txRes && txRes.getTx && txRes.getTx.code === 'OK' && txRes.getTx.info){
      const tx_memo = JSON.parse(txRes.getTx.info.tx.itxJson.data.value);
      const tx_value = parseFloat(fromUnitToToken(txRes.getTx.info.tx.itxJson.value, forgeState.token.decimal));
      const tx_from = txRes.getTx.info.tx.from;
      const tx_to = txRes.getTx.info.tx.itxJson.to;
      var transferHash = null;
      var res = null;
            
      console.log('Hook tx from:', tx_from, 'to: ', tx_to);
      console.log('Hook tx_value=', tx_value, 'tx_memo=', tx_memo);
      if(tx_memo.module == 'picture'){
        console.log('picture tx hook');
        var asset_doc = null;
        asset_doc = await Picture.findOne({ asset_did: tx_memo.para.asset_did });
        if(asset_doc) {          
          //update doc info
          asset_doc.payed_counter += 1;
          asset_doc.payed_balance += tx_value;
          
          // one pay counter value 10 hot index
          asset_doc.hot_index += 10;
          asset_doc.star_level += 0.5;
  
          const new_payer_info = {
            udid: tx_from,
            payed_balance: tx_value,
          };
          if(asset_doc.payer_list && asset_doc.payer_list.length > 0){
            const index=asset_doc.payer_list.findIndex((element)=>element.udid == tx_from);
            if(index != -1){
              asset_doc.payer_list[index].payed_balance += tx_value;
            }else{
              asset_doc.payer_list.push(new_payer_info);
            }
          }else{
            asset_doc.payer_list.push(new_payer_info);
          }
          asset_doc.markModified('payer_list');
          asset_doc.updatedAt = Date();
          await asset_doc.save();
          console.log('Hook asset_doc update to', asset_doc);
  
          //verify owner accnout
          res = await ForgeSDK.doRawQuery(`{
            getAccountState(address: "${asset_doc.owner_did.replace(/^did:abt:/, '')}") {
              code
              state {
                address
                balance
                moniker
                pk
              }
            }
          }`); 
          if(res && res.getAccountState && res.getAccountState.state){
            var payback_to_asset_owner_value = (parseFloat(asset_doc.payback_rate) < 1) ? tx_value*parseFloat(asset_doc.payback_rate) : tx_value*0.1;
            var payback_to_app_owner_value = tx_value - payback_to_asset_owner_value;
            payback_to_asset_owner_value = payback_to_asset_owner_value.toFixed(6);
            payback_to_app_owner_value = payback_to_app_owner_value.toFixed(6);
            console.log('payback to asset owner:', String(payback_to_asset_owner_value), 'app owner:', String(payback_to_app_owner_value));

            //console.log('APP_SK', process.env.APP_SK);
            //console.log('APP wallet type', type);
            //console.log('APP wallet', appWallet);
            //payback to asset owner
            transferHash = await ForgeSDK.sendTransferTx({
              tx: {
                itx: {
                  to: asset_doc.owner_did.replace(/^did:abt:/, ''),
                  value: fromTokenToUnit(payback_to_asset_owner_value, forgeState.token.decimal),
                  data: {
                    typeUrl: 'json',
                    value: tx_memo,
                  },
                },
              },
              wallet: appWallet,
            });
            console.log('payback to asset owner transferred', transferHash);
              
            //remains to app owner
            transferHash = await ForgeSDK.sendTransferTx({
              tx: {
                itx: {
                  to: process.env.APP_OWNER_ACCOUNT,
                  value: fromTokenToUnit(payback_to_app_owner_value, forgeState.token.decimal),
                  data: {
                    typeUrl: 'json',
                    value: tx_memo,
                  },
                },
              },
              wallet: appWallet,
            });
            console.log('payback to app owner transferred', transferHash);
          }else{
            console.log('payback asset owner account not exist', asset_doc.owner_did);
          }
        }
      }else if(tx_memo.module == 'article'){
        console.log('article tx hook');
        var asset_doc = null;
        asset_doc = await Newsflash.findOne({ asset_did: tx_memo.para.asset_did });
        if(asset_doc) {          
          //update doc info
          asset_doc.article_payed_counter += 1;
          asset_doc.article_payed_balance += tx_value;
          
          // one pay counter value 10 hot index
          asset_doc.hot_index += 10;
          asset_doc.star_level += 0.5;
  
          const new_payer_info = {
            udid: tx_from,
            payed_balance: tx_value,
          };
          if(asset_doc.article_payer_list && asset_doc.article_payer_list.length > 0){
            const index=asset_doc.article_payer_list.findIndex((element)=>element.udid == tx_from);
            if(index != -1){
              asset_doc.article_payer_list[index].payed_balance += tx_value;
            }else{
              asset_doc.article_payer_list.push(new_payer_info);
            }
          }else{
            asset_doc.article_payer_list.push(new_payer_info);
          }
          asset_doc.markModified('article_payer_list');
          asset_doc.updatedAt = Date();
          await asset_doc.save();
          console.log('Hook asset_doc update to', asset_doc);
  
          //verify owner/author accnout
          res = await ForgeSDK.doRawQuery(`{
            getAccountState(address: "${asset_doc.author_did.replace(/^did:abt:/, '')}") {
              code
              state {
                address
                balance
                moniker
                pk
              }
            }
          }`); 
          if(res && res.getAccountState && res.getAccountState.state){
            var payback_to_asset_owner_value = (asset_doc.article_payback_rate < 1) ? tx_value*asset_doc.article_payback_rate : tx_value*0.1;
            var payback_to_app_owner_value = tx_value - payback_to_asset_owner_value;
            payback_to_asset_owner_value = payback_to_asset_owner_value.toFixed(6);
            payback_to_app_owner_value = payback_to_app_owner_value.toFixed(6);
            console.log('payback to asset owner:', String(payback_to_asset_owner_value), 'app owner:', String(payback_to_app_owner_value));

            //payback to asset owner
            transferHash = await ForgeSDK.sendTransferTx({
              tx: {
                itx: {
                  to: asset_doc.author_did.replace(/^did:abt:/, ''),
                  value: fromTokenToUnit(payback_to_asset_owner_value, forgeState.token.decimal),
                  data: {
                    typeUrl: 'json',
                    value: tx_memo,
                  },
                },
              },
              wallet: newsflashAppWallet,
            });
            console.log('payback to asset owner transferred', transferHash);
              
            //remains to app owner
            transferHash = await ForgeSDK.sendTransferTx({
              tx: {
                itx: {
                  to: process.env.APP_OWNER_ACCOUNT,
                  value: fromTokenToUnit(payback_to_app_owner_value, forgeState.token.decimal),
                  data: {
                    typeUrl: 'json',
                    value: tx_memo,
                  },
                },
              },
              wallet: newsflashAppWallet,
            });
            console.log('payback to app owner transferred', transferHash);
          }else{
            console.log('payback asset owner account not exist', asset_doc.author_did);
          }
        }
      }else{
        /*unknown dapp module*/
        console.log('unknown tx hook, module=', tx_memo.module);
      }
    }
  } catch (err) {
    console.error('paymentHook error', err);
  } 
}

module.exports = {
  action: 'payment',
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
          case 'article':
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
      /*tx memo example
       *{module: 'picture', para: {asset_did:'d99ae4aa6881ce4c4bab83ac8953c7737d68350a'}}
       */
      tx_memo['module'] = dapp;
      tx_memo['para'] = JSON.parse(para);
      //console.log('tx_memo=', JSON.stringify(tx_memo));
      console.log('tx_memo=', tx_memo);
      
      const description = {
        en: `Please pay ${toPay} ${state.token.symbol}`,
        zh: `需支付 ${toPay} ${state.token.symbol}`,
      };

      return {
        type: 'TransferTx',
        data: {
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
    console.log('pay.onAuth', { claims, userDid });
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

      console.log('pay.onAuth', hash);
      
      /*payment hook for payback*/
      paymentHook(hash, state, userDid);
      
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
