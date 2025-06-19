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
    ]);

    userDetails = await processUserImages(
      userDetails,
      req.user.ref_no,
      userRole
    );

    res.status(200).json({ success: true, users: userDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Change password controller
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
};
