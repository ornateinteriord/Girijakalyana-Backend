const mongoose = require("mongoose");

const PromoterDetailsSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  date: {
    type: String,
  },
  promoter_name: {
    type: String,
  },
  promoter_type: {
    type: String,
  },
  promocode: {
    type: String,
  },
  emailid: {
    type: String,
  },
  mobile: {
    type: String,
  },
  address: {
    type: String,
  },
  state: {
    type: String,
  },
  account_no: {
    type: String,
  },
  account_type: {
    type: String,
  },
  ifsc: {
    type: String,
  },
  loginname: {
    type: String,
  },
  password: {
    type: String,
  },
  status: {
    type: String,
    default: "active",
  },
  KEY: {
    type: String,
  },
},{ timestamps: true, collection: "promoter_tbl" });

const PromotersModel = mongoose.model("promoter_tbl", PromoterDetailsSchema);
module.exports = PromotersModel;
