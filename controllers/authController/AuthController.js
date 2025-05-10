const jwt = require('jsonwebtoken');
const UserModel = require('../../models/user');
const profile = require('../../models/profile');

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

    const newProfile = new profile({
      registration_no: newRefNo,
      email_id: username,
      type_of_user: newUser.user_role,
      registration_date: new Date().toISOString(),
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



module.exports = {
  signUp,
  login
};