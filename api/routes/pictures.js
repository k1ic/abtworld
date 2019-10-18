/* eslint-disable no-console */
const mongoose = require('mongoose');
const { Picture } = require('../models');

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

async function getPicsForPreview(){
  var new_docs = [];
  var found = 0;
  await Picture.find().byState('approved').exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, 'approved docs');
      new_docs = docs.map(function( e ) {
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
    }else{
      console.log('Approved document not found!');
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
  
  console.log('getPicsForPreview wait counter', wait_counter);
  //console.log(new_docs);
  
  return new_docs;
}

async function getPicsForPayShow(strAssetDid){
  var new_docs = [];
  var found = 0;
  
  Picture.find().byAssetDid(strAssetDid).exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, 'asset_did docs');
      new_docs = docs;
    }else{
      console.log('asset_did document not found!');
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
  
  console.log('getPicsForPayShow wait counter', wait_counter);
  //console.log(new_docs);
  
  return new_docs;
}

async function getApprovedPics(){
  var new_docs = [];
  var found = 0;
  await Picture.find().byState('approved').exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, 'approved docs');
      new_docs = docs;
    }else{
      console.log('Approved document not found!');
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
  
  console.log('getApprovedPics wait counter', wait_counter);
  //console.log(new_docs);
  
  return new_docs;
}

async function getCommitedPics(){
  var new_docs = [];
  var found = 0;
  await Picture.find().byState('commited').exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, 'commited docs');
      new_docs = docs;
    }else{
      console.log('Commited document not found!');
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
  
  console.log('getCommitedPics wait counter', wait_counter);
  //console.log(new_docs);
  
  return new_docs;
}

async function getRejectedPics(){
  var new_docs = [];
  var found = 0;
  await Picture.find().byState('rejected').exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, 'rejected docs');
      new_docs = docs;
    }else{
      console.log('Rejected document not found!');
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
  
  console.log('getRejectedPics wait counter', wait_counter);
  //console.log(new_docs);
  
  return new_docs;
}

module.exports = {
  init(app) {
    /*Get pictures API command list*/
    /*1. GetPicsForPreview0xbe863c4b03acb996e27b0c88875ff7c5e2c3090f */
    /*2. GetPicsForPayShow0x012bbc9ebd79c1898c6fc19cefef6d2ad7a82f44 */
    /*3. GetPicsApproved0x503988fb7a78ce326b30a7d74f63c70d5574063c */
    /*4. GetPicsCommited0x4f2f39303fa1d585564cfe4aacd46ede824b3d61 */
    /*5. GetPicsRejected0x68d54c43e5f85dea0c783d94ddc5da4504642033 */
    app.get('/api/getpics', async (req, res) => {
      try {
        var params = req.query;
        if(params){
          console.log('api.getpics params=', params);
          var cmd = params.cmd;
          if (typeof(cmd) != "undefined") {
            console.log('api.getpics cmd=', cmd);
            switch(cmd){
              case 'GetPicsForPreview0xbe863c4b03acb996e27b0c88875ff7c5e2c3090f':
                var pics = await getPicsForPreview();
                if(pics && pics.length > 0){
                  res.json(pics);
                  return;
                }
                break;
              case 'GetPicsForPayShow0x012bbc9ebd79c1898c6fc19cefef6d2ad7a82f44':
                var asset_did = params.asset_did;
                if (typeof(asset_did) != "undefined") {
                  var pics = await getPicsForPayShow(asset_did);
                  if(pics && pics.length > 0){
                    res.json(pics);
                    return;
                  }
                }
                break;
              case 'GetPicsApproved0x503988fb7a78ce326b30a7d74f63c70d5574063c':
                var pics = await getApprovedPics();
                if(pics && pics.length > 0){
                  res.json(pics);
                  return;
                }
                break;
              case 'GetPicsCommited0x4f2f39303fa1d585564cfe4aacd46ede824b3d61':
                var pics = await getCommitedPics();
                if(pics && pics.length > 0){
                  res.json(pics);
                  return;
                }
                break;
              case 'GetPicsRejected0x68d54c43e5f85dea0c783d94ddc5da4504642033':
                var pics = await getRejectedPics();
                if(pics && pics.length > 0){
                  res.json(pics);
                  return;
                }
                break;
              default:
                console.log('api.getpics unknown cmd', cmd);
                break;
            }
          }
        }
        res.json(null);
      } catch (err) {
        console.error('api.getpics.error', err);
        res.json(null);
      }
    });
    
    /*Add pictures API command list*/
    app.get('/api/addpics', async (req, res) => {
      try {
        var params = req.query;
        if(params){
          console.log('api.addpics params=', params);
          var cmd = params.cmd;
          if (typeof(cmd) != "undefined") {
            console.log('api.addpics cmd=', cmd);
            switch(cmd){
              default:
                console.log('api.addpics unknown cmd', cmd);
                break;
            }
          }
        }
        res.json(null);
      } catch (err) {
        console.error('api.addpics.error', err);
        res.json(null);
      }
    });
    
    /*Delete pictures API command list*/
    app.get('/api/delpics', async (req, res) => {
      try {
        var params = req.query;
        if(params){
          console.log('api.delpics params=', params);
          var cmd = params.cmd;
          if (typeof(cmd) != "undefined") {
            console.log('api.delpics cmd=', cmd);
            switch(cmd){
              default:
                console.log('api.delpics unknown cmd', cmd);
                break;
            }
          }
        }
        res.json(null);
      } catch (err) {
        console.error('api.delpics.error', err);
        res.json(null);
      }
    });
    
    /*Update pictures API command list*/
    app.get('/api/updatepics', async (req, res) => {
      try {
        var params = req.query;
        if(params){
          console.log('api.updatepics params=', params);
          var cmd = params.cmd;
          if (typeof(cmd) != "undefined") {
            console.log('api.updatepics cmd=', cmd);
            switch(cmd){
              default:
                console.log('api.updatepics unknown cmd', cmd);
                break;
            }
          }
        }
        res.json(null);
      } catch (err) {
        console.error('api.updatepics.error', err);
        res.json(null);
      }
    });
  },
};
