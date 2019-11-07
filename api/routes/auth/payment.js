/* eslint-disable no-console */
const multibase = require('multibase');
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromTokenToUnit, fromUnitToToken } = require('@arcblock/forge-util');
const { fromAddress } = require('@arcblock/forge-wallet');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const { wallet, type } = require('../../libs/auth');
const env = require('../../libs/env');
//const AssetPicList = require('../../../src/libs/asset_pic');
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));
const { Picture } = require('../../models');

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

module.exports = {
  action: 'payment',
  claims: {
    signature: async ({ extraParams: { locale, toPay, dapp, para } }) => {
      const { state } = await ForgeSDK.getForgeState(
        {},
        { ignoreFields: ['state.protocols', /\.txConfig$/, /\.gas$/] }
      );
      var tx_memo = {};
      
      console.log('toPay=', toPay);
      console.log('dapp=', dapp);
      console.log('para=', para);
      
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
            to: wallet.address,
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

      //payback
      (async () => {
        try {
          var res = null;
          for(i=0;i<30;i++){
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
              await sleep(1000);
            }
          }
          console.log('callback tx hash', res, 'counter', i);
          if(res && res.getTx && res.getTx.code === 'OK' && res.getTx.info){
            const tx_memo = JSON.parse(res.getTx.info.tx.itxJson.data.value);
            const tx_value = parseFloat(fromUnitToToken(res.getTx.info.tx.itxJson.value, state.token.decimal));
            console.log('callback tx from:', res.getTx.info.tx.from);
            console.log('callback tx_value=', tx_value, 'tx_memo=', tx_memo);
            console.log('callback tx_memo.module=', tx_memo.module);
            if(tx_memo.module == 'picture'){
              console.log('picture tx callback');
              //const pic_asset = AssetPicList.find(x => x.asset_did === tx_memo.para.asset_did);
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
                  const payback_to_asset_owner_value = (parseFloat(pic_asset.payback_rate) < 1) ? tx_value*parseFloat(pic_asset.payback_rate) : tx_value*0.1;
                  const payback_to_app_owner_value = tx_value - payback_to_asset_owner_value;
                  console.log('payback to asset owner:', String(payback_to_asset_owner_value), 'app owner:', String(payback_to_app_owner_value));

                  const appWallet = fromSecretKey(process.env.APP_SK, type);
                  //console.log('APP_SK', process.env.APP_SK);
                  //console.log('APP wallet type', type);
                  //console.log('APP wallet', appWallet);
                  //payback to asset owner
                  var transferHash = await ForgeSDK.sendTransferTx({
                    tx: {
                      itx: {
                        to: pic_asset.owner_did.replace(/^did:abt:/, ''),
                        value: fromTokenToUnit(payback_to_asset_owner_value, state.token.decimal),
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
                        value: fromTokenToUnit(payback_to_app_owner_value, state.token.decimal),
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
            }else if(tx_memo.module == 'newsflash'){
              console.log('newsflash tx callback');
            }
          }
        } catch (err) {
          console.error('pay.back.error', err);
        } 
      })();
      
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
