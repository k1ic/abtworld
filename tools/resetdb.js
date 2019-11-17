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
    
	var found = 0;
	var found_docs = [];
    Picture.find().exec(function(err, docs){
	  if(docs && docs.length>0){
	    console.log('Found', docs.length, 'docs');
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
	
	/*reset dbs*/
	console.log('Reset ' + found_docs.length + ' docs');
	for(var i=0;i<found_docs.length;i++){
	  var doc = found_docs[i];
	  //doc.payed_counter = 0;
	  //doc.payed_balance = 0;
	  //console.log(doc);
	  await doc.save();
	}
	
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
            doc['payed_counter'] = e.payed_counter;
			doc['payed_balance'] = e.payed_balance;
            doc['payer_list'] = e.payer_list;
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