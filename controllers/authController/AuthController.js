const jwt = require('jsonwebtoken');
const UserModel = require('../../models/user');
const profile = require('../../models/profile');
const { sendMail } = require('../../utils/EmailService');
const { generateOTP, storeOTP, verifyOTP } = require('../../utils/OtpService');



const signUpSubject = "Welcome to GirijaKalyana - Your Login Credentials";
const recoverySubject = "GirijaKalyana - Password Recovery";
const resetPasswordSubject =  "GirijaKalyana - OTP Verification";

const signUp = async(req,res)=>{
  try {
    const { username, password, ...otherDetails } = req.body;
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    const lastUser = await UserModel.aggregate([
      { $sort: { user_id: -1 } },
      { $limit: 1 }
    ]);
    const newUserId = lastUser.length ? lastUser[0].user_id + 1 : 1;
    const newRefNo = lastUser.length ? `SGM${String(parseInt(lastUser[0].ref_no.slice(3)) + 1).padStart(3, '0')}` : 'SGM001';

    const newUser = new UserModel({
      user_id: newUserId,
      username,
      password, 
      ref_no: newRefNo,
     ...otherDetails
    });

    await newUser.save();

    const currentDate = new Date();
    const formattedDate = `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;

    const newProfile = new profile({
      registration_no: newRefNo,
      email_id: username,
      type_of_user: newUser.user_role,
      registration_date: formattedDate,
      ...otherDetails // Include other profile details from request
    });
    await newProfile.save();

    return res.status(201).json({
      success: true,
      user: newUser,
      profile: newProfile,
      message: 'Signup successful'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user with exact username match
    const user = await UserModel.findOne({ username });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Compare passwords (in real apps, use bcrypt.compare)
    if (user.password !== password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: `Account is ${user.status}. Please contact support.`,
        status: user.status,
        UpdateStatus: user.UpdateStatus 
      });
    }

    // Update login info
    user.last_loggedin = new Date();
    user.counter += 1;
    user.loggedin_from = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    await user.save();

    // Create token with essential user data
    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        user_role: user.user_role,
        ref_no :user.ref_no
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      token,
      user,
      message: 'Login successful'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
const recoverPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ username:email });
    if (!user) {
      return res
      .status(404)
      .json({ success: false, message: "Email not registered" });
    }
    const recoveryDescription = `Dear Member,\n\nYou requested a password recovery. Here is your password:\n ${user.password}\n\nPlease keep this information secure.\n\nBest regards,\nBICCSL Team`;

     await sendMail(user.username, recoverySubject, recoveryDescription);
    res.json({ success: true, message: "Password sent to your email" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    const user = await UserModel.findOne({ username:email });
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
      return res.json({ success: true, message: "New password reset successfully!" });
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
    const resetPasswordDescription = `Dear Member,\n\nYour OTP for password reset is: ${newOtp}\n\nPlease use this OTP to proceed with resetting your password.\n\nPlease keep don't share with anyone.\n\nBest regards,\n Team`;
    storeOTP(email, newOtp);
    await sendMail(user.username, recoverySubject, resetPasswordDescription);
    return res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};




module.exports = {
  signUp,
  login,
  recoverPassword,
  resetPassword,
 
};