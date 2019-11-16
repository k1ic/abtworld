/* eslint-disable no-console */
require('dotenv').config();
const multibase = require('multibase');
const mongoose = require('mongoose');
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { fromTokenToUnit, fromUnitToToken } = require('@arcblock/forge-util');
const { fromAddress } = require('@arcblock/forge-wallet');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');

const { wallet, newsflashWallet, type } = require('./auth');
const { Newsflash } = require('../models');
const { getNewsForUploadToChain } = require('../routes/newsflash');
const env = require('./env');

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

const appWallet = fromJSON(wallet);
const newsflashAppWallet = fromJSON(newsflashWallet);

//const appWallet = fromSecretKey(process.env.APP_SK, type);
//const newsflashAppWallet = fromSecretKey(process.env.APP_NEWSFLASH_SK, type);

//const appWallet = ForgeSDK.Wallet.fromJSON(wallet);
//const newsflashAppWallet = ForgeSDK.Wallet.fromJSON(newsflashWallet);

const getNewsFlash = async cdid => {
  var doc = await Newsflash.findOne({ content_did: cdid });
  return doc;
};

const genNewsFlashAsset = async (cdid) => {
  const news = await getNewsFlash(cdid);
  if(!news){
    return null;
  }
  var newsflash_tx_memo = {};
  var para_obj = null;
  newsflash_tx_memo['module'] = 'newsflash';
  para_obj = {type: news.news_type, uname: news.author_name, udid: news.author_did, content: news.news_content, image: []};
  newsflash_tx_memo['para'] = para_obj;
  
  //console.log('genNewsFlashAsset newsflash_tx_memo=', JSON.stringify(newsflash_tx_memo));
  console.log('genNewsFlashAsset newsflash_tx_memo.length=', JSON.stringify(newsflash_tx_memo).length);

  const asset = {
    moniker: `hash_news_${cdid}`,
    readonly: true,
    transferrable: true,
    issuer: newsflashAppWallet.toAddress(),
    parent: '',
    data: {
      typeUrl: 'json',
      value: newsflash_tx_memo,
    },
  };

  asset.address = ForgeSDK.Util.toAssetAddress(asset, newsflashAppWallet.toAddress());
  console.log('genNewsFlashAsset new asset.address=', asset.address);

  news.asset_did = asset.address;
  await news.save();

  return asset;
};

const waitAndGetTxHash = async hash => {
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

/*create newsflash asset on chain*/
const createNewsflahAsset = async cdid => {
  var result = false;
  var hash = null;
  const asset = await genNewsFlashAsset(cdid);
  //console.log('asset=', asset);
  if(asset){
    // Create asset if not exists
    var { state } = await ForgeSDK.getAssetState({ address: asset.address });
    if (state) {
      console.log('asset exist', asset.address);
      //console.log('asset state=', state);
      result = false;
    } else {
      //console.log('asset not exist', asset.address);
      //console.log('newsflashAppWallet = ', newsflashAppWallet);
      //console.log('newsflashAppWallet.toAddress() = ', newsflashAppWallet.toAddress());
        
      hash = await ForgeSDK.sendCreateAssetTx({ tx: { itx: asset }, wallet: newsflashAppWallet });
      //console.log('asset created', { hash });

      /*wait asset created*/
      const res = await waitAndGetTxHash(hash);
      if(res && res.getTx && res.getTx.code === 'OK' && res.getTx.info){
        //const tx_memo = JSON.parse(res.getTx.info.tx.itxJson.data.value);
        //console.log('tx_memo = ', tx_memo);
      }
      var { state } = await ForgeSDK.getAssetState({ address: asset.address });
      //console.log('asset created hash=', hash, 'state=', state);
      console.log('asset created hash=', hash);
      result = true;
    } 
  }else{
    console.log('invalid asset object');
    result = false;
  }
  
  return hash;
}

const getAssetGenesisHash = async asset_addr => {
  var res = null;
  var hash = null;
  
  //console.log('getAssetGenesisHash asset_addr=', asset_addr);
  
  res = await ForgeSDK.doRawQuery(`{
    getAssetState(address: "${asset_addr}") {
      code
      state {
        context {
          genesisTx {
            hash
          }
        }
      }
    }
  }`); 
  
  if(res && res.getAssetState 
    && res.getAssetState.code === 'OK' 
    && res.getAssetState.state
    && res.getAssetState.state.context
    && res.getAssetState.state.context.genesisTx
    && res.getAssetState.state.context.genesisTx.hash
    && res.getAssetState.state.context.genesisTx.hash.length > 0){
    hash = res.getAssetState.state.context.genesisTx.hash;
  }
  
  return hash;
}

const listAssets= async (ower_did, pages) => {
  var res = null;
  var assets = null;
  
  console.log('listAssets ower_did=', ower_did, 'pages=', pages);
  
  res = await ForgeSDK.doRawQuery(`{
    listAssets(ownerAddress: "${ower_did}", paging: {size: ${pages}}) {
      assets {
        genesisTime
        data {
          typeUrl
          value
        }
        address
      }
      code
    }
  }`); 
  
  if(res && res.listAssets && res.listAssets.code === 'OK' && res.listAssets.assets && res.listAssets.assets.length > 0){
    assets = res.listAssets.assets;
  }
  
  return assets;
}


/*
(async () => {
  try {
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
    
    // init test db
    const cdid = '9656d05f636e838cc58d80c4c679f44ef0409608';
    await newsflashDbInit(cdid);
    
    // create asset on chain
    await createNewsflahAsset(cdid);
    
    // show assets
    const assets = await listAssets(newsflashAppWallet.toAddress(), 1000);
    if(assets && assets.length > 0){
      console.log('The assets of ower', newsflashAppWallet.toAddress(), 'num', assets.length);
      console.log(assets);
    }else{
      console.log('asset is empty');
    }
    
    mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();
*/

module.exports = {
  createNewsflahAsset,
  getAssetGenesisHash,
  listAssets,
};
