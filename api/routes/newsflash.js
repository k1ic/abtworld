/* eslint-disable no-console */
const mongoose = require('mongoose');
const { Newsflash } = require('../models');
const multiparty = require('multiparty');
const { 
  forgeTxValueSecureConvert,
  fetchForgeTransactions,
  getAssetPayDataFromTx
} = require('../libs/transactions');

const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { fromTokenToUnit, fromUnitToToken } = require('@arcblock/forge-util');
const { fromAddress } = require('@arcblock/forge-wallet');
const { fromSecretKey, WalletType } = require('@arcblock/forge-wallet');
const { wallet, newsflashWallet, type } = require('../libs/auth');
const env = require('../libs/env');
const appWallet = fromSecretKey(process.env.APP_SK, type);
const newsflashAppWallet = fromSecretKey(process.env.APP_NEWSFLASH_SK, type);

const { getLocalTimeStr } = require('../libs/time');
const { getUserDidFragment } = require('../libs/user');

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
    state: 'commit',
    minner_state: 'idle',
    total_comment_minner_balance: 0,
    total_like_minner_balance: 0,
    total_forward_minner_balance: 0,
    each_comment_minner_balance: 0,
    each_like_minner_balance: 0,
    each_forward_minner_balance: 0,
    remain_comment_minner_balance: 0,
    remain_like_minner_balance: 0,
    remain_forward_minner_balance: 0,
    comment_counter: 0,
    like_counter: 0,
    forward_counter: 0,
    comment_list: [],
    like_list: [],
    forward_list: [],
    createdAt: Date(),
  });
  await new_doc.save();
  console.log('NewsflashAdd saved to db');
  
  return true;;
}

const newsflashDocLikeStatusGet = (doc, udid) => {
  var likeStatus = false;
  var like_list_item = null;
  
  if(doc && doc.like_list && doc.like_list.length > 0){
    like_list_item = doc.like_list.find( function(x){
      return x.udid === udid;
    });
    if(like_list_item){
      likeStatus = true;
    }
  }
  
  return likeStatus;
};

const newsflashDocCommentFind = (doc, comment) => {
  var comment_list_item = null;
  
  if(doc && doc.comment_list && doc.comment_list.length > 0){
    comment_list_item = doc.comment_list.find( function(x){
      return x.comment === comment;
    });
  }
  
  return comment_list_item;
}

const newsflashDocCommentMinableValueGet = (doc, udid, comment) => {
  var minValue = 0;
  var comment_list_item = null;
  
  if(!doc || !udid || !comment){
    return 0;
  }
  
  /*min pool is empty*/
  if(doc.remain_comment_minner_balance == 0){
     console.log('newsflashDocCommentMinableValueGet empty minner pool');
     return 0;
  }
  
  /*The comment is too short*/
  console.log('newsflashDocCommentMinableValueGet comment.length', comment.length);
  if(comment.length < 5){
    console.log('newsflashDocCommentMinableValueGet comment is too short');
    return 0;
  }
  
  /*Only min once each user*/
  if(doc.comment_list && doc.comment_list.length > 0){
    comment_list_item = doc.comment_list.find( function(x){
      return (x.udid === udid && x.mbalance > 0);
    });
    if(comment_list_item){
      console.log('newsflashDocCommentMinableValueGet udid=', udid, 'already minned');
      return 0;
    }
  }
  
  /*Get the minable value*/
  if(doc.remain_comment_minner_balance > doc.each_comment_minner_balance){
    minValue = doc.each_comment_minner_balance;
  }else{
    minValue = forgeTxValueSecureConvert(doc.remain_comment_minner_balance);
  }
  
  console.log('newsflashDocCommentMinableValueGet minValue=', minValue);
  
  return minValue;
}


async function payToMiner(udid, mbalance){
  const { state } = await ForgeSDK.getForgeState(
    {},
    { ignoreFields: ['state.protocols', /\.txConfig$/, /\.gas$/] }
  );
  var transferHash = null;
  
  try {
    transferHash = await ForgeSDK.sendTransferTx({
      tx: {
        itx: {
          to: udid,
          value: fromTokenToUnit(mbalance, state.token.decimal),
        },
      },
      wallet: newsflashAppWallet,
    });
    console.log('pay', mbalance, 'to minner', udid, transferHash);
  } catch (err) {
    transferHash = null;
    console.error('pay to miner err', err);
  }
  
  return transferHash;
}

async function NewsflashItemGiveLike(fields){
  var like_list_item = null;
  
  /*fields verify*/
  if(!fields
    || typeof(fields.user) == "undefined"
    || typeof(fields.asset_did) == "undefined"){
    console.log('NewsflashItemGiveLike invalid fields');
    return null;
  }
  
  const user = JSON.parse(fields.user[0]);
  var doc = await Newsflash.findOne({ asset_did: fields.asset_did[0] });
  if(doc){
    var likeStatus = newsflashDocLikeStatusGet(doc, user.did);
    if(likeStatus == false){
      //doc.minner_state = 'mining';
      //await doc.save();
      
      /*increate like counter*/
      doc.like_counter += 1;
      
      /*like miner*/
      var miner_value = 0;
      if(doc.remain_like_minner_balance > 0){
        if(doc.remain_like_minner_balance > doc.each_like_minner_balance){
          miner_value = doc.each_like_minner_balance;
          doc.remain_like_minner_balance -= doc.each_like_minner_balance;
          doc.remain_like_minner_balance = forgeTxValueSecureConvert(doc.remain_like_minner_balance);
        }else{
          miner_value = forgeTxValueSecureConvert(doc.remain_like_minner_balance);
          doc.remain_like_minner_balance = 0;
        }
      }
      
      if(miner_value > 0){
        /* pay to miner */
        var transferHash = await payToMiner(user.did, miner_value);
        if(!transferHash){
          miner_value = 0;
        }
      }else{
        console.log('NewsflashItemGiveLike empty minner pool');
      }
      
      /*Add new like item to like list*/
      like_list_item = {
        udid: user.did,
        mbalance: miner_value
      };
      doc.like_list.push(like_list_item);
      doc.markModified('like_list');
      
      /*update doc*/
      //doc.minner_state = 'idle';
      await doc.save();
    }
  }
  
  return like_list_item;
}


async function NewsflashItemAddComment(fields){
  var comment_list_item = null;
  
  /*fields verify*/
  if(!fields
    || typeof(fields.user) == "undefined"
    || typeof(fields.asset_did) == "undefined"
    || typeof(fields.comment) == "undefined"){
    console.log('NewsflashItemAddComment invalid fields');
    return null;
  }
  
  const user = JSON.parse(fields.user[0]);
  const comment = fields.comment[0];
  var doc = await Newsflash.findOne({ asset_did: fields.asset_did[0] });
  
  if(doc){
    if(newsflashDocCommentFind(doc, comment)){
      console.log('NewsflashItemAddComment comment already in list');
      return null;
    }
    
    const uname_with_did = user.name+'('+getUserDidFragment(user.did)+')';
    comment_list_item = {
      uname: uname_with_did,
      udid: user.did,
      time: getLocalTimeStr(),
      comment: comment,
      mbalance: 0
    };
    
    const minValue = newsflashDocCommentMinableValueGet(doc, user.did, comment);
    comment_list_item.mbalance = minValue;
    
    //doc.minner_state = 'mining';
    //await doc.save();
    if(minValue > 0){
      /* pay to miner */
      var transferHash = await payToMiner(user.did, minValue);
      if(!transferHash){
        minValue = 0;
        comment_list_item.mbalance = 0;
      }
      
      /*update min remains*/
      if(minValue > 0){
        if(doc.remain_comment_minner_balance > minValue){
          doc.remain_comment_minner_balance -= minValue;
          doc.remain_comment_minner_balance = forgeTxValueSecureConvert(doc.remain_comment_minner_balance);
        }else{
          doc.remain_comment_minner_balance = 0;
        }
      }
    }
    
    /*update doc*/
    //doc.minner_state = 'idle';
    doc.comment_counter += 1;
    doc.comment_list.push(comment_list_item);
    doc.markModified('comment_list');
    await doc.save();
    
    console.log('NewsflashItemAddComment comment add success');
  }
  
  return comment_list_item;
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
            var resValue = 'OK';
            
            const cmd = fields.cmd[0];
            console.log('api.newsflashset cmd=', cmd);
            
            /*cmd list
             *1. add:  add news to db
             *2. give_like: give like to newsflash
             *3. add_comment: add comment to newsflash
             *4. share: share newsflash
             */
            switch (cmd) {
              case 'add':
                result = await NewsflashAdd(fields);
                break;
              case 'give_like':
                result = await NewsflashItemGiveLike(fields);
                if(result){
                  resValue = String(result.mbalance);
                }
                break;
              case 'add_comment':
                result = await NewsflashItemAddComment(fields);
                if(result){
                  resValue = String(result.mbalance);
                }
                break;
              case 'share':
                break;
              default:
                break;
            }
            
            if(result){
              console.log('api.newsflashset ok');
              
              res.statusCode = 200;
              res.write(resValue);
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
  
  newsflashDocLikeStatusGet,
  getNewsForUploadToChain,
  cleanUserDeadNews,
};
