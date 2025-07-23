const Profile = require("../models/profile");
const UserModel = require("../models/user");
const { blurAndGetURL } = require("../utils/ImageBlur");
const Interest = require("../models/Intrest/Intrest");
const { processUserImages } = require("../utils/SecureImageHandler");

// Get profile by registration number
const getProfileByRegistrationNo = async (req, res) => {
  try {
    const { registration_no } = req.params;

    const profile = await Profile.findOne({ registration_no });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found with the given registration number",
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { registration_no } = req.params;
    const { _id, ...others } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { registration_no },
      { $set: others },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found with the given registration number",
      });
    }

    const userUpdate = await UserModel.findOneAndUpdate(
      { ref_no: registration_no },
      { $set: others },
      { new: true }
    );

    if (!userUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found with the given registration number",
      });
    }

    res.status(200).json({
      success: true,
      data: { profile, user: userUpdate },
      message: "Profile Updated Successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllUserDetails = async (req, res) => {
  try {
    const userRole = req.user.user_role;

    let page = parseInt(req.body.page, 10);
    let pageSize = parseInt(req.body.pageSize, 10);
    if (isNaN(page) || page < 0) page = 0;
    if (isNaN(pageSize) || pageSize < 1) pageSize = 10;

    
    const totalRecords = await UserModel.countDocuments();

    let userDetails = await UserModel.aggregate([
      {
        $lookup: {
          from: "registration_tbl",
          localField: "ref_no",
          foreignField: "registration_no",
          as: "profile",
        },
      },
      {
        $unwind: {
          path: "$profile",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$$ROOT", "$profile", { profile: "$profile" }],
          },
        },
      },
      {
        $addFields: {
          mobile_no: userRole === "FreeUser" ? null : "$mobile_no",
          email_id: userRole === "FreeUser" ? null : "$email_id",
        },
      },
      {
        $project: {
          profile: 0,
        },
      },
      { $sort: { _id: -1 } },
      { $skip: page * pageSize },
      { $limit: pageSize },
    ]);

    userDetails = await processUserImages(
      userDetails,
      req.user.ref_no,
      userRole
    );

    res.status(200).json({
      success: true,
      content: userDetails,
      currentPage: page,
      pageSize: pageSize,
      totalRecords: totalRecords
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const searchUsersByInput = async (req, res) => {
  try {
    const { input } = req.query;

    if (!input || input.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search input is required",
      });
    }

    const cleanedInput = input.trim().replace(/^["']+|["']+$/g, "");
    const words = cleanedInput.split(/\s+/); // Split by one or more whitespace characters
    const searchConditions = [];

    // Always include individual field searches
    const fullRegex = { $regex: cleanedInput, $options: "i" };
    searchConditions.push(
      { first_name: fullRegex },
      { last_name: fullRegex },
      { email_id: fullRegex },
      { registration_no: fullRegex }
    );

    // If there are multiple words, add combinations for first+last name
    if (words.length > 1) {
      const [firstWord, secondWord] = words;
      
      // First word as first name, second as last name
      searchConditions.push({
        $and: [
          { first_name: { $regex: firstWord, $options: "i" } },
          { last_name: { $regex: secondWord, $options: "i" } }
        ]
      });
      
      // First word as last name, second as first name
      searchConditions.push({
        $and: [
          { first_name: { $regex: secondWord, $options: "i" } },
          { last_name: { $regex: firstWord, $options: "i" } }
        ]
      });
      
      // For cases with more than 2 words, combine remaining words
      if (words.length > 2) {
        const remainingWords = words.slice(2).join(" ");
        
        // First word as first name, rest as last name
        searchConditions.push({
          $and: [
            { first_name: { $regex: firstWord, $options: "i" } },
            { last_name: { $regex: `${secondWord} ${remainingWords}`, $options: "i" } }
          ]
        });
        
        // Last word as last name, rest as first name
        searchConditions.push({
          $and: [
            { first_name: { $regex: `${firstWord} ${secondWord}`, $options: "i" } },
            { last_name: { $regex: remainingWords, $options: "i" } }
          ]
        });
      }
    }

    const users = await Profile.find({ $or: searchConditions });

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found matching the input.",
      });
    }

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const changePassword = async (req, res) => {
  try {
    const { registration_no } = req.params;
    const { oldPassword, newPassword } = req.body;

    const user = await UserModel.findOne({ ref_no: registration_no });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Plain text comparison
    if (user.password !== oldPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect.",
      });
    }

    // Save new password directly
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfileByRegistrationNo,
  updateProfile,
  getAllUserDetails,
  changePassword,
  searchUsersByInput,
};
