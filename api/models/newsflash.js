const mongoose = require('mongoose');

/*
Array item definition

comment_list = [
  {
    uname: { type: String, default: '' },
    udid: { type: String, default: '' },
    time: { type: String, default: '' },
    comment: { type: String, default: '' },
    mbalance: { type: Number, default: 0 },
  },
];

like_list = [
  {
    udid: { type: String, default: '' },
    mbalance: { type: Number, default: 0 },
  },
];

forward_list = [
  {
    udid: { type: String, default: '' },
    mbalance: { type: Number, default: 0 },
  },
];
*/

const NewsflashSchema = new mongoose.Schema({
  asset_did: { type: String, default: '' },
  content_did: { type: String, required: true, default: '' },
  author_did: { type: String, required: true, default: '' },
  author_name: { type: String, required: true, default: '' },
  author_avatar: { type: String, default: '' },
  news_hash: { type: String, default: '' },
  news_time: { type: String, default: '' },
  news_type: { type: String, required: true, default: '' },
  news_content: { type: String, required: true, default: '' },
  news_weights: { type: Number, default: 1 },
  hash_href: { type: String, default: '' },
  state: { type: String, required: true, default: 'commit' },
  minner_state: { type: String, required: true, default: 'idle' },
  total_payed_balance: { type: Number, default: 0 },
  total_comment_minner_balance: { type: Number, default: 0 },
  total_like_minner_balance: { type: Number, default: 0 },
  total_forward_minner_balance: { type: Number, default: 0 },
  total_comment_minner_number: { type: Number, default: 10 },
  total_like_minner_number: { type: Number, default: 10 },
  total_forward_minner_number: { type: Number, default: 10 },
  each_comment_minner_balance: { type: Number, default: 0 },
  each_like_minner_balance: { type: Number, default: 0 },
  each_forward_minner_balance: { type: Number, default: 0 },
  remain_comment_minner_balance: { type: Number, default: 0 },
  remain_like_minner_balance: { type: Number, default: 0 },
  remain_forward_minner_balance: { type: Number, default: 0 },
  comment_counter: { type: Number, default: 0 },
  like_counter: { type: Number, default: 0 },
  forward_counter: { type: Number, default: 0 },
  hot_index: { type: Number, default: 0 },
  comment_list: { type: Array, default: [] },
  like_list: { type: Array, default: [] },
  forward_list: { type: Array, default: [] },
  createdAt: { type: Date },
  updatedAt: { type: Date },
});

NewsflashSchema.query.byAssetDid = function(strAssetDid){
  return this.find({asset_did: strAssetDid}).sort({"createdAt":-1});
}

NewsflashSchema.query.byState = function(strState){
  return this.find({state: strState}).sort({"createdAt":-1});
}

NewsflashSchema.query.byNewsType = function(strType){
  return this.find({news_type: strType}).sort({"createdAt":-1});
}

NewsflashSchema.query.hotByHotIndex = function(){
  var docs =  this.find({$and: [
    {state: "chained"},
    {hot_index: {$gt: 0}}
  ]}).sort({"hot_index":-1, "updatedAt":-1});
  
  return docs;
}

NewsflashSchema.query.hotByNewsWeigths = function(){
  var docs =  this.find({$and: [
    {state: "chained"},
    {news_weights: {$gt: 1}}
  ]}).sort({"news_weights":-1, "updatedAt":-1});
  
  return docs;
}

NewsflashSchema.query.hotTotalPayed = function(){
  var docs =  this.find({$and: [
    {state: "chained"},
    {total_payed_balance: {$gt: 0}}
  ]}).sort({"total_payed_balance":-1, "updatedAt":-1});
  
  return docs;
}

NewsflashSchema.query.hotByHotIndexAndAuthorDid = function(strAutherDid){
  var docs =  this.find({$and: [
    {state: "chained"},
    {hot_index: {$gt: 0}},
    {author_did: strAutherDid}
  ]}).sort({"hot_index":-1, "updatedAt":-1});
  
  return docs;
}

NewsflashSchema.query.byNewsTypeAndState = function(strType, strState){
  return this.find({$and: [
    {news_type: strType},
    {state: strState}
  ]}).sort({"createdAt":-1});
}

NewsflashSchema.query.byNewsTypeAuthorDidAndState = function(strType, strAutherDid, strState){
  return this.find({$and: [
    {news_type: strType},
    {author_did: strAutherDid},
    {state: strState}
  ]}).sort({"createdAt":-1});
}

NewsflashSchema.query.byAuthorDidAndState = function(strAutherDid, strState){
  return this.find({$and: [
    {author_did: strAutherDid},
    {state: strState}
  ]}).sort({"createdAt":-1});
}

const Newsflash = mongoose.model('newsflash', NewsflashSchema);

module.exports = Newsflash;
