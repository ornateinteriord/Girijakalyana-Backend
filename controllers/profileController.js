const Profile = require("../models/profile");
const UserModel = require("../models/user");
const { blurAndGetURL } = require("../utils/ImageBlur");
const { processUserImages } = require("../utils/SecureImageHandler");
const BlurredImages = require('../models/blurredImages');
const { getPaginationParams } = require("../utils/pagination");

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
    const { _id,image, ...others } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { registration_no },
      { $set: { ...others, ...(image && { image }) } },
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

     if (image) {
      const blurredUrl = await blurAndGetURL(image); // generate blurred image
      await BlurredImages.findOneAndUpdate(
        { user_id: profile.registration_no },
        { $set: { blurredImage: blurredUrl } },
        { upsert: true, new: true }
      );
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
     const loggedInUserId = req.user.ref_no; 
    const { page, pageSize } = getPaginationParams(req);
    const totalRecords = await UserModel.countDocuments({
       ref_no: { $ne: loggedInUserId },
    });

    let userDetails = await UserModel.aggregate([
       {
        $match: {
          ref_no: { $ne: loggedInUserId },
        },
      },
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
      { $sort: { registration_no: 1 } },
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

const getMyMatches = async (req, res) => {
  try {
    const userRegNo = req.user.ref_no;
    const myProfile = await Profile.findOne({ registration_no: userRegNo });
    if (!myProfile) {
      return res.status(404).json({ success: false, message: "Profile not found for current user." });
    }
    // Build $or filter for any preference match
    const orFilters = [];
    if (myProfile.from_age_preference != null && myProfile.to_age_preference != null) {
      orFilters.push({ age: { $gte: myProfile.from_age_preference, $lte: myProfile.to_age_preference } });
    }
    if (myProfile.from_height_preference && myProfile.to_height_preference) {
      orFilters.push({ height: { $gte: myProfile.from_height_preference, $lte: myProfile.to_height_preference } });
    }
    if (myProfile.caste_preference) {
      orFilters.push({ caste: myProfile.caste_preference });
    }
    const filter = {
      registration_no: { $ne: userRegNo },
      ...(orFilters.length > 0 ? { $or: orFilters } : {})
    };

    const { page, pageSize } = getPaginationParams(req);
    const totalRecords = await Profile.countDocuments(filter);
    const matches = await Profile.find(filter)
      .sort({ registration_no: 1 })
      .collation({ locale: "en", numericOrdering: true })
      .skip(page * pageSize)
      .limit(pageSize);

    res.status(200).json({
      success: true,
      content: matches,
      currentPage: page,
      pageSize: pageSize,
      totalRecords: totalRecords
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
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
  getMyMatches
};
