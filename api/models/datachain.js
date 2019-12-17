const mongoose = require('mongoose');

const DatachainSchema = new mongoose.Schema({
  name: { type: String, required: true, default: '' },
  chain_host: { type: String, required: true, default: '' },
  chain_id: { type: String, required: true, default: '' },
  createdAt: { type: Date },
  updatedAt: { type: Date },
});

const Datachain = mongoose.model('datachain', DatachainSchema);

module.exports = Datachain;
