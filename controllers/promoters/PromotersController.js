const PromotersModel = require("../../models/promoters/Promoters");
const ProfileModel = require("../../models/profile");
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
const getPromotersEarnings = async (req, res) => {
  try {

    const Earnings = await PromotersEarningsModel.aggregate([
      {
        $match: {
          referal_by: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $group: {
          _id: "$referal_by",
          totalAmount: { $sum: { $toDouble: "$amount_earned" } },
          count: { $sum: 1 },
          status: { $first: "$status" },
        }
      },
      {
        $project: {
          _id: 0,
          referal_by: "$_id",
          totalAmount: 1,
          count: 1,
          status: 1,
        }
      },
      {
        $sort: { referal_by: 1 }
      }
    ]);


    const allRecords = await PromotersEarningsModel.find({});

    res.status(200).json({ 
      success: true, 
      Earnings,
      allRecords 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
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

const getPromoterUserStats = async (_req, res) => {
  try {
    // Get all promoters
    const promoters = await PromotersModel.find({}, { promoter_id: 1, promoter_name: 1 });

    // Loop through promoters and calculate counts
    const results = await Promise.all(
      promoters.map(async (promoter) => {
        const promoterId = promoter.promoter_id;

        // Find all users referred by this promoter
        const users = await ProfileModel.find({ refered_by: promoterId }, { type_of_user: 1 });

        // Count types
        const freeCount = users.filter(u => u.type_of_user === "FreeUser").length;
        const silverCount = users.filter(u => u.type_of_user === "SilverUser").length;
        const premiumCount = users.filter(u => u.type_of_user === "PremiumUser").length;
        const totalCount = users.length;

        return {
          promoter_id: promoterId,
          promoter_name: promoter.promoter_name,
          freeCount,
          silverCount,
          premiumCount,
          totalCount
        };
      })
    );

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching promoter stats:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

const getUsersByPromoter = async (req, res) => {
  try {
    const { promoter_id } = req.params;

    if (!promoter_id || promoter_id.trim() === "" || promoter_id === "undefined" || promoter_id === "null") {
      return res.status(400).json({
        success: false,
        message: "promoter_id is required in params",
      });
    }

    // Aggregation pipeline
    const users = await ProfileModel.aggregate([
      {
        $match: { refered_by: promoter_id }
      },
      {
        // Add custom order for type_of_user
        $addFields: {
          userTypeOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$type_of_user", "PremiumUser"] }, then: 1 },
                { case: { $eq: ["$type_of_user", "SilverUser"] }, then: 2 },
                { case: { $eq: ["$type_of_user", "FreeUser"] }, then: 3 }
              ],
              default: 4
            }
          }
        }
      },
      {
        $sort: {
          userTypeOrder: 1, // Premium first, then Silver, then Free
          registration_date: -1 // recent first
        }
      },
      {
        $project: {
          userTypeOrder: 0 // hide temp field
        }
      }
    ]);

    res.status(200).json({
      success: true,
      promoter_id,
      count: users.length,
      users
    });
  } catch (error) {
    console.error("Error fetching users by promoter:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};



module.exports = {getPromoters,getPromotersEarnings, getPromotersTransactions,updatePromoterStatus , getPromoterUserStats, getUsersByPromoter};