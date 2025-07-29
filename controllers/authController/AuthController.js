const jwt = require("jsonwebtoken");
const UserModel = require("../../models/user");
const profile = require("../../models/profile");
const { sendMail } = require("../../utils/EmailService");
const { generateOTP, storeOTP, verifyOTP } = require("../../utils/OtpService");
const { FormatDate } = require("../../utils/DateFormate");
const PromotersModel = require("../../models/promoters/Promoters");
const { getWelcomeMessage, getResetPasswordMessage } = require("../../utils/EmailMessages");



const signUp = async (req, res) => {
  try {
    const { username, password, user_role, ...otherDetails } = req.body;

    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "Username already exists" });
    }

    const lastUser = await UserModel.aggregate([
      { $sort: { user_id: -1 } },
      { $limit: 1 },
    ]);
    const newUserId = lastUser.length ? lastUser[0].user_id + 1 : 1;
    const newRefNo = lastUser.length
      ? `SGM${String(parseInt(lastUser[0].ref_no.slice(3)) + 1).padStart(3, "0")}`
      : "SGM001";

    const newUser = new UserModel({
      user_id: newUserId,
      username,
      password,
      ref_no: newRefNo,
      user_role,
      ...otherDetails,
    });

    await newUser.save();

    const currentDate = new Date();
    const formattedDate = FormatDate(currentDate);

    const newProfile = new profile({
      registration_no: newRefNo,
      email_id: username,
      type_of_user: newUser.user_role,
      registration_date: formattedDate,
      ...otherDetails,
    });


    await newProfile.save();

try {  
  const {welcomeMessage,welcomeSubject} = getWelcomeMessage( otherDetails, newRefNo);

  await sendMail(username, welcomeSubject, welcomeMessage);
} catch (emailError) {
  console.error(emailError);
}



    return res.status(201).json({
      success: true,
      user: newUser,
      profile: newProfile,
      message: "Signup successful",
    });

  } catch (error) {
    console.error("Signup error:", error); 
    res.status(500).json({ success: false, message: error.message });
  }
};


const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await UserModel.findOne({ username });
    const promoter = await PromotersModel.findOne({ username });

    const authUser = user || promoter;
    const userType = user ? 'user' : 'promoter';

    if (!authUser) {
      return res.status(400).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    if (authUser.password !== password) {
      return res.status(400).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    if (authUser.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Account is ${authUser.status}. Please contact support.`,
        status: authUser.status,
        UpdateStatus: authUser.UpdateStatus,
      });
    }

    authUser.last_loggedin = new Date();
    authUser.counter += 1;
    authUser.loggedin_from =
      req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    await authUser.save();

    const validUserRoles = ['FreeUser', 'PremiumUser', 'SilverUser', 'Admin'];
    
    const tokenUserRole = userType === 'user' 
      ? (validUserRoles.includes(authUser.user_role) ? authUser.user_role : 'user')
      : 'promoter';

    const token = jwt.sign(
      {
        user_id: authUser.user_id,
        username: authUser.username,
        user_role: tokenUserRole,
        ref_no: authUser.ref_no,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        ...authUser.toObject(),
      },
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    const user = await UserModel.findOne({ username: email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Email not registered" });
    }

    if (otp && !password) {
      if (!verifyOTP(email, otp)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid OTP or expired" });
      }
      return res.json({
        success: true,
        message: "New password reset successfully!",
      });
    }
    if (password) {
      user.password = password;
      await user.save();

      return res.json({
        success: true,
        message: "Password reset successfully",
      });
    }
    const newOtp = generateOTP();
    storeOTP(email, newOtp);
    const { resetPasswordSubject, resetPasswordDescription } = getResetPasswordMessage(newOtp);
    await sendMail(user.username, resetPasswordSubject, resetPasswordDescription);
    return res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const totalProfiles = await profile.countDocuments({
      type_of_user: { $in: ["FreeUser", "SilverUser", "PremiumUser"] },
    });

    const currentDate = new Date();

    // Start of week (Sunday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    startOfMonth.setHours(0, 0, 0, 0);

    const thisWeekRegistrations = await profile.countDocuments({
      $expr: {
        $gte: [
          {
            $dateFromString: {
              dateString: "$registration_date",
              format: "%m/%d/%Y",
            },
          },
          startOfWeek,
        ],
      },
    });

    const thisMonthRegistrations = await profile.countDocuments({
      $expr: {
        $gte: [
          {
            $dateFromString: {
              dateString: "$registration_date",
              format: "%m/%d/%Y",
            },
          },
          startOfMonth,
        ],
      },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalProfiles,
        thisWeekRegistrations,
        thisMonthRegistrations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getRecentRegisters = async (req, res) => {
  try {
    const recentMembers = await profile.find({})
      .sort({ _id: -1 }) 
      .limit(6)
      .lean()
      .select({
        registration_no: 1,
        first_name: 1,
        last_name: 1,
        age: 1,
        occupation: 1,
        educational_qualification: 1,
        city: 1,
        caste: 1,
        _id: 0 
      });

    const formattedMembers = recentMembers.map(({ 
      first_name, 
      last_name, 
      ...rest 
    }) => ({
      ...rest,
      name: `${first_name || ''} ${last_name || ''}`.trim()
    }));

    res.status(200).json(formattedMembers);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  signUp,
  login,
  resetPassword,
  getDashboardStats,
  getRecentRegisters
};
