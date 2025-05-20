const PromotersModel = require("../../models/promoters/Promoters");
const PromotersEarningsModel = require("../../models/promoters/PromotersEarnings");
const PromoterTransactionModel = require("../../models/promoters/PromotersTransaction");


const getPromoters = async(req,res)=>{
    try {
        const Promoters = await PromotersModel.find();
        res.status(200).json({ success: true, Promoters });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
}
const getPromotersEarnings = async(req,res)=>{
    try {
        const Earnings = await PromotersEarningsModel.find();
        res.status(200).json({ success: true, Earnings });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
}
const getPromotersTransactions = async(req,res)=>{
    try {
        const Transactions = await PromoterTransactionModel.find();
        res.status(200).json({ success: true, Transactions });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
}
const updatePromoterStatus = async (req, res) => {
  const { id } = req.params; 
  const { status } = req.body; 

  try {
    const updatedPromoter = await PromotersModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedPromoter) {
      return res.status(404).json({ success: false, message: "Promoter not found" });
    }

    res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      promoter: updatedPromoter,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {getPromoters,getPromotersEarnings, getPromotersTransactions,updatePromoterStatus };