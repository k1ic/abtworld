const mongoose = require('mongoose');

const NewsflashSchema = new mongoose.Schema({
  asset_did: { type: String, required: true, default: '' },
  author_did: { type: String, required: true, default: '' },
  author_name: { type: String, required: true, default: '' },
  news_hash: { type: String, default: '' },
  news_type: { type: String, required: true, default: '' },
  news_content: { type: String, required: true, default: '' },
  hash_href: { type: String, default: '' },
  minner_balance: { type: String, required: true, default: '0' },
  state: { type: String, required: true, default: 'commit' },
  givelike_counter: { type: String, required: true, default: '0' },
  forward_counter: { type: String, required: true, default: '0' },
  reply_list: { type: Array, default: [] },
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

NewsflashSchema.query.byAuthorDidAndState = function(strAutherDid, strState){
  return this.find({$and: [
    {author_did: strAutherDid},
    {state: strState}
  ]}).sort({"createdAt":-1});
}

const Newsflash = mongoose.model('newsflash', NewsflashSchema);

module.exports = Newsflash;
