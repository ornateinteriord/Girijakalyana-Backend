const Profile = require("../models/profile");
const UserModel = require("../models/user");

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
    const profile = await Profile.findOneAndUpdate(
      { registration_no }, 
      { $set: req.body },   
      { new: true } 
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found with the given registration number",
      });
    }
    res.status(200).json({
      success: true,
      data: profile,
      message:"Profile Updated Successfully."
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllUserProfile = async (req, res) => {
  try {
    const users = await UserModel.find();
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getProfileByRegistrationNo,updateProfile, getAllUserProfile };
