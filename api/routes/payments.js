/* eslint-disable no-console */
const ForgeSDK = require('@arcblock/forge-sdk');
const { toAddress } = require('@arcblock/did');
const { wallet } = require('../libs/auth');
const { 
  fetchForgeTransactions
} = require('../libs/transactions');

module.exports = {
  init(app) {
    app.get('/api/payments', async (req, res) => {
      try {
        if(req.query && req.user){
          console.log('api.payments params=', req.query);
          const dapp_module = req.query.module;
          const asset_did = req.query.asset_did;
          const user_did = req.user.did;
          
          const tx = await fetchForgeTransactions(dapp_module, user_did, asset_did);
          if(tx && tx.length > 0){
            //console.log('api.payments.ok - tx', tx);
            console.log('api.payments.ok - tx.length', tx.length);
            res.json(tx);
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
