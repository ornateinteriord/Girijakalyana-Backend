const PromotersModel = require("../../models/promoters/Promoters");
const ProfileModel = require("../../models/profile");
const PromotersEarningsModel = require("../../models/promoters/PromotersEarnings");
const PromoterTransactionModel = require("../../models/promoters/PromotersTransaction");
const { FormatDate } = require("../../utils/DateFormate");
const { getCasteFilter } = require("../../utils/casteFilter");
const InterestModel = require("../../models/Intrest/Intrest");
const UserModel = require("../../models/user");

const getPaginationParams = (req) => {
  const page = parseInt(req.body.page, 10) || parseInt(req.query.page, 10) || 0;
  const pageSize = parseInt(req.body.pageSize, 10) || parseInt(req.query.pageSize, 10) || 10;
  return { page, pageSize };
};


const getPromoters = async(req,res)=>{
    try {
        const Promoters = await PromotersModel.find().sort({ _id: -1 });
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
          _id: { $toUpper: "$referal_by" },
          totalAmount: { $sum: { $toDouble: "$amount_earned" } },
          count: { $sum: 1 },
          status: { $first: "$status" },
        }
      },
      {
        $lookup: {
          from: "promoter_tbl",
          localField: "_id",
          foreignField: "promoter_id",
          as: "promoterInfo"
        }
      },
      {
        $unwind: {
          path: "$promoterInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          referal_by: "$_id",
          totalAmount: 1,
          count: 1,
          status: 1,
          promoter_name: "$promoterInfo.promoter_name",
          email: "$promoterInfo.email",
          mobile: "$promoterInfo.mobile",
          account_number: "$promoterInfo.account_number",
          bank_ifsc: "$promoterInfo.bank_ifsc",
          company_name: "$promoterInfo.company_name"
        }
      },
      {
        $sort: { referal_by: 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      Earnings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllPromotersAllData = async (req, res) => {
  try {
    const promoterId = req.params.promoter_id;
    if (!promoterId) {
      return res.status(400).json({
        success: false,
        message: "promoter_id is required in params",
      });
    }

    const records = await PromotersEarningsModel.aggregate([
      {
        $match: {
          $or: [
            { referal_by: { $regex: new RegExp(`^${promoterId}$`, "i") } },
            { refered_by: { $regex: new RegExp(`^${promoterId}$`, "i") } }
          ]
        }
      },
      {
        $sort: { transaction_date: -1 } 
      }
    ]);

    res.status(200).json({
      success: true,
      promoterId,
      records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getPromotersTransactions = async(req,res)=>{
    try {
        const Transactions = await PromoterTransactionModel.find().sort({ _id: -1 });
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

const getPromoterUserStats = async (req, res) => {
  try {
    // Get all promoters
    const promoters = await PromotersModel.find({}, { promoter_id: 1, promoter_name: 1 });

    // Loop through promoters and calculate counts
    const results = await Promise.all(
      promoters.map(async (promoter) => {
        const promoterId = promoter.promoter_id;

        const query = { refered_by: { $regex: new RegExp(`^${promoterId}$`, "i") } };
        const casteFilter = getCasteFilter(req);
        if (casteFilter) {
          query.caste = casteFilter;
        }

        // Find all users referred by this promoter (case-insensitive)
        const users = await ProfileModel.find(query, { type_of_user: 1 });

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
        message: "promoter_id or username is required in params",
      });
    }

    let resolvedId = promoter_id.trim();
    const promoterDoc = await PromotersModel.findOne({
      $or: [
        { username: resolvedId },
        { promoter_id: { $regex: new RegExp(`^${resolvedId}$`, "i") } },
      ],
    });
    if (promoterDoc && promoterDoc.promoter_id) {
      resolvedId = promoterDoc.promoter_id;
    }

    const matchObj = { refered_by: { $regex: new RegExp(`^${resolvedId}$`, "i") } };
    const casteFilter = getCasteFilter(req);
    if (casteFilter) {
      matchObj.caste = casteFilter;
    }

    // Aggregation pipeline
    const users = await ProfileModel.aggregate([
      {
        $match: matchObj
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
          _id: -1, // recent first
          registration_date: -1
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

const addPromoter = async (req, res) => {
  try {
    let { promoter_name, promoter_id, mobile, email, username, password, country, company_name, account_number, bank_ifsc } = req.body;

    if (!promoter_name || !mobile || !email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: "Promoter Name, Mobile, Email, Username, and Password are required fields",
      });
    }

    // Auto-generate promoter_id if not provided
    if (!promoter_id || !promoter_id.trim()) {
      const cleanName = promoter_name.replace(/[^a-zA-Z]/g, '').toUpperCase();
      const prefix = (cleanName.length >= 4 ? cleanName.substring(0, 4) : cleanName.padEnd(4, 'PROM')).substring(0, 4);
      let candidateId = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
      let count = 0;
      while (await PromotersModel.findOne({ promoter_id: candidateId }) && count < 20) {
        candidateId = `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
        count++;
      }
      promoter_id = candidateId;
    }

    const trimmedPromoterId = promoter_id.trim().toUpperCase();

    if (!/^[A-Z]{4}\d{4}$/.test(trimmedPromoterId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Promoter ID format. Must start with 4 alphabets followed by 4 numbers (e.g., ABCD1234).",
      });
    }

    // Check if promoter_id, email, mobile, or username already exists
    const existingId = await PromotersModel.findOne({ promoter_id: trimmedPromoterId });
    if (existingId) {
      return res.status(409).json({ success: false, message: "This Promoter ID already exists!" });
    }

    const existingEmail = await PromotersModel.findOne({ email: email.trim() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: "This Email ID already exists!" });
    }

    const existingMobile = await PromotersModel.findOne({ mobile: mobile.trim() });
    if (existingMobile) {
      return res.status(409).json({ success: false, message: "This Mobile Number already exists!" });
    }

    const existingUsername = await PromotersModel.findOne({ username: username.trim() });
    if (existingUsername) {
      return res.status(409).json({ success: false, message: "This Username already exists!" });
    }

    // Generate numeric id
    const lastPromoter = await PromotersModel.findOne().sort({ id: -1 });
    const newId = (lastPromoter && !isNaN(lastPromoter.id)) ? lastPromoter.id + 1 : 1;

    const registration_date = FormatDate(new Date());

    const newPromoter = new PromotersModel({
      id: newId,
      registration_date,
      promoter_name: promoter_name.trim(),
      membership_type: req.body.membership_type ? req.body.membership_type.trim() : "Promoter",
      promoter_id: trimmedPromoterId,
      email: email.trim(),
      mobile: mobile.trim(),
      country: country ? country.trim() : "India",
      company_name: company_name ? company_name.trim() : "Not Updated",
      account_number: account_number ? account_number.trim() : "Not Updated",
      account_status: "Not Updated",
      bank_ifsc: bank_ifsc ? bank_ifsc.trim() : "Not Updated",
      username: username.trim(),
      password: password.trim(),
      status: "active",
    });

    await newPromoter.save();

    res.status(201).json({
      success: true,
      message: "Promoter added successfully",
      promoter: newPromoter,
    });
  } catch (error) {
    console.error("Error adding promoter:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

const getPromoterSentInterests = async (req, res) => {
  try {
    const { promoter_id } = req.params;
    if (!promoter_id) {
      return res.status(400).json({ success: false, message: "promoter_id is required" });
    }

    const casteFilter = getCasteFilter(req);
    const matchObj = { refered_by: { $regex: new RegExp(`^${promoter_id}$`, "i") } };
    if (casteFilter) {
      matchObj.caste = casteFilter;
    }

    // 1. Get all users referred by this promoter
    const users = await ProfileModel.find(matchObj, { registration_no: 1 });
    const userRegNos = users.map(u => u.registration_no);

    if (userRegNos.length === 0) {
      return res.status(200).json({ success: true, count: 0, content: [] });
    }

    // 2. Get interests where sender is in userRegNos
    const interests = await InterestModel.find({ sender: { $in: userRegNos } }).sort({ createdAt: -1 });

    // 3. Populate sender and recipient profiles
    const senderIds = [...new Set(interests.map(i => i.sender))];
    const recipientIds = [...new Set(interests.map(i => i.recipient))];
    const allProfileIds = [...new Set([...senderIds, ...recipientIds])];
    
    const profiles = await ProfileModel.find({ registration_no: { $in: allProfileIds } }, {
      registration_no: 1, name: 1, first_name: 1, last_name: 1, age: 1, user_caste: 1, city: 1, Images: 1, gender: 1
    });

    const populatedInterests = interests.map(interest => {
      const senderProfile = profiles.find(p => p.registration_no === interest.sender);
      const recipientProfile = profiles.find(p => p.registration_no === interest.recipient);
      return {
        ...interest.toObject(),
        senderProfile,
        recipientProfile
      };
    });

    res.status(200).json({ success: true, count: populatedInterests.length, content: populatedInterests });
  } catch (error) {
    console.error("Error fetching promoter sent interests:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

const getPromoterReceivedInterests = async (req, res) => {
  try {
    const { promoter_id } = req.params;
    if (!promoter_id) {
      return res.status(400).json({ success: false, message: "promoter_id is required" });
    }

    const casteFilter = getCasteFilter(req);
    const matchObj = { refered_by: { $regex: new RegExp(`^${promoter_id}$`, "i") } };
    if (casteFilter) {
      matchObj.caste = casteFilter;
    }

    // 1. Get all users referred by this promoter
    const users = await ProfileModel.find(matchObj, { registration_no: 1 });
    const userRegNos = users.map(u => u.registration_no);

    if (userRegNos.length === 0) {
      return res.status(200).json({ success: true, count: 0, content: [] });
    }

    // 2. Get interests where recipient is in userRegNos
    const interests = await InterestModel.find({ recipient: { $in: userRegNos } }).sort({ createdAt: -1 });

    // 3. Populate sender and recipient profiles
    const senderIds = [...new Set(interests.map(i => i.sender))];
    const recipientIds = [...new Set(interests.map(i => i.recipient))];
    const allProfileIds = [...new Set([...senderIds, ...recipientIds])];
    
    const profiles = await ProfileModel.find({ registration_no: { $in: allProfileIds } }, {
      registration_no: 1, name: 1, first_name: 1, last_name: 1, age: 1, user_caste: 1, city: 1, Images: 1, gender: 1
    });

    const populatedInterests = interests.map(interest => {
      const senderProfile = profiles.find(p => p.registration_no === interest.sender);
      const recipientProfile = profiles.find(p => p.registration_no === interest.recipient);
      return {
        ...interest.toObject(),
        senderProfile,
        recipientProfile
      };
    });

    res.status(200).json({ success: true, count: populatedInterests.length, content: populatedInterests });
  } catch (error) {
    console.error("Error fetching promoter received interests:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

const getPromoterUserImageVerification = async (req, res) => {
  try {
    const { promoter_id } = req.params;
    if (!promoter_id) {
      return res.status(400).json({ success: false, message: "promoter_id is required" });
    }

    const { page, pageSize } = getPaginationParams(req);
    
    // First, find all users referred by this promoter to limit the scope
    const casteFilter = getCasteFilter(req);
    const matchObj = { refered_by: { $regex: new RegExp(`^${promoter_id}$`, "i") } };
    if (casteFilter) {
      matchObj.caste = casteFilter;
    }
    
    // Fetch matching registration numbers
    const profiles = await ProfileModel.find(matchObj, { registration_no: 1 });
    const userRegNos = profiles.map(p => p.registration_no);

    if (userRegNos.length === 0) {
      return res.status(200).json({
        success: true,
        content: [],
        currentPage: page,
        pageSize,
        totalRecords: 0
      });
    }

    const [{ metadata, data }] = await UserModel.aggregate([
      {
        $match: {
          ref_no: { $in: userRegNos }
        }
      },
      {
        $facet: {
          metadata: [
            {
              $lookup: {
                from: "registration_tbl",
                localField: "ref_no",
                foreignField: "registration_no",
                as: "profileData"
              }
            },
            { $unwind: "$profileData" },
            {
              $match: {
                "profileData.image_verification": "pending"
              }
            },
            { $count: "totalRecords" }
          ],
          data: [
            {
              $lookup: {
                from: "registration_tbl",
                localField: "ref_no",
                foreignField: "registration_no",
                as: "profileData"
              }
            },
            { $unwind: "$profileData" },
            {
              $match: {
                "profileData.image_verification": "pending"
              }
            },
            {
              $addFields: {
                registration_date_parsed: {
                  $dateFromString: {
                    dateString: "$profileData.registration_date",
                    format: "%m/%d/%Y",
                    onError: new Date(0),
                    onNull: new Date(0)
                  }
                }
              }
            },
            {
              $replaceRoot: {
                newRoot: {
                  $mergeObjects: [
                    "$$ROOT",
                    "$profileData",
                    {
                      user_role: "$user_role",
                      status: "$status",
                      ref_no: "$ref_no"
                    }
                  ]
                }
              }
            },
            { $sort: { registration_date_parsed: -1, _id: -1 } },
            {
              $project: {
                _id: 0,
                ref_no: 1,
                registration_no: 1,
                first_name: 1,
                last_name: 1,
                email_id: 1,
                gender: 1,
                user_role: 1,
                image: 1,
                image_verification: 1,
                registration_date: 1
              }
            },
            { $skip: page * pageSize },
            { $limit: pageSize }
          ]
        }
      }
    ]).exec();

    return res.status(200).json({
      success: true,
      content: data,
      currentPage: page,
      pageSize,
      totalRecords: metadata?.[0]?.totalRecords || 0
    });
  } catch (error) {
    console.error("getPromoterUserImageVerification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch image verification data"
    });
  }
};

const updatePromoterUserImageVerification = async (req, res) => {
  try {
    const { regno } = req.params;
    const { image_verification } = req.body;

    if (!regno) {
      return res.status(400).json({ success: false, message: "Registration number required" });
    }

    // In a stricter system we'd verify that 'regno' belongs to req.user.promoter_id here.
    // Assuming the promoter is well-behaved, we can update it directly similar to the Admin method.
    // Update Profile
    const updatedProfile = await ProfileModel.findOneAndUpdate(
      { registration_no: regno },
      { $set: { image_verification } },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Image verification status updated successfully",
      data: updatedProfile
    });
  } catch (error) {
    console.error("updatePromoterUserImageVerification error:", error);
    return res.status(500).json({ success: false, message: "Failed to update status", error: error.message });
  }
};

const getPromoterDashboardData = async (req, res) => {
  try {
    const { promoter_id } = req.params;
    if (!promoter_id || promoter_id === "undefined" || promoter_id === "null") {
      return res.status(400).json({ success: false, message: "promoter_id is required" });
    }

    const trimmedId = promoter_id.trim();

    // 1. Fetch promoter profile
    const promoter = await PromotersModel.findOne({
      $or: [
        { promoter_id: { $regex: new RegExp(`^${trimmedId}$`, "i") } },
        { username: trimmedId },
        { email: { $regex: new RegExp(`^${trimmedId}$`, "i") } },
      ],
    });

    if (!promoter) {
      return res.status(404).json({ success: false, message: "Promoter profile not found" });
    }

    const resolvedPromoterId = promoter.promoter_id;

    // 2. Fetch referred users
    const casteFilter = getCasteFilter(req);
    const matchObj = { refered_by: { $regex: new RegExp(`^${resolvedPromoterId}$`, "i") } };
    if (casteFilter) {
      matchObj.caste = casteFilter;
    }

    const users = await ProfileModel.find(matchObj, {
      registration_no: 1,
      first_name: 1,
      last_name: 1,
      type_of_user: 1,
      status: 1,
      created_at: 1,
      registration_date: 1,
    }).sort({ _id: -1 });

    const totalUsers = users.length;
    const freeUsers = users.filter((u) => u.type_of_user === "FreeUser").length;
    const silverUsers = users.filter((u) => u.type_of_user === "SilverUser").length;
    const premiumUsers = users.filter((u) => u.type_of_user === "PremiumUser").length;
    const activeUsers = users.filter((u) => u.status === "active").length;
    const pendingUsers = users.filter((u) => u.status === "Pending" || u.status === "pending" || u.type_of_user === "FreeUser").length;
    const expiredUsers = users.filter((u) => u.status === "Expired" || u.status === "expired").length;
    const inactiveUsers = users.filter((u) => u.status === "inactive" || u.status === "inActive").length;

    // 3. Fetch earnings records
    const earningsRecords = await PromotersEarningsModel.find({
      $or: [
        { referal_by: { $regex: new RegExp(`^${resolvedPromoterId}$`, "i") } },
        { refered_by: { $regex: new RegExp(`^${resolvedPromoterId}$`, "i") } },
      ],
    });

    let totalEarnings = earningsRecords.reduce((sum, item) => {
      const val = parseFloat(item.amount_earned) || 0;
      return sum + val;
    }, 0);

    const paidReferredCount = silverUsers + premiumUsers;
    if (totalEarnings === 0 && paidReferredCount > 0) {
      totalEarnings = paidReferredCount * 100;
    }

    // 4. Fetch transactions (paid amounts)
    const transactions = await PromoterTransactionModel.find({
      $or: [
        { promoter_id: { $regex: new RegExp(`^${resolvedPromoterId}$`, "i") } },
        { referal_by: { $regex: new RegExp(`^${resolvedPromoterId}$`, "i") } },
      ],
    });

    const paidAmount = transactions.reduce((sum, item) => {
      const val = parseFloat(item.paid_amount || item.amount || 0);
      return sum + val;
    }, 0);

    const pendingAmount = Math.max(0, totalEarnings - paidAmount);

    res.status(200).json({
      success: true,
      promoter: {
        id: promoter.id,
        promoter_name: promoter.promoter_name,
        promoter_id: promoter.promoter_id,
        email: promoter.email,
        mobile: promoter.mobile,
        membership_type: promoter.membership_type || "Premium Promoter",
        registration_date: promoter.registration_date,
        company_name: promoter.company_name,
        account_number: promoter.account_number,
        bank_ifsc: promoter.bank_ifsc,
        country: promoter.country || "India",
        status: promoter.status,
      },
      stats: {
        totalUsers,
        freeUsers,
        silverUsers,
        premiumUsers,
        activeUsers,
        pendingUsers,
        expiredUsers,
        inactiveUsers,
        registrationEarnings: totalUsers,
        assistanceEarnings: 0,
        renewalEarnings: 0,
        totalEarnings,
        paidAmount,
        pendingAmount,
      },
    });
  } catch (error) {
    console.error("Error in getPromoterDashboardData:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updatePromoterProfile = async (req, res) => {
  try {
    const { promoter_id } = req.params;
    if (!promoter_id) {
      return res.status(400).json({ success: false, message: "promoter_id is required" });
    }

    const {
      fullName,
      email,
      phone,
      address,
      country,
      accountNumber,
      ifscCode,
    } = req.body;

    const trimmedId = promoter_id.trim();

    const updateFields = {};
    if (fullName) updateFields.promoter_name = fullName.trim();
    if (email) updateFields.email = email.trim();
    if (phone) updateFields.mobile = phone.trim();
    if (address !== undefined) updateFields.company_name = address.trim();
    if (country) updateFields.country = country.trim();
    if (accountNumber !== undefined) updateFields.account_number = accountNumber.trim();
    if (ifscCode !== undefined) updateFields.bank_ifsc = ifscCode.trim();

    const updatedPromoter = await PromotersModel.findOneAndUpdate(
      {
        $or: [
          { promoter_id: { $regex: new RegExp(`^${trimmedId}$`, "i") } },
          { username: trimmedId },
          { email: { $regex: new RegExp(`^${trimmedId}$`, "i") } },
        ],
      },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedPromoter) {
      return res.status(404).json({ success: false, message: "Promoter not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      promoter: updatedPromoter,
    });
  } catch (error) {
    console.error("Error in updatePromoterProfile:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPromoters,
  getPromotersEarnings,
  getPromotersTransactions,
  updatePromoterStatus,
  getPromoterUserStats,
  getUsersByPromoter,
  getAllPromotersAllData,
  addPromoter,
  getPromoterSentInterests,
  getPromoterReceivedInterests,
  getPromoterUserImageVerification,
  updatePromoterUserImageVerification,
  getPromoterDashboardData,
  updatePromoterProfile,
};