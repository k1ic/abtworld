/* eslint-disable no-underscore-dangle */
require('dotenv').config();
const ForgeSDK = require('@arcblock/forge-sdk');
const { toAddress } = require('@arcblock/did');
const { wallet } = require('./auth');
const { fromTokenToUnit, fromUnitToToken } = require('@arcblock/forge-util');
const env = require('./env');

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

function unique(arr) {
  return arr.filter(function(item, index, arr) {
    //当前元素，在原始数组中的第一个索引==当前索引值，否则返回当前元素
    return arr.indexOf(item, 0) === index;
  });
}

async function fetchForgeTransactions(module, module_para){
  var tx = [];
  var transactions = [];
  
  if (typeof(module) == "undefined" || !module) {
    return [];
  }
  
  console.log('fetchForgeTransactions module=', module, 'para=', module_para);
  
  switch(module){
    case 'picture':
      if(typeof(module_para) == "undefined" || !module_para){
        return [];
      }
      const user_did = module_para.user_did;
      if(typeof(user_did) == "undefined" || !user_did || user_did === 'undefined'){
        return [];
      }
      console.log('fetchForgeTransactions user_did=', user_did);
      
      const asset_did = module_para.asset_did;
      console.log('fetchForgeTransactions asset_did=', asset_did);
      
      transactions = await ForgeSDK.doRawQuery(`{
        listTransactions(addressFilter: {direction: ONE_WAY, sender: "${toAddress(user_did)}", receiver: "${wallet.address}"}, typeFilter: {types: "transfer"}, paging: {size: 10000}, timeFilter: {startDateTime: "2019-09-24 00:00:00"}) {
          transactions {
            tx {
              itxJson
            }
          }
        }   
      }`);
             
      //console.log('transactions', transactions.listTransactions.transactions);

      tx = transactions.listTransactions.transactions;
      //console.log('tx value', tx);
      //console.log('tx array number', tx.length);
         
      if (tx && tx.length >= 1) {
        //console.log('fetchForgeTransactions - tx', tx);
        console.log('fetchForgeTransactions - tx.length', tx.length);
                  
        if (typeof(asset_did) != "undefined" && asset_did && asset_did.length > 0 && asset_did != 'undefined') {
          const filter_tx = tx.filter(function (e) { 
            if(e.tx.itxJson.data){
              var memo = null;
              try {
                memo = JSON.parse(e.tx.itxJson.data.value);
              } catch (err) {
              }
              if(memo){
                return (memo.module === module && memo.para.asset_did === asset_did);
              }else{
                return 0;
              }
            }else{
              return 0;
            }
          });
          tx = filter_tx;
                    
          //console.log('fetchForgeTransactions - module and asset_did filter tx', tx);
          console.log('fetchForgeTransactions - module and asset_did filter tx.length', tx.length);
        } else {
          const filter_tx = tx.filter(function (e) { 
            if(e.tx.itxJson.data){
              var memo = null;
              try {
                memo = JSON.parse(e.tx.itxJson.data.value);
              } catch (err) {
              }
              if(memo){
                return (memo.module === module);
              }else{
                return 0;
              }
            }else{
              return 0;
            }
          });
          tx = filter_tx;
                    
          //console.log('fetchForgeTransactions - module filter tx', tx);
          console.log('fetchForgeTransactions - module filter tx.length', tx.length);
        }
      }
      break;
    case 'newsflash':
      if(typeof(module_para) == "undefined" || !module_para){
        return [];
      }
      const news_type = module_para.news_type;
      if(typeof(news_type) == "undefined" || !news_type || news_type === 'undefined'){
        return [];
      }
      console.log('fetchForgeTransactions newsflash type=', news_type);
      
      transactions = await ForgeSDK.doRawQuery(`{
        listTransactions(addressFilter: {direction: ONE_WAY, receiver: "${wallet.address}"}, typeFilter: {types: "transfer"}, paging: {size: 10000}, timeFilter: {startDateTime: "2019-09-24 00:00:00"}) {
          transactions {
            tx {
              itxJson
            }
            time
            sender
            hash
          }
        }   
      }`);

      tx = transactions.listTransactions.transactions;
      //console.log('tx value', tx);
      //console.log('tx array number', tx.length);
         
      if (tx && tx.length >= 1) {
        console.log('fetchForgeTransactions - tx.length', tx.length);
                  
        const filter_tx = tx.filter(function (e) { 
          if(e.tx.itxJson.data){
            var memo = null;
            try {
              memo = JSON.parse(e.tx.itxJson.data.value);
            } catch (err) {
            }
            if(memo && typeof(memo.module) != "undefined" && typeof(memo.para) != "undefined" && typeof(memo.para.type) != "undefined"){
              return (memo.module === module && memo.para.type === news_type);
            }else{
              return 0;
            }
          }else{
            return 0;
          }
        });
        tx = filter_tx;
                    
        //console.log('fetchForgeTransactions -  newsflash filter tx', tx);
        console.log('fetchForgeTransactions - newsflash filter tx.length', tx.length);
      }
      break;
    default:
      break;
  }
  
  return tx;
}

async function getAssetPayDataFromTx(tx){  
  var arrMyPaymentData = new Array();
  try {
    /*get forge state*/
    const forgeState = await ForgeSDK.doRawQuery(`{
      getForgeState {
        code
        state {
          token {
            symbol
            decimal
          }
        }
      }
    }`);
    const token = forgeState.getForgeState.state.token;
  
    if(tx && tx.length > 0) {
      var arrAssetDid = tx.map(function( e ) {
        if(e.tx.itxJson.data){
           var memo = null;
           try {
             memo = JSON.parse(e.tx.itxJson.data.value);
           } catch (err) {
           }
           if( memo && typeof(memo.para) != "undefined" && typeof(memo.para.asset_did) != "undefined") {
             return memo.para.asset_did;
           }
         }
         return 0;
      });
      arrAssetDid = unique(arrAssetDid);
      //console.log('getAssetPayDataFromTx arrAssetDid=', arrAssetDid);
      console.log('getAssetPayDataFromTx arrAssetDid.length=', arrAssetDid.length);
        
      /* init my payment data */
      var fValuePayed = 0;
      for(var i=0;i<arrAssetDid.length;i++){
        fValuePayed = 0;
        tx.map(function( e ) {
          if(e.tx.itxJson.data && e.tx.itxJson.data.value) {
            var memo = null;
            try {
              memo = JSON.parse(e.tx.itxJson.data.value);
            } catch (err) {
              console.log('getAssetPayDataFromTx err1 = ', err);
            }
            if( memo && typeof(memo.para) != "undefined" && typeof(memo.para.asset_did) != "undefined") {
              if(memo.para.asset_did === arrAssetDid[i]){
                fValuePayed = fValuePayed + parseFloat(fromUnitToToken(e.tx.itxJson.value, token.decimal));
              }
           }
          }
        });
        arrMyPaymentData[i]={};
        arrMyPaymentData[i]['asset_did'] = arrAssetDid[i];
        arrMyPaymentData[i]['payed'] = String(fValuePayed);
      }
      //console.log('getAssetPayDataFromTx arrMyPaymentData=', arrMyPaymentData);
      console.log('getAssetPayDataFromTx arrMyPaymentData.length=', arrMyPaymentData.length);
    }
  } catch (err) {
    console.log('getAssetPayDataFromTx err2 = ', err);
  }
  
  return arrMyPaymentData;
}

/*
if (env.chainHost) {
  console.log('Connect to chain host', env.chainHost);
  ForgeSDK.connect(env.chainHost, { chainId: env.chainId, name: env.chainId, default: true });
  if (env.assetChainHost) {
    console.log('Connect to asset chain host', env.assetChainHost);
    ForgeSDK.connect(env.assetChainHost, { chainId: env.assetChainId, name: env.assetChainId });
  }
}else{
  console.log('chainHost not define');
  process.exit(0);
}

(async () => {  
  //const module='picture';
  //const module_para = {user_did: 'z1emeg4eeh55Epfdz1bV3jhC9VxQ35H5yPb', asset_did: ''};
  //const tx = await fetchForgeTransactions(module, module_para);
  //console.log('transactions tx.length=', tx.length);
  const module='newsflash';
  const module_para = {news_type: 'blockchain'};
  const tx = await fetchForgeTransactions(module, module_para);
  console.log('tx=', tx);
  console.log('tx.length=', tx.length);
  //const myPayedData =  await getAssetPayDataFromTx(tx);
  //console.log('transactions myPayedData=', myPayedData);
  process.exit(0);
})();
*/

module.exports = {
  fetchForgeTransactions,
  getAssetPayDataFromTx,
};
