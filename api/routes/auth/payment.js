/* eslint-disable no-console */
const multibase = require('multibase');
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromTokenToUnit, fromUnitToToken } = require('@arcblock/forge-util');
const { fromAddress } = require('@arcblock/forge-wallet');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const { wallet, type } = require('../../libs/auth');
const env = require('../../libs/env');
const AssetPicList = require('../../../src/libs/asset_pic');
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

module.exports = {
  action: 'payment',
  claims: {
    signature: async ({ extraParams: { locale, strValueToPay, memo } }) => {
      const { state } = await ForgeSDK.getForgeState(
        {},
        { ignoreFields: ['state.protocols', /\.txConfig$/, /\.gas$/] }
      );
      
      //console.log('memo', memo);
      //console.log('strValueToPay', strValueToPay);
      memo=memo.replace(/\"/g, "");
      
      const description = {
        en: `Please pay ${strValueToPay} ${state.token.symbol} to unlock`,
        zh: `请支付 ${strValueToPay} ${state.token.symbol} 进行解密`,
      };

      return {
        txType: 'TransferTx',
        txData: {
          itx: {
            to: wallet.address,
            value: fromTokenToUnit(strValueToPay, state.token.decimal),
            data: {
              typeUrl: 'json',
              value: memo,
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
                    itx {
                      ... on TransferTx {
                        data {
                          value
                        }
                        value
                      }
                    }
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
          console.log('get back hash', res, 'counter', i);
          if(res && res.getTx && res.getTx.code === 'OK' && res.getTx.info){
            const tx_memo = res.getTx.info.tx.itx.data.value.replace(/\"/g, "");
            const tx_value = parseFloat(fromUnitToToken(res.getTx.info.tx.itx.value, state.token.decimal));
            const pic_asset = AssetPicList.find(x => x.asset_did === tx_memo);
            console.log('payback memo', tx_memo);

            if(pic_asset) {
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
                        value: pic_asset.asset_did,
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
                        value: pic_asset.asset_did,
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
