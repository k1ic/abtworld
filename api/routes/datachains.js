/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const multiparty = require('multiparty');
const ForgeSDK = require('@arcblock/forge-sdk');
const { fromJSON } = require('@arcblock/forge-wallet');
const { wallet, newsflashWallet } = require('../libs/auth');

const { Datachain } = require('../models');
const env = require('../libs/env');

const appWallet = fromJSON(wallet);
const newsflashAppWallet = fromJSON(newsflashWallet);

const isProduction = process.env.NODE_ENV === 'production';
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

async function declareAccount(objWallet, strMoniker, connId){
  var res = null;
  res = await ForgeSDK.sendDeclareTx({
      tx: {
        itx: {
          moniker: strMoniker,
         },
      },
      wallet: objWallet,
    },
    { conn: connId }
  );
  
  return res;
}

async function AddDatachainNode(fields){
  /*fields verify*/
  if(!fields
    || typeof(fields.chain_name) == "undefined"
    || typeof(fields.chain_host) == "undefined"
    || typeof(fields.chain_id) == "undefined"){
    console.log('AddDatachainNode invalid fields');
    return false;
  }
  
  /*verify input chais parameter*/
  const chain_name = fields.chain_name[0];
  const chain_host = fields.chain_host[0];
  const chain_id = fields.chain_id[0];
  var doc = null;
  doc = await Datachain.findOne({ name: chain_name });
  if(doc){
    console.log('AddDatachainNode chain name '+chain_name+' already exist');
    return false;
  }
  doc = await Datachain.findOne({ chain_host: chain_host });
  if(doc){
    console.log('AddDatachainNode chain host '+chain_host+' already exist');
    return false;
  }
  doc = await Datachain.findOne({ chain_id: chain_id });
  if(doc){
    console.log('AddDatachainNode chain id '+chain_id+' already exist');
    return false;
  }
  
  /*verify the chain data and declare the account*/
  ForgeSDK.connect(chain_host, {
    chainId: chain_id,
    name: chain_id
  });
  console.log(`connected to ${chain_name} chain host:${chain_host} id: ${chain_id}`);
  
  try {
    res = await getAccoutState(wallet.address, chain_id);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await declareAccount(appWallet, 'abtworld', chain_id);
    }
    res = await getAccoutState(newsflashWallet.address, chain_id);
    if(!res || !res.getAccountState || !res.getAccountState.state){
      res = await declareAccount(newsflashAppWallet, 'hashnews', chain_id);
    }
  } catch (err) {
    console.error('AddDatachainNode chain err', err);
    return false;
  }
  
  /*save chain data to db*/
  var new_doc = new Datachain({
    name: chain_name,
    chain_host: chain_host,
    chain_id: chain_id,
    createdAt: Date(),
  });
  await new_doc.save();
  console.log('AddDatachainNode added new chain node to db');
  
  return true;;
}

async function getDatachainItem(data_chain_name){
  let found_docs = [];
  var doc = null;
  
  if(data_chain_name === 'default'){
    doc = await Datachain.findOne({ chain_host: env.assetChainHost });
  }else{
    doc = await Datachain.findOne({ name: data_chain_name });
  }
  if(doc){
    found_docs.push(doc);
  }
  
  return found_docs;
}

async function getDatachainList(){
  let found = 0;
  let found_docs = [];
    
  Datachain.find().exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, ' datachain docs');
      found_docs = docs;
    }
    found = 1;
  });
    
  /*wait found result*/
  let wait_counter = 0;
  while(!found){
    await sleep(1);
    wait_counter++;
    if(wait_counter > 15000){
      break;
    }
  }
  console.log('getDatachainList wait_counter=' + wait_counter);
  
  return found_docs;
}

async function forgeChainConnect(connId){
  var doc = await Datachain.findOne({ chain_id: connId });
  if(doc){
    ForgeSDK.connect(doc.chain_host, {
      chainId: doc.chain_id,
      name: doc.chain_id
    });
    console.log(`connected to ${doc.name} chain host:${doc.chain_host} id: ${doc.chain_id}`);
  }else{
    console.log('forgeChainConnect invalid connId', connId);
  }
}

module.exports = {
  init(app) {
    /*Get datachains API command list*/
    app.get('/api/datachainsget', async (req, res) => {
      try {
        var params = req.query;
        if(params){
          console.log('api.datachainsget params=', params);
          const data_chain_name = req.query.data_chain_name;
          if(typeof(data_chain_name) != "undefined"){
            var dataChainList = [];
            if(data_chain_name === 'all'){
              dataChainList = await getDatachainList();
            }else{
              dataChainList = await getDatachainItem(data_chain_name);
            }
            if(dataChainList.length > 0){
              res.json(dataChainList);
              return;
            }
          }
        }
        res.json(null);
      } catch (err) {
        console.error('api.datachainsget.error', err);
        res.json(null);
      }
    });
    /*end of /api/datachainsget get*/
    
    app.post('/api/datachainsset', async (req, res) => {
      try {
        var form = new multiparty.Form();
        form.maxFieldsSize = 10485760;
      
        //console.log('api.datachainsset req', req);
        //console.log('api.datachainsset req.body=', req.body);

        form.parse(req, async function (err, fields, files) {
          if(err){
            console.log('api.datachainsset err=', err);
            res.statusCode = 404;
            res.write('datachains set error');
            res.end();
            return ;
          }
          
          if(typeof(fields.cmd) != "undefined" && fields.cmd[0] != "undefined"){
            var result = false;
            var resValue = 'OK';
            
            const cmd = fields.cmd[0];
            console.log('api.datachainsset cmd=', cmd);
            
            /*cmd list
             *1. add: add chain node
             */
            switch (cmd) {
              case 'add':
                result = await AddDatachainNode(fields);
                break;
              default:
                break;
            }
            
            if(result){
              console.log('api.datachainsset ok');
              
              res.statusCode = 200;
              res.write(resValue);
              res.end();
              return;
            }
          }
          
          console.log('api.datachainsset error');
          res.statusCode = 404;
          res.write('datachains set error');
          res.end();
        });
      } catch (err) {
        console.error('api.datachainsset.error', err);
        res.statusCode = 404;
        res.write('datachains set error');
        res.end();
        return ;
      }
    });
    /*end of /api/datachainsset post*/
  },
  
  getDatachainList,
  forgeChainConnect,
  AddDatachainNode,
};