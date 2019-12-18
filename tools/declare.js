/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');

// eslint-disable-next-line import/no-extraneous-dependencies
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { wallet, newsflashWallet } = require('../api/libs/auth');
const env = require('../api/libs/env');
const { getDatachainList, forgeChainConnect } = require('../api/routes/datachains');

const appWallet = fromJSON(wallet);
const newsflashAppWallet = fromJSON(newsflashWallet);

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

async function getAccoutState(accoutAddr, connId){
  var res = null;
  //console.log('getAccoutState accoutAddr=', accoutAddr, 'connId=', connId);
  
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
    { conn: connId }
  ); 
  return res;
}

(async () => {
  try {
    var res = null;
    
    if (!process.env.MONGO_URI) {
      throw new Error('Cannot start application without process.env.MONGO_URI');
    }else{
      console.log('MONGO_URI=', process.env.MONGO_URI);
    }
    
    // Connect to database
    let isConnectedBefore = false;
    mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, autoReconnect: true });
    mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));
    mongoose.connection.on('disconnected', () => {
      console.log('Lost MongoDB connection...');
      if (!isConnectedBefore) {
        mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, autoReconnect: true });
      }
    });
    mongoose.connection.on('connected', () => {
      isConnectedBefore = true;
      console.log('Connection established to MongoDB');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('Reconnected to MongoDB');
    });
    
    // wait database conection
    while(1){
      if(isConnectedBefore){
        console.log('Database connected');
        break;
      }else{
        console.log('Database connecting...');
        await sleep(1000);
      }
    }
    
    /*declare account on app default chain*/
    res = await getAccoutState(wallet.address, env.chainId);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await ForgeSDK.sendDeclareTx({
          tx: {
            itx: {
              moniker: 'abtworld',
            },
          },
          wallet: appWallet,
        },
        { conn: env.chainId }
      );
      
      console.log('abtworld account declared on default chain',  env.chainHost);
    }else{
      console.log('abtworld account already on default chain',  env.chainHost);
    }
    res = await getAccoutState(newsflashWallet.address, env.chainId);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await ForgeSDK.sendDeclareTx({
          tx: {
            itx: {
              moniker: 'hashnews',
            },
          },
          wallet: newsflashAppWallet,
        },
        { conn: env.chainId }
      );

      console.log('hashnews account declared on default chain',  env.chainHost);
    }else{
      console.log('hashnews account already on default chain',  env.chainHost);
    }
    
    /*declare accout on app data chain.*/
    const dataChainList = await getDatachainList(); 
    for(var i=0;i<dataChainList.length;i++){
      /*connect to chain*/
      await forgeChainConnect(dataChainList[i].chain_id);
      
      /*declare default account*/
      res = await getAccoutState(wallet.address, dataChainList[i].chain_id);
      if(!res || !res.getAccountState || !res.getAccountState.state){
        res = await ForgeSDK.sendDeclareTx({
            tx: {
              itx: {
                moniker: 'abtworld',
              },
            },
            wallet: appWallet,
          },
          { conn: dataChainList[i].chain_id}
        );

        console.log('abtworld account declared on',  dataChainList[i].chain_host);
      }else{
        console.log('abtworld account already on',  dataChainList[i].chain_host);
      }
      
      /*declare hashnews account*/
      res = await getAccoutState(newsflashWallet.address, dataChainList[i].chain_id);
      if(!res || !res.getAccountState || !res.getAccountState.state){
        res = await ForgeSDK.sendDeclareTx({
            tx: {
              itx: {
                moniker: 'hashnews',
              },
            },
            wallet: newsflashAppWallet,
          },
          { conn: dataChainList[i].chain_id}
        );

        console.log('hashnews account declared on',  dataChainList[i].chain_host);
      }else{
        console.log('hashnews account already on',  dataChainList[i].chain_host);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();
