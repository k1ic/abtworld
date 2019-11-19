/* eslint-disable no-console */
const mongoose = require('mongoose');
const { Newsflash } = require('../models');
const multiparty = require('multiparty');
const { 
  fetchForgeTransactions,
  getAssetPayDataFromTx
} = require('../libs/transactions');

const isProduction = process.env.NODE_ENV === 'production';
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

async function NewsflashAdd(fields){
  /*fields verify*/
  if(!fields
    || typeof(fields.user) == "undefined"
    || typeof(fields.asset_did) == "undefined"
    || typeof(fields.news_type) == "undefined"
    || typeof(fields.news_content) == "undefined"){
    console.log('NewsflashAdd invalid fields');
    return false;
  }
  
  var doc = await Newsflash.findOne({ content_did: fields.asset_did[0] });
  if(doc){
    if(doc.state != 'commit'){
      console.log('NewsflashAdd asset_did=', fields.asset_did[0], 'already on chain');
      
      /*ignore dup news*/
      return false;
    }else{
      console.log('NewsflashAdd asset_did=', fields.asset_did[0], 'already in db');
      
      /*asset already in db, do nothing*/
      return true;
    }
  }
  
  /*save newsflash to db when not exist*/
  const user = JSON.parse(fields.user[0]);
  var new_doc = new Newsflash({
    asset_did: fields.asset_did[0],
    content_did: fields.asset_did[0],
    author_did: user.did,
    author_name: user.name,
	author_avatar: user.avatar_small,
    news_hash: '',
    news_type: fields.news_type[0],
    news_content: fields.news_content[0],
    hash_href: '',
    minner_balance: '0',
    state: 'commit',
    minner_state: 'idle',
    givelike_counter: '0',
    forward_counter: '0',
    reply_list: [],
    createdAt: Date(),
  });
  await new_doc.save();
  console.log('NewsflashAdd saved to db');
  
  return true;;
}

async function cleanUserDeadNews(strAuthorDid){
  var new_docs = [];
  var found = 0;
  
  Newsflash.find().byAuthorDidAndState(strAuthorDid, 'commit').exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('cleanUserDeadNews Found', docs.length, 'docs');
      new_docs = docs;
    }else{
      console.log('cleanUserDeadNews doc not found!');
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
  
  console.log('cleanUserDeadNews wait counter', wait_counter);
  
  if(new_docs.length > 0){
    for(var i=0;i<new_docs.length;i++){
      console.log('cleanUserDeadNews clean doc asset_did', new_docs[i].asset_did);
      await new_docs[i].remove();
    }
  }
  
  return;
}

async function getNewsForUploadToChain(strAssetDid){
  var doc = await Newsflash.findOne({ asset_did: strAssetDid });
  return doc;
}

async function getNewsForShow(strType){
  var new_docs = [];
  var found = 0;
  
  Newsflash.find().byNewsType(strType).exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, 'asset_did docs');
      new_docs = docs;
    }else{
      console.log('getNewsForShow document not found!');
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
  
  console.log('getNewsForShow wait counter', wait_counter);
  //console.log(new_docs);
  
  return new_docs;
}

async function NewsflashStateManager(action, asset_did){
  var result = false;  
  var doc = await Newsflash.findOne({ asset_did: asset_did });
  
  if(doc){
    switch(action){
      case 'chain':
        doc.state = 'chained';
        await doc.save();
        break;
      case 'block':
        doc.state = 'blocked';
        await doc.save();
        break;
      case 'delete':
        await doc.remove();
        break;
      default:
        result = false;
        break;
    }
  }else{
    result = false;
  }
  
  return result;
}

async function NewsflashGetMinnerBalance(asset_did) {
  var doc = await Newsflash.findOne({ asset_did: asset_did });
  var balance = '0';
  
  if(doc) {
    balance = doc.minner_balance;
  }
  
  return balance;
}

async function NewsflashUpdateMinnerBalance(asset_did, minner_value){
  var result = false;  
  var doc = await Newsflash.findOne({ asset_did: asset_did });
  
  if(doc){
    var balance_remain = 0;
    if(parseInt(doc.minner_balance) > parseInt(minner_value)){
      balance_remain = parseInt(doc.minner_balance) - parseInt(minner_value);
      doc.minner_balance = String(balance_remain);
    }else{
      doc.minner_balance = '0';
    }
    await doc.save()
    result = true;
  }
  else{
    result = false;
  }
  
  return result;
}

module.exports = {
  init(app) {
    /*Get newsflash API command list*/
    app.get('/api/newsflashget', async (req, res) => {
      try {
        var params = req.query;
        if(params){
          console.log('api.newsflashget params=', params);
          const dapp_module = req.query.module;
          const news_type = req.query.news_type;
          const news = await getNewsForShow(news_type);
          if(news && news.length > 0){
            console.log('api.newsflashget.ok - news.length', news.length);
            res.json(news);
            return;
          }
        }
        res.json(null);
      } catch (err) {
        console.error('api.newsflashget.error', err);
        res.json(null);
      }
    });
    /*end of /api/newsflashget get*/
    
    app.post('/api/newsflashset', async (req, res) => {
      try {
        var form = new multiparty.Form();
        form.maxFieldsSize = 10485760;
      
        //console.log('api.newsflashset req', req);
        //console.log('api.newsflashset req.body=', req.body);

        form.parse(req, async function (err, fields, files) {
          if(err){
            console.log('api.newsflashset err=', err);
            res.statusCode = 404;
            res.write('newsflash set error');
            res.end();
            return ;
          }
          
          if( isProduction && (
            typeof(fields.user) == "undefined" 
            || typeof(fields.cmd) == "undefined"
            || fields.user[0] == "undefined")){
            console.log('api.newsflashset invalid filed');
            res.statusCode = 404;
            res.write('newsflash set error');
            res.end();
            return ;
          }
          
          if(typeof(fields.cmd) != "undefined" && fields.cmd[0] != "undefined"){
            var result = false;
            
            const cmd = fields.cmd[0];
            console.log('api.newsflashset cmd=', cmd);
            
            switch (cmd) {
              case 'add':
                result = await NewsflashAdd(fields);
                break;
              default:
                break;
            }
            
            if(result){
              console.log('api.newsflashset ok');
              
              res.statusCode = 200;
              res.write('newsflash set success');
              res.end();
              return;
            }
          }
          
          console.log('api.newsflashset error');
          res.statusCode = 404;
          res.write('newsflash set error');
          res.end();
        });
      } catch (err) {
        console.error('api.newsflashset.error', err);
        res.statusCode = 404;
        res.write('newsflash set error');
        res.end();
        return ;
      }
    });
    /*end of /api/newsflashset post*/
  },
  
  getNewsForUploadToChain,
  cleanUserDeadNews,
};
