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

async function picturePaymentHook(txRes, forgeState) {
  try {
    console.log('picturePaymentHook');
    
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
          console.log('payback pic_asset=', pic_asset);
                
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

async function newsflashPaymentHook(txRes, forgeState, userDid) {
  try {
    console.log('newsflashPaymentHook');
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
            var newsflash_tx_memo = {};
            var para_obj = null;
            newsflash_tx_memo['module'] = 'newsflash';
            para_obj = {type: newsflash_doc.news_type, uname: newsflash_doc.author_name, content: newsflash_doc.news_content};
            newsflash_tx_memo['para'] = para_obj;
            //console.log('newsflash hook newsflash_tx_memo=', JSON.stringify(newsflash_tx_memo));
            console.log('newsflash hook newsflash_tx_memo.length=', JSON.stringify(newsflash_tx_memo).length);
                  
            /*send the news to chains*/
            var pay_value_for_chain = tx_value/2;
            var remain_value_for_minner = tx_value - pay_value_for_chain;
            pay_value_for_chain = pay_value_for_chain.toFixed(6);
            remain_value_for_minner = remain_value_for_minner.toFixed(6);
            console.log('hook pay chain=',pay_value_for_chain,'minner=',remain_value_for_minner);
                  
            try {
              transferHash = await ForgeSDK.sendTransferTx({
                tx: {
                  itx: {
                    to: newsflashWallet.address,
                    value: fromTokenToUnit(pay_value_for_chain, forgeState.token.decimal),
                    data: {
                      typeUrl: 'json',
                      value: newsflash_tx_memo,
                    },
                  },
                },
                wallet: appWallet,
              });
              console.log('send the news to chains', transferHash);
            } catch (err) {
              transferHash = null;
              console.error('send the news to chains err', err);
            }
                  
            /*Update newsflash doc*/
            if(transferHash && transferHash.length > 0){
              console.log('update newsflash doc');
              newsflash_doc.news_hash = transferHash;
              newsflash_doc.hash_href = env.chainHost.replace('/api', '/node/explorer/txs/')+transferHash;
              newsflash_doc.minner_balance = String(remain_value_for_minner);
              newsflash_doc.state = 'chained';
              await newsflash_doc.save();
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
                wallet: appWallet,
              });
              console.log('return back the token to user because of upload to chain error', transferHash);
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
              wallet: appWallet,
            });
            console.log('return back the token to user because of asset not exist in db', transferHash);
          }
        }       
      }
    }
  } catch (err) {
    console.error('newsflashPaymentHook error', err);
  } 
}

async function newsflashPaymentHookV2(txRes, forgeState, userDid) {
  try {
    console.log('newsflashPaymentHookV2');
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
      
      /*wait tx ready and get hash result*/
      var res = await waitAndGetTxHash(hash);
      
      if(res && res.getTx && res.getTx.code === 'OK' && res.getTx.info){
        const tx_memo = JSON.parse(res.getTx.info.tx.itxJson.data.value);
        const dapp_module = tx_memo.module;
        if(typeof(dapp_module) != "undefined" && dapp_module.length > 0){
          switch(dapp_module){
            case 'picture':
              picturePaymentHook(res, state);
              break;
            case 'newsflash':
              newsflashPaymentHookV2(res, state, userDid);
              break;
            default:
              console.log('pay.onAuth, unknown dapp module', dapp_module);
              break;
          }
        }
      }
      
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
