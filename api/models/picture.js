const mongoose = require('mongoose');

const PictureSchema = new mongoose.Schema({
  category: { type: String, required: true, default: 'human' },
  owner: { type: String, required: true, default: '' },
  contact: { type: String, required: true, default: '' },
  owner_did: { type: String, required: true, default: '' },
  blur_src: { type: String, required: true, default: '' },
  hd_src: { type: String, required: true, default: '' },
  asset_did: { type: String, required: true, default: '' },
  link: { type: String, required: true, default: '' },
  title: { type: String, required: true, default: '' },
  description: { type: String, default: '' },
  worth: { type: String, required: true, default: '18' },
  token_sym: { type: String, required: true, default: 'TBA' },
  payback_rate: { type: String, required: true, default: '0.6' },
  state: { type: String, required: true, default: 'commit' },
  createdAt: { type: Date },
  updatedAt: { type: Date },
});

PictureSchema.query.byAssetDid = function(strAssetDid){
  return this.find({asset_did: strAssetDid}).sort({"createdAt":-1});
}

PictureSchema.query.byState = function(strState){
  return this.find({state: strState}).sort({"createdAt":-1});;
}

const Picture = mongoose.model('picture', PictureSchema);

module.exports = Picture;
