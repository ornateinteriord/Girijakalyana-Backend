const Register = require('../models/register.model');

// Generate unique registration number
exports.generateRegistrationNo = async () => {
  try {
    // Get the last registration
    const lastRegistration = await Register.findOne().sort({ createdAt: -1 });
    
    let newNumber;
    if (!lastRegistration) {
      newNumber = 'SGM001'; // Initial number if no registrations exist
    } else {
      // Extract the numeric part and increment
      const prefix = 'SGM';
      const lastNum = parseInt(lastRegistration.registration_no.replace(prefix, ''));
      newNumber = prefix + String(lastNum + 1);
    }
    
    return newNumber;
  } catch (error) {
    console.error('Error generating registration number:', error);
    throw error;
  }
};