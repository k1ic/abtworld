require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../api/libs/env');
const { Datachain, Picture, Newsflash } = require('../api/models');
const AssetPicList = require('../src/libs/asset_pic');
const dataChainList = require('../src/libs/datachains');
const { forgeTokenStateGet } = require('../api/routes/session');
const { getPictureListFromDb } = require('../api/routes/pictures');

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

async function datachainDbInit(){
  try {
    /*Import const datachain list to database*/
    console.log('[Start]Import const datachain list to database');
    for(var i=0;i<dataChainList.length;i++){
      var doc = await Datachain.findOne({ chain_host: dataChainList[i].chain_host });
      if (doc) {
        doc.name = dataChainList[i].name;
        doc.chain_id = dataChainList[i].chain_id;
        await doc.save();
        //console.log('update datachain', doc);
      }else{
        var doc_new = new Datachain({
          name: dataChainList[i].name,
          chain_host: dataChainList[i].chain_host,
          chain_id: dataChainList[i].chain_id,
          createdAt: Date(),
        });
        await doc_new.save();
        //console.log('create datachain', doc_new);
      }
    }
    console.log('[End]Import const datachain list to database');
  } catch (err) {
    console.log('datachainDbInit err=', err);
  }
}

async function pictureDbInit(){
  try {
    const token = await forgeTokenStateGet();
    
    /*Import const picture data to database*/
    console.log('[Start]Import const picture data to database');
    for(var i=0;i<AssetPicList.length;i++){
      var picture = await Picture.findOne({ asset_did: AssetPicList[i].asset_did });
      if (picture) {
        picture.category = AssetPicList[i].category;
        picture.owner = AssetPicList[i].owner;
        picture.contact = AssetPicList[i].contact;
        picture.owner_did = AssetPicList[i].owner_did;
        picture.blur_src = AssetPicList[i].blur_src;
        picture.hd_src = AssetPicList[i].hd_src;
        picture.asset_did = AssetPicList[i].asset_did;
        picture.link = AssetPicList[i].link;
        picture.title = AssetPicList[i].title;
        picture.description = AssetPicList[i].description;
        picture.worth = AssetPicList[i].worth;
        picture.token_sym = token.symbol;
        picture.payback_rate = AssetPicList[i].payback_rate;
        await picture.save();
        //console.log('update picture', picture);
      }else{
        var pic_new = new Picture({
          category: AssetPicList[i].category,
          owner: AssetPicList[i].owner,
          contact: AssetPicList[i].contact,
          owner_did: AssetPicList[i].owner_did,
          blur_src: AssetPicList[i].blur_src,
          hd_src: AssetPicList[i].hd_src,
          asset_did: AssetPicList[i].asset_did,
          link: AssetPicList[i].link,
          title: AssetPicList[i].title,
          description: AssetPicList[i].description,
          worth: AssetPicList[i].worth,
          token_sym: token.symbol,
          payback_rate: AssetPicList[i].payback_rate,
          state: 'approved',
          createdAt: Date(),
        });
        await pic_new.save();
        //console.log('create picture', pic_new);
      }
    }
    console.log('[End]Import const picture data to database');
    
    /*update hot index and star level*/
    const picsOnDb = await getPictureListFromDb();
    console.log('Update picture hot and star data on database');
    for(var i=0;i<picsOnDb.length;i++){
      picsOnDb[i].hot_index = picsOnDb[i].payed_counter*10;
      picsOnDb[i].star_level = picsOnDb[i].payed_counter/2;
      await picsOnDb[i].save();
    }
    
  } catch (err) {
    console.log('pictureDbInit err=', err);
  }
}

async function newsflashDbInit(){
  try {
    var found = 0;
    var found_docs = [];
    
    Newsflash.find().exec(function(err, docs){
      if(docs && docs.length>0){
        console.log('Found', docs.length, ' newsflash docs');
        found_docs = docs;
      }
      found = 1;
    });
    
    /*wait found result*/
    var wait_counter = 0;
    while(!found){
      await sleep(1);
      wait_counter++;
      if(wait_counter > 15000){
        break;
      }
    }
    console.log('newsflashDbInit wait_counter=' + wait_counter);
    
    if(found_docs && found_docs.length>0){
      for (var doc of found_docs) {
        if(doc.hot_index == 0){
          doc.hot_index = doc.like_counter*(1*doc.news_weights) + doc.forward_counter*(1*doc.news_weights) + doc.comment_counter*(3*doc.news_weights);
          if(doc.hot_index > 0){
            await doc.save();
            console.log('newsflashDbInit asset_did=', doc.asset_did, 'hot_index update to', doc.hot_index);
          }
        }
      }
    }
  } catch (err) {
    console.log('newsflashDbInit err=', err);
  }
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
    
    /*chaindata db init*/
    await datachainDbInit();
    
    /*picture db init*/
    await pictureDbInit();
    
    /*newsflash db init*/
    await newsflashDbInit();
    
    mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();