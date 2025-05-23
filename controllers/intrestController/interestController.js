const asyncHandler = require("express-async-handler");
const Interest = require("../../models/Intrest/Intrest");
const Profile = require("../../models/profile");
const profile = require("../../models/profile");

// @desc    Express interest
// @route   POST /api/user/express
const expressInterest = asyncHandler(async (req, res) => {
  const { sender, recipient, message } = req.body;

  // Validate required fields
  if (!sender || !recipient) {
    return res.status(400).json({ message: "Sender and recipient are required" });
  }

  // Find sender and recipient profiles
  const [senderuser, recipientuser] = await Promise.all([
    Profile.findOne({ registration_no: sender }),
    Profile.findOne({ registration_no: recipient })
  ]);

  if (!senderuser || !recipientuser) {
    return res.status(404).json({ message: "Profiles not found" });
  }

  // Check for existing interest
  const existingInterest = await Interest.findOne({
    $or: [
      { senderuser: senderuser._id, recipientuser: recipient._id },
      { sender, recipient }
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
    senderuser: senderuser._id,
    recipientuser: recipientuser._id,
    sender,
    recipient,
    message,
    status: 'pending'
  });

  res.status(201).json(interest);
});


const getReceivedInterests = asyncHandler(async (req, res) => {
  const { recipient } = req.params;

  if (!recipient) {
    return res.status(400).json({ message: "Recipient registration number is required" });
  }

  const interests = await Interest.find({
    recipient,
    status: 'pending'
  }).populate({
    path: 'sender',
    select: 'firstName lastName profileImg age height address registration_no'
  });

  res.status(200).json(interests);
});



const getSentInterests = asyncHandler(async (req, res) => {
  const { sender } = req.params;
  const senderRole = req.user.user_role;

  if (!sender) {
    res.status(400);
    throw new Error('Sender registration number is required');
  }

  const excludeFields = senderRole === 'FreeUser' ? '-mobile_no -email_id' : '';
  const allProfiles = await Profile.find().select(excludeFields);

  const interests = await Interest.find({ 
    sender,
    status: "pending" 
  });

  const populatedInterests = interests.map(interest => {
    const recipientProfile = allProfiles.find(profile => 
      profile.registration_no === interest.recipient
    );

    return {
      ...interest.toObject(), 
      recipientdata: recipientProfile || null 
    };
  });

  res.status(200).json({
    data: populatedInterests,
    totalCount: populatedInterests.length,
    totalPages: 1,
  });
});

const cancelInterestRequest = asyncHandler(async (req, res) => {
  try {
    const { sender, recipient } = req.body;

    // Validate required fields
    if (!sender || !recipient) {
      res.status(400);
      throw new Error("Both sender and recipient registration numbers are required");
    }

    // Find and delete the pending interest request
    const deletedRequest = await Interest.findOneAndDelete({
      sender,
      recipient,
      status: 'pending' // Only allow deletion of pending requests
    });

    if (!deletedRequest) {
      res.status(404);
      throw new Error("Interest request not found, already processed, or you don't have permission to cancel it");
    }

    res.status(200).json({ 
      success: true,
      message: "Interest request successfully cancelled",
      data: {
        sender: deletedRequest.sender,
        recipient: deletedRequest.recipient,
        deletedAt: new Date()
      }
    });

  } catch (error) {
     res.status(500).json({ success: false, message: error.message });
  }
});


const getInterestStatus = asyncHandler(async (req, res) => {
  const { sender, recipient } = req.params;

  if (!sender || !recipient) {
    res.status(400);
    throw new Error("Both registration numbers are required");
  }

  const interest = await Interest.findOne({
    $or: [
      { sender, recipient },
      { sender: recipient, recipient: sender }
    ]
  }).populate('sender recipient'); // ✅ Corrected field names

 

  if (!interest) {
    return res.status(200).json({ status: "none" });
   
  }
 
  res.status(200).json({
  data:{
    status: interest.status,
    interestId: interest._id,
    message: interest.message,
    senderProfile: interest.sender, // ✅ now refers to the populated Profile
    recipientProfile: interest.recipient,
    isSender: interest.sender === sender
  }
  });
  
});


// @desc    Update interest status
// @route   PUT /api/user/interest/:id
const updateInterestStatus = asyncHandler(async (req, res) => {
  const { registration_no } = req.params; // This is sender
  const { recipient, status } = req.body;

  if (!registration_no || !recipient || !status) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!["accepted", "rejected", "withdrawn"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  const interest = await Interest.findOneAndUpdate(
    {
      sender: registration_no,
      recipient,
    },
    {
      status,
      recipientViewed: status !== "withdrawn" ? false : true,
    },
    { new: true }
  );

  if (!interest) {
    return res.status(404).json({ message: "Interest not found" });
  }

  res.status(200).json({ success: true, data: interest });
});


const getAcceptedInterests = asyncHandler(async (req, res) => {
  const { recipient } = req.params;
  const recipientRole = req.user.user_role;

  if (!recipient) {
    return res.status(400).json({ 
      message: "Recipient registration number is required" 
    });
  }

  const excludeFields = recipientRole === 'FreeUser' ? '-mobile_no -email_id' : '';

  const allProfiles = await Profile.find().select(excludeFields);

  const acceptedInterests = await Interest.find({
    recipient,
    status: "accepted"
  });

  const populatedInterests = acceptedInterests.map(interest => {
    const senderProfile = allProfiles.find(profile => 
      profile.registration_no === interest.sender
    );

    return {
      ...interest.toObject(), // Convert mongoose doc to plain object
      sender: senderProfile || null // Replace sender string with profile data
    };
  });

  res.status(200).json(populatedInterests);
});




module.exports = {
  expressInterest,
  getSentInterests,
  getInterestStatus,
  updateInterestStatus,
  getReceivedInterests,
  getAcceptedInterests,
  cancelInterestRequest
};