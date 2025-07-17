const Interest = require("../models/Intrest/Intrest");
const { blurAndGetURL } = require("./ImageBlur");

const processUserImages = async (userDetails, loggedInUserRefNo, userRole) => {
  return Promise.all(
    userDetails.map(async (user) => {
      if (userRole === 'Admin') {
        return user;
      }
      if (user.image_verification !== 'active') {
        user.image = null;
        return user;
      }
      
      if (!user.image) return user;

      const secureType = user.secure_image;

      if (secureType === "disable") {
        try {
          user.image = await blurAndGetURL(user.image);
        } catch {
          user.image = null;
        }
        return user;
      }

      if (secureType === "enable") return user;

      if (secureType === "Premiumuser") {
        if (userRole === "PremiumUser" || userRole === "SilverUser") return user;
        try {
          user.image = await blurAndGetURL(user.image);
        } catch {
          user.image = null;
        }
        return user;
      }

      if (secureType === "requestuser") {
        try {
          const connection = await Interest.findOne({
            $or: [
              { sender: loggedInUserRefNo, recipient: user.ref_no, status: "accepted" },
              { sender: user.ref_no, recipient: loggedInUserRefNo, status: "accepted" }
            ]
          });

          if (connection) return user;

          user.image = await blurAndGetURL(user.image);
          return user;
        } catch {
          user.image = null;
          return user;
        }
      }

      
      try {
        user.image = await blurAndGetURL(user.image);
      } catch {
        user.image = null;
      }

      return user;
    })
  );
};

module.exports = { processUserImages };
