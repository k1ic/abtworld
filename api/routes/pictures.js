/* eslint-disable no-console */
const mongoose = require('mongoose');
const { Picture } = require('../models');
const multiparty = require('multiparty');
const { 
  ImageFileRemove
} = require('../libs/image');

const isProduction = process.env.NODE_ENV === 'production';
const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

async function getPicsByFilter(params){
  var new_docs = [];
  var found = 0;
  
  console.log('getPicsByFilter params=', params);
  
  Picture.find().byMultiState(params.state, params.sortField, params.sortOrder).exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, params.state, 'docs');
      new_docs = docs;
    }else{
      console.log('Multi state document not found!');
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
  
  console.log('getPicsByFilter wait counter', wait_counter);
  
  //console.log(new_docs);
  
  return new_docs;
}

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
  //console.log(temp_docs);
  
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

async function getPicsNum(strState){
  var new_docs = [];
  var found = 0;
  await Picture.find().byState(strState).exec(function(err, docs){
    if(docs && docs.length>0){
      console.log('Found', docs.length, strState, 'docs');
      new_docs = docs;
    }else{
      console.log(strState, 'document not found!');
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
  
  console.log('getPicsNum wait counter', wait_counter);
  //console.log(new_docs);
  
  return new_docs.length;
}

async function picsStateManager(action, asset_did){
  var result = false;  
  var picture = await Picture.findOne({ asset_did: asset_did });
  
  if(picture){
    switch(action){
      case 'approve':
        picture.state = 'approved';
        await picture.save();
        break;
      case 'reject':
        picture.state = 'rejected';
        await picture.save();
        break;
      case 'delete':
        const hd_file = __dirname+'/../../'+'src'+picture.hd_src;
        const thumb_file = __dirname+'/../../'+'src'+picture.blur_src;
        console.log('picsStateManager hd_file=', hd_file);
        console.log('picsStateManager thumb_file=', thumb_file);
        await ImageFileRemove(hd_file);
        await ImageFileRemove(thumb_file);
        await picture.remove();
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
    /*Get pictures API command list*/
    /*1. GetPicsByFilter0xf22df2d8963e43920e3bfe129fff4fc21d486a86 */
    /*2. GetPicsForPreview0xbe863c4b03acb996e27b0c88875ff7c5e2c3090f */
    /*3. GetPicsForPayShow0x012bbc9ebd79c1898c6fc19cefef6d2ad7a82f44 */
    /*4. GetPicsApproved0x503988fb7a78ce326b30a7d74f63c70d5574063c */
    /*5. GetPicsCommited0x4f2f39303fa1d585564cfe4aacd46ede824b3d61 */
    /*6. GetPicsRejected0x68d54c43e5f85dea0c783d94ddc5da4504642033 */
    /*7. GetPicsNum0xcc42640466e848f263ffb669f13256dd2ad08f97 */
    app.get('/api/getpics', async (req, res) => {
      try {
        var params = req.query;
        if(params){
          console.log('api.getpics params=', params);
          var cmd = params.cmd;
          if (typeof(cmd) != "undefined") {
            console.log('api.getpics cmd=', cmd);
            switch(cmd){
              case 'GetPicsByFilter0xf22df2d8963e43920e3bfe129fff4fc21d486a86':
                var pics = await getPicsByFilter(params);
                if(pics && pics.length > 0){
                  console.log('GetPicsByFilter found total', pics.length, 'pics');
                  var new_pics = [];
                  /*Get the range of the document*/
                  if (typeof(params.results) != "undefined" && typeof(params.page) != "undefined") {
                    const iStart = (parseInt(params.page)-1)*parseInt(params.results);
                    const iEnd = iStart+parseInt(params.results);
                    console.log('GetPicsByFilter iStart=', iStart,'iEnd=', iEnd);
                    new_pics = pics.slice(iStart, iEnd);
                  }else{
                    new_pics = pics;
                  }
                  
                  console.log('GetPicsByFilter return total', new_pics.length, 'pics');
                  
                  var picsObj = {};
                  picsObj['totalCount'] = pics.length;
                  picsObj['results'] = new_pics;
                  res.json(picsObj);
                  return;
                }else{
                  console.log('GetPicsByFilter not found pics');
                  var picsObj = {};
                  picsObj['totalCount'] = 0;
                  picsObj['results'] = [];
                  res.json(picsObj);
                  return;
                }
                break;
              case 'GetPicsForPreview0xbe863c4b03acb996e27b0c88875ff7c5e2c3090f':
                var iOffset = params.offset;
                var iNumber = params.number;
                if (typeof(iOffset) == "undefined") {
                  iOffset = '0';
                }
                if (typeof(iNumber) == "undefined") {
                  iNumber = '20';
                }
                
                var pics = await getPicsForPreview();
                if(pics && pics.length > 0){
                  var new_pics = [];
                  const iStart = parseInt(iOffset);
                  const iEnd = iStart+parseInt(iNumber);
                  console.log('GetPicsForPreview iStart=', iStart,'iEnd=', iEnd);
                  new_pics = pics.slice(iStart, iEnd);
                  res.json(new_pics);
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
              case 'GetPicsNum0xcc42640466e848f263ffb669f13256dd2ad08f97':
                var strState = params.state;
                if (typeof(strState) != "undefined") {
                  var picNum = await getPicsNum(strState);
                  res.json(picNum);
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
    
    app.post('/api/managepics', async (req, res) => {
      try {
        var form = new multiparty.Form();
        form.maxFieldsSize = 10485760;
      
        //console.log('api.managepics req', req);
        //console.log('api.managepics req.body=', req.body);

        form.parse(req, async function (err, fields, files) {
          if(err){
            console.log('api.managepics err=', err);
            res.statusCode = 404;
            res.write('manage pics error');
            res.end();
            return ;
          }
          
          if( isProduction && (
            typeof(fields.user) == "undefined" 
            || typeof(fields.action) == "undefined" 
            || typeof(fields.asset_did) == "undefined"
            || fields.user[0] == "undefined")){
            res.statusCode = 404;
            res.write('manage pics error');
            res.end();
            return ;
          }
          
          if(typeof(fields.action) != "undefined" && fields.action[0] != "undefined"){
            /*json to object*/
            const action = fields.action[0];
            const asset_did = fields.asset_did[0]; 
            
            console.log('api.managepics action=', action);
            console.log('api.managepics asset_did=', asset_did);
            await picsStateManager(action, asset_did);
            
            res.statusCode = 200;
            res.write('manage pics success');
            res.end();
          }else{
            console.log('api.managepics invalid action');
            res.statusCode = 404;
            res.write('manage pics error');
            res.end();
          }
        });
      } catch (err) {
        console.error('api.managepics.error', err);
        res.statusCode = 404;
        res.write('manage pics error');
        res.end();
        return ;
      }
    });
    /*end of /api/managepics post*/
    
  },
};
