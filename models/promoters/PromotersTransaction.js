const mongoose = require("mongoose");

const PromoterTransactionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    promocode: {
      type: String,
      required: true,
    },
    transaction_no: {
      type: String,
      required: true,
    },
    transaction_date: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    mode_of_payment: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default:"active"
    },
  },
  { timestamps: true, collection: "promoters_transaction_tbl" }
);

const PromoterTransactionModel = mongoose.model(
  "promoters_transaction_tbl",
  PromoterTransactionSchema
);
module.exports = PromoterTransactionModel;
