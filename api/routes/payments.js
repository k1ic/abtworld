/* eslint-disable no-console */
const moment = require('moment');
const ForgeSDK = require('@arcblock/forge-sdk');
const { toAddress } = require('@arcblock/did');
const { wallet } = require('../libs/auth');
const { 
  fetchForgeTransactions
} = require('../libs/transactions');
const env = require('../libs/env');

module.exports = {
  init(app) {
    app.get('/api/payments', async (req, res) => {
      try {
        if(req.query){
          console.log('api.payments params=', req.query);
          const dapp_module = req.query.module;
          var module_para = null;
          
          switch(dapp_module){
            case 'picture':
              if(req.user){
                module_para = {user_did: req.user.did, asset_did: req.query.asset_did};
              }
              break;
            case 'newsflash':
              module_para = {news_type: req.query.news_type};
              break;
            default:
              break;
          }
          
          const tx = await fetchForgeTransactions(dapp_module, module_para);
          if(tx && tx.length > 0){
            //console.log('api.payments.ok - tx', tx);
            console.log('api.payments.ok - tx.length', tx.length);
            var new_tx = [];
            switch(dapp_module){
              case 'picture':
                new_tx = tx;
                break;
              case 'newsflash':
                new_tx = tx.map(function( e ) {
                  var temp_tx = {};
                  var memo = null;
                  try {
                    memo = JSON.parse(e.tx.itxJson.data.value);
                  } catch (err) {
                  }
                  var local_time = moment(e.time).local().format('YY/MM/DD HH:mm:ss');
                  //console.log('UTC=',e.time, 'local time=', local);
                  temp_tx['time'] = local_time;
                  temp_tx['sender'] = e.sender;
                  temp_tx['hash'] = e.hash;
                  temp_tx['href'] = env.chainHost.replace('/api', '/node/explorer/txs/')+e.hash;
                  if(memo){
                    temp_tx['content'] = (typeof(memo.para.content) != "undefined")?memo.para.content:'';
                    temp_tx['uname'] = (typeof(memo.para.uname) != "undefined")?memo.para.uname:'匿名';;
                  }else{
                    temp_tx['content'] = '';
                    temp_tx['uname'] = '匿名';
                  }
                  temp_tx['title'] = temp_tx['uname'] + "@" + temp_tx['time'];
                  return temp_tx;
                });
                break;
              default:
                new_tx = tx;
                break;
            }
            
            //console.log('api.payments.ok - new_tx', new_tx);
            console.log('api.payments.ok - new_tx.length', new_tx.length);
            res.json(new_tx);
            return;
          }
        }
        
        console.log('api.payments.ok - empty tx');
        res.json(null);
      } catch (err) {
        console.error('api.payments.error', err);
        res.json(null);
      }
    });
  },
};
