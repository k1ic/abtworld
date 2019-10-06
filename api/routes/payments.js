/* eslint-disable no-console */
const ForgeSDK = require('@arcblock/forge-sdk');
const { toAddress } = require('@arcblock/did');
const { wallet } = require('../libs/auth');

module.exports = {
  init(app) {
    app.get('/api/payments', async (req, res) => {
      try {
        if (req.user) {
         // const { transactions } = await ForgeSDK.listTransactions({
         //   addressFilter: { sender: toAddress(req.user.did), receiver: wallet.address },
         //   typeFilter: { types: ['transfer'] },
         // });
 
         const transactions = await ForgeSDK.doRawQuery(`{
           listTransactions(addressFilter: {direction: ONE_WAY, sender: "${toAddress(req.user.did)}", receiver: "${wallet.address}"}, typeFilter: {types: "transfer"}, paging: {size: 10000}, timeFilter: {startDateTime: "2019-09-24 00:00:00"}) {
             transactions {
               tx {
                 itx {
                   ... on TransferTx {
                     value
                     data {
                       value
                     }
                   }
                 }
               }
             }
           }   
         }`);
             
         //console.log('transactions', transactions.listTransactions.transactions);

         const tx = transactions.listTransactions.transactions;
         //console.log('tx value', tx);
         //console.log('tx array number', tx.length);
         
         if (tx && tx.length >= 1) {
           //console.log('api.payments.ok - tx', tx);
           console.log('api.payments.ok - tx.length', tx.length);
           res.json(tx);
           return;
         }

         // const tx = (transactions || []).filter(x => x.code === 'OK').shift();
         // if (tx && tx.hash) {
         //   console.log('api.payments.ok', tx);
         //   res.json(tx);
         //   return;
         // }

        }

        res.json(null);
      } catch (err) {
        console.error('api.payments.error', err);
        res.json(null);
      }
    });
  },
};
