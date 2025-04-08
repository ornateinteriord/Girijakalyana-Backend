const mongoose = require("mongoose");

const PromoterEarningsSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  date: {
    type: String,
  },
  referal_by: {
    type: String,
  },
  ref_no: {
    type: String,
  },
  emailid: {
    type: String,
  },
  mobile: {
    type: String,
  },
  amount_earned: {
    type: String,
  },
  transaction_no: {
    type: String,
  },
  transaction_date: {
    type: String,
  },
  status: {
    type: String,
    default: "paid",
  },
  usertype: {
    type: String,
  },
},{ timestamps: true, collection: "promoters_earnings_tbl" });

const PromotersEarningsModel = mongoose.model(
  "promoters_earnings_tbl",
  PromoterEarningsSchema
);
module.exports = PromotersEarningsModel;
