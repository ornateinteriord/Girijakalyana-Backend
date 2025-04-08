const jwt = require('jsonwebtoken');
const UserModel = require('../../models/user');

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
      { expiresIn: '1h' }
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
  login
};