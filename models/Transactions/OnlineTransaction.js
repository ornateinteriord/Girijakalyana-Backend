const mongoose = require ("mongoose")

const transactionShema = new mongoose.Schema({
transaction_id: {type: Number},
date: {type: Date},
registration_no: { type: String },
PG_id: { type: String},
bank_ref_num: { type: String},
mode: { type: String},
amount: { type: Number},
status: { type: String},
orderno: { type: String},
  usertype: { type: String}
},
  { timestamps: true, collection: "transaction_tbl" }
)

const TransactionModel = mongoose.model(
  "transaction_tbl",
  transactionShema
);
module.exports = TransactionModel;