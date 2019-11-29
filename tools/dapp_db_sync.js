require('dotenv').config();
const mongoose = require('mongoose');
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { fromTokenToUnit, fromUnitToToken } = require('@arcblock/forge-util');
const { fromAddress } = require('@arcblock/forge-wallet');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');

const env = require('../api/libs/env');
const { Picture, Newsflash } = require('../api/models');
const AssetPicList = require('../src/libs/asset_pic');
const { HashString } = require('../api/libs/crypto');
const { 
  forgeTxValueSecureConvert,
  fetchForgeTransactions,
  fetchForgeTransactionsV2,
  fetchForgeTransactionsV3
} = require('../api/libs/transactions');
const { utcToLocalTime } = require('../api/libs/time');
const { getUserDidFragment } = require('../api/libs/user');
const { wallet, newsflashWallet, type } = require('../api/libs/auth');
const { getAssetGenesisHash } = require('../api/libs/assets');

const newsflashAppWallet = fromJSON(newsflashWallet);
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

const newsflashBlockAssetList = [
  'zjdyAw68PFnezMYDZYb5tS6Mx9SkXy4a6s1r',
  'zje1cH1SDVe8zkd8R8PzFjgXrkuw93RgdXze',
  'zjduEhpusean1TESEij891DgfvLSdmsgFca4',
  'zjdpgxPuyXFY9siTn8rNLBeCg43snz2Ncr9v',
  'zjdzA9n2L9hth3jwrne45BoAjRo6AvVeHwrN',
];

async function newsflashRemoveAssets(){
  for (var asset_did of newsflashBlockAssetList) {
    console.log('newsflashRemoveAssets check to remove ', asset_did);
    var doc = await Newsflash.findOne({ asset_did: asset_did });
    if(doc){
      console.log('newsflashRemoveAssets removed doc.asset_did=', doc.asset_did);
      await doc.remove();
    }else{
      console.log('newsflashRemoveAssets asset_did', asset_did, 'not found');
    }
  }
}

async function newsflashCleanDeadNews(){
  var new_docs = [];
  var found = 0;
  
  Newsflash.find().byState('commit').exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('newsflashCleanDeadNews Found', docs.length, 'docs');
      new_docs = docs;
    }else{
      console.log('newsflashCleanDeadNews doc not found!');
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
  
  console.log('newsflashCleanDeadNews wait counter', wait_counter);
  
  if(new_docs.length > 0){
    for(var i=0;i<new_docs.length;i++){
      console.log('newsflashCleanDeadNews clean doc asset_did', new_docs[i].asset_did);
      await new_docs[i].remove();
    }
  }
  
  return;
}

function newsflashAssetDidGen(cdid, tx_memo){
  const asset = {
    moniker: `hash_news_${cdid}`,
    readonly: true,
    transferrable: true,
    issuer: newsflashAppWallet.toAddress(),
    parent: '',
    data: {
      typeUrl: 'json',
      value: tx_memo,
    },
  };

  asset.address = ForgeSDK.Util.toAssetAddress(asset, newsflashAppWallet.toAddress());
  
  return asset.address;
}

async function pictureDappDbSync(){
  console.log('pictureDappDbSync');
}

async function newsflashDappDbSync(){
  console.log('newsflashDappDbSync');
  
  const dapp_module = 'newsflash';
  const module_para = {news_type: 'all'};
  var tx = [];
  
  /*clean dead news*/
  await newsflashCleanDeadNews();
  
  /*V1 style newsflash*/
  tx = await fetchForgeTransactions(dapp_module, module_para);
  if(tx && tx.length > 0){
    await Promise.all(tx.map( async (e) => {      
      try {
        var memo = JSON.parse(e.tx.itxJson.data.value);
        if(memo){
          const cdid = HashString('sha1', memo.para.content);
          const asset_did = newsflashAssetDidGen(cdid, memo);
          const asset_local_time = utcToLocalTime(e.time);
          var author_name = '';
          if(typeof(memo.para.uname) != "undefined" && memo.para.uname && memo.para.uname.length > 0){
            author_name = memo.para.uname;
          }else{
            author_name = '匿名';
          }
          
          //console.log('newsflashDappDbSync V1 asset_did=', asset_did);
          var doc = await Newsflash.findOne({ news_content: memo.para.content });
          if(doc){
            console.log('newsflashDappDbSync V1 update doc item content=', doc.news_content.substring(0,10));
            
            /*update exist doc*/
            doc.asset_did = asset_did;
            doc.content_did = cdid;
            doc.author_did = e.sender;
            doc.author_name = author_name;
            doc.news_hash = e.hash;
            doc.news_time = asset_local_time;
            doc.news_type = memo.para.type;
            doc.news_content = memo.para.content;
            doc.hash_href = env.chainHost.replace('/api', '/node/explorer/txs/')+e.hash;
            await doc.save();
          }else{
            /*create new doc*/
            var new_doc = new Newsflash({
              asset_did: asset_did,
              content_did: cdid,
              author_did: e.sender,
              author_name: author_name,
              author_avatar: '',
              news_hash: e.hash,
              news_time: asset_local_time,
              news_type: memo.para.type,
              news_content: memo.para.content,
              hash_href: env.chainHost.replace('/api', '/node/explorer/txs/')+e.hash,
              state: 'chained',
              minner_state: 'idle',
              createdAt: e.time,
            });
            await new_doc.save();
            console.log('newsflashDappDbSync V1 create new_doc.asset_did=', new_doc.asset_did);
          }
        }else{
          console.log('newsflashDappDbSync V1 empty memo');
        }
      } catch (err) {
        console.log('newsflashDappDbSync V1 err=', err);
      }
    }));
  }else{
    console.log('newsflashDappDbSync V1 empty chain tx');
  }
  
  /*V2 style newsflash*/
  tx = await fetchForgeTransactionsV2(dapp_module, module_para);
  if(tx && tx.length > 0){
    await Promise.all(tx.map( async (e) => {      
      try {
        var memo = JSON.parse(e.tx.itxJson.data.value);
        if(memo){
          const cdid = HashString('sha1', memo.para.content);
          const asset_did = newsflashAssetDidGen(cdid, memo);
          const asset_local_time = utcToLocalTime(e.time);
          var author_name = '';
          if(typeof(memo.para.uname) != "undefined" && memo.para.uname && memo.para.uname.length > 0){
            author_name = memo.para.uname;
          }else{
            author_name = '匿名';
          }
          
          //console.log('newsflashDappDbSync V2 asset_did=', asset_did);
          var doc = await Newsflash.findOne({ news_content: memo.para.content });
          if(doc){
            console.log('newsflashDappDbSync V2 update doc item content=', doc.news_content.substring(0,10));
          
            /*update exist doc*/
            doc.asset_did = asset_did;
            doc.content_did = cdid;
            doc.author_did = e.sender;
            doc.author_name = author_name;
            doc.news_hash = e.hash;
            doc.news_time = asset_local_time;
            doc.news_type = memo.para.type;
            doc.news_content = memo.para.content;
            doc.hash_href = env.chainHost.replace('/api', '/node/explorer/txs/')+e.hash;
            await doc.save();
          }else{
            /*create new doc*/
            var new_doc = new Newsflash({
              asset_did: asset_did,
              content_did: cdid,
              author_did: e.sender,
              author_name: author_name,
              author_avatar: '',
              news_hash: e.hash,
              news_time: asset_local_time,
              news_type: memo.para.type,
              news_content: memo.para.content,
              hash_href: env.chainHost.replace('/api', '/node/explorer/txs/')+e.hash,
              state: 'chained',
              minner_state: 'idle',
              createdAt: e.time,
            });
            await new_doc.save();
            console.log('newsflashDappDbSync V2 create new_doc.asset_did=', new_doc.asset_did);
          }
        }else{
          console.log('newsflashDappDbSync V2 empty memo');
        }
      } catch (err) {
        console.log('newsflashDappDbSync V2 err=', err);
      }
    }));
  }else{
    console.log('newsflashDappDbSync V2 empty chain tx');
  }
  
  /*V3 style newsflash*/
  tx = await fetchForgeTransactionsV3(dapp_module, module_para);
  if(tx && tx.length > 0){
    await Promise.all(tx.map( async (e) => {
      try {
        var memo = JSON.parse(e.data.value);
        if(memo){
          const cdid = HashString('sha1', memo.para.content);
          const asset_did = newsflashAssetDidGen(cdid, memo);
          const asset_local_time = utcToLocalTime(e.genesisTime);
          const asset_hash = await getAssetGenesisHash(e.address);
        
          var author_name = '';
          if(typeof(memo.para.uname) != "undefined" && memo.para.uname && memo.para.uname.length > 0){
            author_name = memo.para.uname;
          }else{
            author_name = '匿名';
          }
        
          //console.log('newsflashDappDbSync V2 asset_did=', asset_did);
          var doc = await Newsflash.findOne({ news_content: memo.para.content });
          if(doc){
            console.log('newsflashDappDbSync V3 update doc item content=', doc.news_content.substring(0,10));
          
            /*update exist doc*/
            doc.asset_did = e.address;
            doc.content_did = cdid;
            doc.author_did = memo.para.udid;
            doc.author_name = author_name;
            doc.author_avatar = memo.para.uavatar;
            doc.news_hash = asset_hash;
            doc.news_time = asset_local_time;
            doc.news_type = memo.para.type;
            doc.news_content = memo.para.content;
            doc.hash_href = env.chainHost.replace('/api', '/node/explorer/txs/')+asset_hash;
            await doc.save();
          }else{
            /*create new doc*/
            var new_doc = new Newsflash({
              asset_did: e.address,
              content_did: cdid,
              author_did: memo.para.udid,
              author_name: author_name,
              author_avatar: memo.para.uavatar,
              news_hash: asset_hash,
              news_time: asset_local_time,
              news_type: memo.para.type,
              news_content: memo.para.content,
              hash_href: env.chainHost.replace('/api', '/node/explorer/txs/')+asset_hash,
              state: 'chained',
              minner_state: 'idle',
              createdAt: e.genesisTime,
            });
            await new_doc.save();
            console.log('newsflashDappDbSync V3 create new_doc.asset_did=', new_doc.asset_did);
          }
        }else{
          console.log('newsflashDappDbSync V3 empty memo');
        }
      } catch (err) {
        console.log('newsflashDappDbSync V3 err=', err);
      }
    }));
  }else{
    console.log('newsflashDappDbSync V3 empty chain tx');
  }
  
  /*remove some assets*/
  await newsflashRemoveAssets();
}

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
 
    // picture dapp sync db with chain
    await pictureDappDbSync();
    
    // newsflash dapp sync db with chain
    await newsflashDappDbSync();
    
    mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();