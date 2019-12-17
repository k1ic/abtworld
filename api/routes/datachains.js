/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const multiparty = require('multiparty');
const ForgeSDK = require('@arcblock/forge-sdk');

const { Datachain } = require('../models');
const env = require('../libs/env');

const isProduction = process.env.NODE_ENV === 'production';
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

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

module.exports = {
  init(app) {
    /*Get datachains API command list*/
    app.get('/api/datachainsget', async (req, res) => {
      try {
        var params = req.query;
        if(params){
          console.log('api.datachainsget params=', params);
          const chain_name = req.query.name;
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
};
