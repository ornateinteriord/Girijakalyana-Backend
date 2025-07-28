const Interest = require("../models/Intrest/Intrest");
const BlurredImages = require("../models/blurredImages");
const { blurAndGetURL } = require("./ImageBlur");

const processUserImages = async (userDetails, loggedInUserRefNo, userRole) => {
  return Promise.all(
    userDetails.map(async (user) => {
      if (userRole === 'Admin') return user;

      if (user.image_verification !== 'active') {
        user.image = null;
        return user;
      }

      if (!user.image) return user;

      const secureType = user.secure_image?.toLowerCase() || 'disable';

      const getBlurredImage = async () => {
        try {
          const existingBlur = await BlurredImages.findOne({ user_id: user.registration_no });

          if (existingBlur) {
            return existingBlur.blurredImage;
          }

          const blurredUrl = await blurAndGetURL(user.image);

          await BlurredImages.findOneAndUpdate(
            { user_id: user.registration_no },
            { $set: { blurredImage: blurredUrl } },
            { upsert: true, new: true }
          );

          return blurredUrl;
        } catch (err) {
          console.error("Blur error for", user.registration_no, err);
          return null;
        }
      };

      // Secure image handling logic
      if (secureType === "disable") {
        user.image = await getBlurredImage();
        return user;
      }

      if (secureType === "enable") return user;

      if (secureType === "premiumuser") {
        if (["PremiumUser", "SilverUser"].includes(userRole)) return user;
        user.image = await getBlurredImage();
        return user;
      }

      if (secureType === "requestuser") {
        try {
          const connection = await Interest.findOne({
            $or: [
              { sender: loggedInUserRefNo, recipient: user.registration_no, status: "accepted" },
              { sender: user.registration_no, recipient: loggedInUserRefNo, status: "accepted" }
            ]
          });

          if (connection) return user;

          user.image = await getBlurredImage();
          return user;
        } catch {
          user.image = null;
          return user;
        }
      }

      // Fallback for unknown secure image types
      user.image = await getBlurredImage();
      return user;
    })
  );
};

module.exports = { processUserImages };
