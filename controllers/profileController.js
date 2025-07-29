const Profile = require("../models/profile");
const UserModel = require("../models/user");
const { blurAndGetURL } = require("../utils/ImageBlur");
const { processUserImages } = require("../utils/SecureImageHandler");
const BlurredImages = require("../models/blurredImages");
const { getPaginationParams } = require("../utils/pagination");
const { getActiveMessage, getDeactiveMessage } = require("../utils/EmailMessages");
const { sendMail } = require("../utils/EmailService");

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
    const { _id, image,status, ...others } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { registration_no },
      { $set: { ...others, ...(image && { image }) } },
      { new: true }
    );

    if( profile){
      try {  
        const {activatedMessage,activatedSubject} = getActiveMessage(profile);
        const {deactivatedMessage,deactivatedSubject} = getDeactiveMessage(profile);
        const subject = status !== 'active' ? deactivatedSubject : activatedSubject;
        const message = status !== 'active' ? deactivatedMessage : activatedMessage;

        await sendMail(profile.email_id, subject, message);
      } catch (emailError) {
        console.error(emailError);
      }
    }

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
      loggedInUserId,
      userRole
    );

    res.status(200).json({
      success: true,
      content: userDetails,
      currentPage: page,
      pageSize: pageSize,
      totalRecords: totalRecords,
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
      return res.status(404).json({
        success: false,
        message: "Profile not found for current user.",
      });
    }
    const orFilters = [];
    if (
      myProfile.from_age_preference != null &&
      myProfile.to_age_preference != null
    ) {
      orFilters.push({
        age: {
          $gte: myProfile.from_age_preference,
          $lte: myProfile.to_age_preference,
        },
      });
    }
    if (myProfile.from_height_preference && myProfile.to_height_preference) {
      orFilters.push({
        height: {
          $gte: myProfile.from_height_preference,
          $lte: myProfile.to_height_preference,
        },
      });
    }
    if (myProfile.caste_preference) {
      orFilters.push({ caste: myProfile.caste_preference });
    }
    let genderFilter = {};
    if (myProfile.gender) {
      if (myProfile.gender.toLowerCase() === "bride") {
        genderFilter.gender = { $regex: /^bridegroom$/i };
      } else if (myProfile.gender.toLowerCase() === "bridegroom") {
        genderFilter.gender = { $regex: /^bride$/i };
      }
    }

    const filter = {
      registration_no: { $ne: userRegNo },
      ...genderFilter,
      ...(orFilters.length > 0 ? { $or: orFilters } : {}),
    };

    const { page, pageSize } = getPaginationParams(req);
    const totalRecords = await Profile.countDocuments(filter);
    let matches = await Profile.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "user_tbl", // join user data to get `ref_no`
          localField: "registration_no",
          foreignField: "ref_no",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          ref_no: "$user.ref_no", // this is crucial!
          image: "$image",
          image_verification: "$image_verification",
          secure_image: "$secure_image",
        },
      },
      { $sort: { registration_no: 1 } },
      { $skip: page * pageSize },
      { $limit: pageSize },
    ]);

    matches = matches.map((profile) => {
      let mobile_no = profile.mobile_no;
      let email_id = profile.email_id;
      if (req.user.user_role === "FreeUser") {
        mobile_no = null;
        email_id = null;
      }
      return {
        ...profile,
        mobile_no,
        email_id,
      };
    });

    matches = await processUserImages(matches, userRegNo, req.user.user_role);

    res.status(200).json({
      success: true,
      content: matches,
      currentPage: page,
      pageSize: pageSize,
      totalRecords: totalRecords,
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
    const words = cleanedInput.split(/\s+/);
    const searchConditions = [];

    const fullRegex = { $regex: cleanedInput, $options: "i" };
    searchConditions.push(
      { first_name: fullRegex },
      { last_name: fullRegex },
      { email_id: fullRegex },
      { registration_no: fullRegex }
    );

    if (words.length > 1) {
      const [firstWord, secondWord] = words;
      searchConditions.push({
        $and: [
          { first_name: { $regex: firstWord, $options: "i" } },
          { last_name: { $regex: secondWord, $options: "i" } },
        ],
      });
      searchConditions.push({
        $and: [
          { first_name: { $regex: secondWord, $options: "i" } },
          { last_name: { $regex: firstWord, $options: "i" } },
        ],
      });
      if (words.length > 2) {
        const remainingWords = words.slice(2).join(" ");
        searchConditions.push({
          $and: [
            { first_name: { $regex: firstWord, $options: "i" } },
            { last_name: { $regex: `${secondWord} ${remainingWords}`, $options: "i" } },
          ],
        });
        searchConditions.push({
          $and: [
            { first_name: { $regex: `${firstWord} ${secondWord}`, $options: "i" } },
            { last_name: { $regex: remainingWords, $options: "i" } },
          ],
        });
      }
    }

    let profiles = await Profile.find({ $or: searchConditions });
    const regNos = profiles.map((p) => p.registration_no);
    const users = await UserModel.find({ ref_no: { $in: regNos } }).lean();

    const merged = profiles.map((profile) => {
      const user = users.find((u) => u.ref_no === profile.registration_no) || {};
      let mobile_no = profile.mobile_no;
      let email_id = profile.email_id;
      if (req.user.user_role === "FreeUser") {
        mobile_no = null;
        email_id = null;
      }
      return {
        ...profile.toObject(),
        user_role: user.type_of_user,
        mobile_no,
        image: profile.image,
        image_verification: profile.image_verification,
        secure_image: profile.secure_image,
        email_id,
        ref_no: profile.registration_no,
      };
    });

    const processed = await processUserImages(merged, req.user.ref_no, req.user.user_role);

    if (!processed || processed.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found matching the input.",
      });
    }

    return res.status(200).json({
      success: true,
      users: processed,
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
  getMyMatches,
};
