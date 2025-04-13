// backend/models/Parameter.js
const mongoose = require('mongoose');

const parameterSchema = new mongoose.Schema({
  parameter: { type: Number, default: 100 },
});

const Parameter = mongoose.model('Parameter', parameterSchema);
module.exports = Parameter;