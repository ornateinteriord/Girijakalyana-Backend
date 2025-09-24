require("dotenv").config();
const projectName = process.env.PROJECT_NAME
const URL = process.env.FRONTEND_URL
const getWelcomeMessage = (userDetails, newRefNo) => {
  const welcomeSubject = `Welcome to ${projectName}!`;
  const welcomeMessage = `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;margin-bottom: 100px;">
      <h2 style="color: #4A148C;">Welcome to <span style="color: #D81B60;">${projectName}</span>!</h2>
      
      <p>Dear <strong>${userDetails.first_name || ''}</strong>,</p>
      
      <p>Thank you for registering with <strong>${projectName}</strong>.</p>
      
      <p>Your registration number is 
        <span style="background-color: #E1BEE7; padding: 4px 8px; border-radius: 4px;">
          <strong>${newRefNo}</strong>
        </span>.
      </p>
      
      <p style="margin-top: 20px;">
        Your profile is currently under the verification process. Once the verification is complete, we will notify you via email.
      </p>
      
      <p>We are excited to have you as a member!</p>

      <p style="margin-top: 30px;">
        Best regards,<br/>
        <strong>Team ${projectName}</strong>
      </p>
    </div>
  `;
  return {welcomeMessage, welcomeSubject};
}

const getActiveMessage = (userDetails) => {
  const activatedSubject = `Your ${projectName} Profile is Now Active!`;

  const activatedMessage = `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; margin-bottom: 100px;">
      <h2 style="color: #388E3C;">Congratulations, <span style="color: #D81B60;">${userDetails.first_name || ''}</span>!</h2>

      <p>Your profile has been successfully <strong>verified and activated</strong>.</p>

      <p>You can now log in to your ${projectName} account and start exploring matches.</p>

      <p style="margin: 20px 0;">
        <a href="${URL}" target="_blank"
          style="display: inline-block; padding: 10px 20px; background-color: #4A148C; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Click here to Login
        </a>
      </p>

      <p>If you have any questions or need help, feel free to reply to this email.</p>

      <p style="margin-top: 30px;">
        Best regards,<br/>
        <strong>Team ${projectName}</strong>
      </p>
    </div>
  `;
  return { activatedMessage, activatedSubject };
}

const getResetPasswordMessage = (newOtp) => {
  const resetPasswordSubject = `${projectName} - Password Recovery`;

  const resetPasswordDescription = `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;margin-bottom: 100px;">
      <h2 style="color: #D32F2F;">Password Reset Request</h2>

      <p>Dear Member,</p>

      <p>Your OTP for resetting your password is:</p>

      <p style="font-size: 20px; font-weight: bold; background-color: #FFF3E0; padding: 10px 15px; display: inline-block; border-radius: 5px;">
        ${newOtp}
      </p>

      <p>Please use this OTP to proceed with resetting your password.<br> <strong style="color: #D32F2F;">Valid for only 3 minutes.</strong></p>

      <p style="color: #D32F2F;"><strong>Note:</strong> Do not share this OTP with anyone.</p>

      <p style="margin-top: 30px;">
        Best regards,<br/>
        <strong>Team ${projectName}</strong>
      </p>
    </div>
  `;
  return { resetPasswordDescription, resetPasswordSubject };
}

const getDeactiveMessage = (userDetails) => {
  const deactivatedSubject = `Your ${projectName} Profile is Deactivated`;
  const deactivatedMessage = `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; margin-bottom: 100px;">
      <h2 style="color: #D32F2F;">Profile Deactivated</h2>
      <p>Dear <strong>${userDetails.first_name || ''}</strong>,</p>
      <p>Your profile has been <strong>deactivated</strong> on ${projectName}.</p>
      <p>If you believe this was a mistake or have any questions, please contact our support team. Feel free to reply to this email.</p>
      <p style="margin-top: 30px;">
        Best regards,<br/>
        <strong>Team ${projectName}</strong>
      </p>
    </div>
  `;
  return { deactivatedMessage, deactivatedSubject };
};

const getImageVerifiedMessage = (userDetails) => {
  const imageVerifiedSubject = `Your ${projectName} Profile Image is Verified`;
  const imageVerifiedMessage = `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; margin-bottom: 100px;">
      <h2 style="color: #388E3C;">Image Verified</h2>
      <p>Dear <strong>${userDetails.first_name || ''}</strong>,</p>
      <p>Your profile image has been successfully <strong>verified</strong> on ${projectName}.</p>
      <p>You can now control who can see your profile picture and update your <strong>privacy settings</strong> in your profile section.</p>
      <p style="margin-top: 30px;">
        Best regards,<br/>
        <strong>Team ${projectName}</strong>
      </p>
    </div>
  `;
  return { imageVerifiedMessage, imageVerifiedSubject };
};


const getPostResetPasswordMessage = () => {
  const resetConfirmSubject = `${projectName} - Password Reset Successful`;

  const resetConfirmMessage = `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; margin-bottom: 100px;">
      <h2 style="color: #388E3C;">Password Reset Successful</h2>

      <p>Dear Member,</p>

      <p>Your password has been successfully <strong>reset</strong>.</p>
      
      <p>You can now log in to your ${projectName} account using your new password.</p>

      <p style="margin: 20px 0;">
        <a href="${URL}" target="_blank"
          style="display: inline-block; padding: 10px 20px; background-color: #4A148C; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Click here to Login
        </a>
      </p>

      <p>If you did not initiate this request, please contact our support team immediately.</p>

      <p style="margin-top: 30px;">
        Best regards,<br/>
        <strong>Team ${projectName}</strong>
      </p>
    </div>
  `;
  return { resetConfirmMessage, resetConfirmSubject };
};

// New email template for user payment success notification
const getUserPaymentSuccessMessage = (userDetails, planType, expiryDate, orderId, amount) => {
  const paymentSuccessSubject = `Your ${projectName} ${planType} Plan Payment Successful!`;

  const paymentSuccessMessage = `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; margin-bottom: 100px;">
      <h2 style="color: #388E3C;">Payment Successful! 🎉</h2>

      <p>Dear <strong>${userDetails.first_name || ''} ${userDetails.last_name || ''}</strong>,</p>

      <p>Thank you for choosing the <strong>${planType}</strong> plan on ${projectName}!</p>

      <p>Your payment of <strong>₹${amount}</strong> has been successfully processed.</p>

      <div style="background-color: #E8F5E9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #2E7D32; margin-top: 0;">Payment Details</h3>
        <p><strong>Plan:</strong> ${planType}</p>
        <p><strong>Amount Paid:</strong> ₹${amount}</p>
        <p><strong>Expiry Date:</strong> ${expiryDate}</p>
      </div>

      <p>You can now enjoy all the premium features of your ${planType} plan until <strong>${expiryDate}</strong>.</p>

      <p style="margin: 20px 0;">
        <a href="${URL}/user/userDashboard" target="_blank"
          style="display: inline-block; padding: 12px 24px; background-color: #4A148C; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Go to Your Dashboard
        </a>
      </p>

      <p>If you have any questions or need assistance, feel free to reply to this email.</p>

      <p style="margin-top: 30px;">
        Best regards,<br/>
        <strong>Team ${projectName}</strong>
      </p>
    </div>
  `;
  return { paymentSuccessMessage, paymentSuccessSubject };
};

// New email template for promoter payment success notification
const getPromoterPaymentSuccessMessage = (promoterDetails, userDetails, orderId, amount) => {
  const promoterPaymentSuccessSubject = `Someone Used Your Promocode on ${projectName}!`;

  const promoterPaymentSuccessMessage = `
    <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; margin-bottom: 100px;">
      <h2 style="color: #388E3C;">Thank You for Referring a User! 🎉</h2>

      <p>Dear <strong>${promoterDetails.promoter_name || ''}</strong>,</p>

      <p>Great news! A user has successfully used your promocode on ${projectName}.</p>

      <p>Thank you for referring them to our platform. As a token of appreciation, you've earned <strong>₹100</strong>!</p>

      <div style="background-color: #E3F2FD; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1976D2; margin-top: 0;">Referral Details</h3>
        <p><strong>User Name:</strong> ${userDetails.first_name || ''} ${userDetails.last_name || ''}</p>
        <p><strong>User Email:</strong> ${userDetails.email_id || ''}</p>
        <p><strong>Amount Earned:</strong> ₹100</p>
      </div>

      <p>The amount will be credited to your account as per our payment schedule.</p>

      <p>Keep sharing your promocode and earning more!</p>

      <p style="margin: 20px 0;">
        <a href="${URL}/promoter/dashboard" target="_blank"
          style="display: inline-block; padding: 12px 24px; background-color: #4A148C; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Go to Promoter Dashboard
        </a>
      </p>

      <p>If you have any questions or need assistance, feel free to reply to this email.</p>

      <p style="margin-top: 30px;">
        Best regards,<br/>
        <strong>Team ${projectName}</strong>
      </p>
    </div>
  `;
  return { promoterPaymentSuccessMessage, promoterPaymentSuccessSubject };
};

module.exports = {
  getWelcomeMessage,
  getActiveMessage,
  getResetPasswordMessage,
  getDeactiveMessage,
  getImageVerifiedMessage,
  getPostResetPasswordMessage,
  getUserPaymentSuccessMessage,
  getPromoterPaymentSuccessMessage
};
