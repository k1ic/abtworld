require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../api/libs/env');
const { Picture } = require('../api/models');
const AssetPicList = require('../src/libs/asset_pic');

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

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
    
    console.log('MongoDB collection Picture obj=', Picture);
    console.log('[Start]Import const picture data to database');
    
    /*Import const picture data to database*/
    for(var i=0;i<AssetPicList.length;i++){
      var picture = await Picture.findOne({ asset_did: AssetPicList[i].asset_did });
      if (picture) {
        picture.updatedAt = Date();
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
          token_sym: AssetPicList[i].token_sym,
          payback_rate: AssetPicList[i].payback_rate,
          state: 'approved',
          createdAt: Date(),
      });
      await pic_new.save();
      //console.log('create picture', pic_new);
      }
    }
    console.log('[End]Import const picture data to database');
    
    /*Delete document test*/
    //Picture.remove({asset_did: '7903c55df26dd063a45bc7639482bd7a860d6f6a'}).exec();
    
    /*MongoDB document query*/
    Picture.find().byAssetDid('1f9e74713d20d04d48860685345952fde2e637c5').exec(function(err, docs){
       if(docs && docs.length>0){
         console.log('Found', docs.length, 'asset_did docs');
         console.log(docs);
       }else{
         console.log('asset_did document not found!');
       }
    })
    Picture.find().byState('approved').exec(function(err, docs){
       if(docs && docs.length>0){
         console.log('Found', docs.length, 'approved docs');
         var new_docs = docs.map(function( e ) {
            var doc = {};
            doc['category'] = e.category;
            doc['owner'] = e.owner;
            doc['blur_src'] = e.blur_src;
            doc['link'] = e.link;
            doc['title'] = e.title;
            doc['description'] = e.description;
            doc['worth'] = e.worth;
            doc['token_sym'] = e.token_sym;
            return doc;
         });
         console.log(new_docs);
       }else{
         console.log('Approved document not found!');
       }
       
       mongoose.disconnect();
       process.exit(0);
    })
    
    //mongoose.disconnect();
    //process.exit(0);
  } catch (err) {
    console.error(err);
    console.error(err.errors);
    process.exit(1);
  }
})();