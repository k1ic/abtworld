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

async function fetchPics(strAssetDid){
  var new_docs = [];
  var found = 0;
  
  Picture.find().byAssetDid(strAssetDid).exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, 'asset_did docs');
      new_docs = docs;
    }else{
      console.log('asset_did document not found!');
    }
    found = 1;
  })
  
  /*wait found result*/
  var wait_counter = 0;
  while(!found){
    await sleep(1);
    wait_counter++;
    if(wait_counter > 15000){
      break;
    }
  }
  
  console.log('fetchPics wait counter', wait_counter);
  //console.log(new_docs);
  
  return new_docs;
}

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

async function picturePaymentHook(hash, forgeState, userDid) {
  try {
    console.log('picturePaymentHook');
    
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
      if(tx_memo.module == 'picture'){
        console.log('picture tx hook');
        var pic_asset = null;
        await fetchPics(tx_memo.para.asset_did).then((v)=>{
          pic_asset = v;
        });

        if(pic_asset && pic_asset.length > 0) {
          pic_asset = pic_asset[0];
          
          //update doc info
          pic_asset.payed_counter += 1;
          pic_asset.payed_balance += tx_value;
          
          pic_asset.hot_index = pic_asset.payed_counter;
  
          const new_payer_info = {
            udid: tx_from,
            payed_balance: tx_value,
          };
          if(pic_asset.payer_list && pic_asset.payer_list.length > 0){
            const index=pic_asset.payer_list.findIndex((element)=>element.udid == tx_from);
            if(index != -1){
              pic_asset.payer_list[index].payed_balance += tx_value;
            }else{
              pic_asset.payer_list.push(new_payer_info);
            }
          }else{
            pic_asset.payer_list.push(new_payer_info);
          }
          pic_asset.markModified('payer_list');
          pic_asset.updatedAt = Date();
          await pic_asset.save();
          console.log('Hook pic_asset update to', pic_asset);
  
          //verify owner accnout
          res = await ForgeSDK.doRawQuery(`{
            getAccountState(address: "${pic_asset.owner_did.replace(/^did:abt:/, '')}") {
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
            var payback_to_asset_owner_value = (parseFloat(pic_asset.payback_rate) < 1) ? tx_value*parseFloat(pic_asset.payback_rate) : tx_value*0.1;
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
                  to: pic_asset.owner_did.replace(/^did:abt:/, ''),
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
            console.log('payback asset owner account not exist', pic_asset.owner_did);
          }
        }
      }
    }
  } catch (err) {
    console.error('picturePaymentHook error', err);
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
      
      /*payment hook for picture*/
      picturePaymentHook(hash, state, userDid);
      
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
