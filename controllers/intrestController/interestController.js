const asyncHandler = require("express-async-handler");
const Interest = require("../../models/Intrest/Intrest");
const Profile = require("../../models/profile");

// @desc    Express interest
// @route   POST /api/user/express
const expressInterest = asyncHandler(async (req, res) => {
  const { senderRegistrationNo, recipientRegistrationNo, message } = req.body;

  // Validate required fields
  if (!senderRegistrationNo || !recipientRegistrationNo) {
    return res.status(400).json({ message: "Sender and recipient are required" });
  }

  // Find sender and recipient profiles
  const [sender, recipient] = await Promise.all([
    Profile.findOne({ registration_no: senderRegistrationNo }),
    Profile.findOne({ registration_no: recipientRegistrationNo })
  ]);

  if (!sender || !recipient) {
    return res.status(404).json({ message: "Profiles not found" });
  }

  // Check for existing interest
  const existingInterest = await Interest.findOne({
    $or: [
      { sender: sender._id, recipient: recipient._id },
      { senderRegistrationNo, recipientRegistrationNo }
    ]
  });

  if (existingInterest) {
    return res.status(400).json({ 
      message: "Interest already exists",
      existingInterest 
    });
  }

  // Create new interest
  const interest = await Interest.create({
    sender: sender._id,
    recipient: recipient._id,
    senderRegistrationNo,
    recipientRegistrationNo,
    message,
    status: 'pending'
  });

  res.status(201).json(interest);
});


const getReceivedInterests = asyncHandler(async (req, res) => {
  const { recipientRegistrationNo } = req.params;

  if (!recipientRegistrationNo) {
    return res.status(400).json({ message: "Recipient registration number is required" });
  }

  const interests = await Interest.find({
    recipientRegistrationNo,
    status: 'pending'
  }).populate({
    path: 'sender',
    select: 'firstName lastName profileImg age height address registration_no'
  });

  res.status(200).json(interests);
});


// @desc    Get interest status
// @route   GET /api/user/status/:senderRegistrationNo/:recipientRegistrationNo
const getInterestStatus = asyncHandler(async (req, res) => {
  const { senderRegistrationNo, recipientRegistrationNo } = req.params;

  if (!senderRegistrationNo || !recipientRegistrationNo) {
    res.status(400);
    throw new Error("Both registration numbers are required");
  }

  const interest = await Interest.findOne({
    $or: [
      { senderRegistrationNo, recipientRegistrationNo },
      { senderRegistrationNo: recipientRegistrationNo, recipientRegistrationNo: senderRegistrationNo }
    ]
  }).populate('sender recipient'); // ✅ Corrected field names

  if (!interest) {
    return res.status(200).json({ status: "none" });
  }

  res.status(200).json({
    status: interest.status,
    interestId: interest._id,
    message: interest.message,
    senderProfile: interest.sender, // ✅ now refers to the populated Profile
    recipientProfile: interest.recipient,
    isSender: interest.senderRegistrationNo === senderRegistrationNo
  });
});


// @desc    Update interest status
// @route   PUT /api/user/interest/:id
const updateInterestStatus = asyncHandler(async (req, res) => {
  const { registration_no } = req.params; // This is senderRegistrationNo
  const { recipientRegistrationNo, status } = req.body;

  if (!registration_no || !recipientRegistrationNo || !status) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!["accepted", "rejected", "withdrawn"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  const interest = await Interest.findOneAndUpdate(
    {
      senderRegistrationNo: registration_no,
      recipientRegistrationNo,
    },
    {
      status,
      recipientViewed: status !== "withdrawn" ? false : true,
    },
    { new: true }
  );
// console.log("234567:",interest)
  if (!interest) {
    return res.status(404).json({ message: "Interest not found" });
  }

  res.status(200).json({ success: true, data: interest });
});



module.exports = {
  expressInterest,
  getInterestStatus,
  updateInterestStatus,
  getReceivedInterests
};