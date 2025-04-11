const mongoose = require("mongoose");

const AssistanceTransactionSchema = new mongoose.Schema(
  {
    transaction_id: String,
    date: String,
    registration_no: String,
    pg_id: String,
    bank_ref_no: String,
    mode: String,
    amount: Number,
    status: String,
    orderno: String,
    usertype: String,
  },
  { timestamps: true, collection: "assistance_transaction_tbl" }
);

const AssistanceTransactionModel = mongoose.model(
  "assistance_transaction_tbl",
  AssistanceTransactionSchema
);
module.exports = AssistanceTransactionModel;
