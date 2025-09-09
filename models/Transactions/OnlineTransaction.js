const mongoose = require("mongoose");

const transactionShema = new mongoose.Schema(
  {
    transaction_id: { type: Number, unique: true }, // ensure uniqueness
    date: { type: Date, default: Date.now },
    registration_no: { type: String },
    PG_id: { type: String },
    bank_ref_num: { type: String },
    mode: { type: String },
    amount: { type: Number },
    status: { type: String, default: "success" }, // default to success
    orderno: { type: String },
    usertype: { type: String },
  },
  { timestamps: true, collection: "transaction_tbl" }
);

// 🔹 Pre-save hook for auto-increment transaction_id
transactionShema.pre("save", async function (next) {
  if (this.isNew) {
    const lastTransaction = await mongoose
      .model("transaction_tbl")
      .findOne({})
      .sort({ transaction_id: -1 })
      .lean();

    const lastId = lastTransaction?.transaction_id || 0;
    this.transaction_id = Number(lastId) + 1;
  }
  next();
});

const TransactionModel = mongoose.model("transaction_tbl", transactionShema);
module.exports = TransactionModel;
