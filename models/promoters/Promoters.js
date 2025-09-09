const mongoose = require("mongoose");

const PromoterDetailsSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    registration_date: {
      type: String,
    },
    promoter_name: {
      type: String,
    },
    membership_type: {
      type: String,
    },
    promoter_id: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      unique: true,
    },
    mobile: {
      type: String,
    },
    country: {
      type: String,
    },
    company_name: {
      type: String,
    },
    account_number: {
      type: String,
    },
    account_status: {
      type: String,
    },
    bank_ifsc: {
      type: String,
    },
    username: {
      type: String,
    },
    password: {
      type: String,
    },
    status: {
      type: String,
      default: "pending",
    },
    KEY: {
      type: String,
    },
  },
  { timestamps: true, collection: "promoter_tbl" }
);

const PromotersModel = mongoose.model("promoter_tbl", PromoterDetailsSchema);
module.exports = PromotersModel;
