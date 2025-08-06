const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  ref_no: { type: String, required: true,  },
  user_role: { 
    type: String, 
    required: true,
    enum: ['FreeUser', 'PremiumUser', 'SilverUser', 'Admin'], 
    default: 'FreeUser'
  },
  status: { type: String, default: "inactive" },
  UpdateStatus: { type: String,default: "not updated" },
  counter: { type: Number, default: 0 },
  last_loggedin: { type: String }, 
  loggedin_from: { type: String }, // IP address
  loggedin_platform: { type: String }, // "mobile", "desktop", etc.
  mobile_no: { type: String }
}, { timestamps: true, collection: "user_tbl" });

const UserModel = mongoose.model("user_tbl", UserSchema);
module.exports = UserModel;