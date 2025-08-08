const asyncHandler = require("express-async-handler");
const Interest = require("../../models/Intrest/Intrest");
const Profile = require("../../models/profile");
const profile = require("../../models/profile");
const { processUserImages } = require("../../utils/SecureImageHandler");
const { getPaginationParams } = require("../../utils/pagination");


const expressInterest = asyncHandler(async (req, res) => {
  const { sender, recipient, message } = req.body;

  if (!sender || !recipient) {
    return res.status(400).json({ message: "Sender and recipient are required" });
  }


  const [senderuser, recipientuser] = await Promise.all([
    Profile.findOne({ registration_no: sender }),
    Profile.findOne({ registration_no: recipient })
  ]);

  if (!senderuser || !recipientuser) {
    return res.status(404).json({ message: "Profiles not found" });
  }

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
  try {
    const { recipient } = req.params;
    const recipientRole = req.user.user_role;
    const loggedInUserId = req.user.ref_no;

    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: "Recipient registration number is required",
      });
    }
    const { page, pageSize } = getPaginationParams(req);
    const pendingInterests = await Interest.find({
      recipient,
      status: "pending",
    });

    const totalRecords = pendingInterests.length;

    const paginatedInterests = pendingInterests.slice(
      page * pageSize,
      (page + 1) * pageSize
    );


    const senderIds = paginatedInterests.map((i) => i.sender);


    const excludeFields = recipientRole === "FreeUser" ? "-mobile_no -email_id" : "";


    let senderProfiles = await Profile.find({
      registration_no: { $in: senderIds },
    }).select(excludeFields);


    senderProfiles = await processUserImages(senderProfiles, loggedInUserId, recipientRole);

    const populatedInterests = paginatedInterests.map((interest) => {
      const senderProfile = senderProfiles.find(
        (p) => p.registration_no === interest.sender
      );

      return {
        ...interest.toObject(),
        sender: senderProfile || null,
      };
    });

    return res.status(200).json({
      success: true,
      content: populatedInterests,
      currentPage: page,
      pageSize,
      totalRecords,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


const getSentInterests = asyncHandler(async (req, res) => {
  try {
    const { sender } = req.params;
    const senderRole = req.user.user_role;
    const loggedInUserId = req.user.ref_no;

    if (!sender) {
      return res.status(400).json({
        success: false,
        message: "Sender registration number is required",
      });
    }

    const { page, pageSize } = getPaginationParams(req);

    const sentInterests = await Interest.find({
      sender,
      status: "pending",
    });

    const totalRecords = sentInterests.length;

    const paginatedInterests = sentInterests.slice(
      page * pageSize,
      (page + 1) * pageSize
    );
    const recipientIds = paginatedInterests.map((i) => i.recipient);

    const excludeFields = senderRole === "FreeUser" ? "-mobile_no -email_id" : "";

    let recipientProfiles = await Profile.find({
      registration_no: { $in: recipientIds },
    }).select(excludeFields);

    recipientProfiles = await processUserImages(recipientProfiles, loggedInUserId, senderRole);

  
    const populatedInterests = paginatedInterests.map((interest) => {
      const recipientProfile = recipientProfiles.find(
        (p) => p.registration_no === interest.recipient
      );

      return {
        ...interest.toObject(),
        recipientdata: recipientProfile || null,
      };
    });

    return res.status(200).json({
      success: true,
      content: populatedInterests,
      currentPage: page,
      pageSize,
      totalRecords,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


const cancelInterestRequest = asyncHandler(async (req, res) => {
  try {
    const { sender, recipient } = req.body;

   
    if (!sender || !recipient) {
      res.status(400);
      throw new Error("Both sender and recipient registration numbers are required");
    }


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
  }).populate('sender recipient'); 

 

  if (!interest) {
    return res.status(200).json({ status: "none" });
   
  }
 
  res.status(200).json({
  data:{
    status: interest.status,
    interestId: interest._id,
    message: interest.message,
    senderProfile: interest.sender, 
    recipientProfile: interest.recipient,
    isSender: interest.sender === sender
  }
  });
  
});


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
  try {
    const { recipient } = req.params;
    const recipientRole = req.user.user_role;
    const loggedInUserId = req.user.ref_no;

    if (!recipient) {
      return res.status(400).json({ 
        success: false,
        message: "Recipient registration number is required"
      });
    }

    const { page, pageSize } = getPaginationParams(req);

    const acceptedInterests = await Interest.find({
      recipient,
      status: "accepted"
    });

    const totalRecords = acceptedInterests.length;
    const paginatedInterests = acceptedInterests.slice(page * pageSize, (page + 1) * pageSize);

    const senderRegistrationNos = paginatedInterests.map(i => i.sender);

    const excludeFields = recipientRole === 'FreeUser' ? '-mobile_no -email_id' : '';
    let senderProfiles = await Profile.find({
      registration_no: { $in: senderRegistrationNos }
    }).select(excludeFields);

    senderProfiles = await processUserImages(senderProfiles, loggedInUserId, recipientRole);


    const populatedInterests = paginatedInterests.map(interest => {
      const senderProfile = senderProfiles.find(
        profile => profile.registration_no === interest.sender
      );

      return {
        ...interest.toObject(),
        sender: senderProfile || null,
      };
    });

    return res.status(200).json({
      success: true,
      content: populatedInterests,
      currentPage: page,
      pageSize: pageSize,
      totalRecords: totalRecords,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});


const getInterestCounts = asyncHandler(async (req, res) => {
  const { registrationNo } = req.params;

  if (!registrationNo) {
    return res.status(400).json({ 
      message: "Registration number is required" 
    });
  }

  try {

    const [receivedCount, sentCount, acceptedCount] = await Promise.all([
     
      Interest.countDocuments({
        recipient: registrationNo,
        status: 'pending'
      }),
      
  
      Interest.countDocuments({ 
        sender: registrationNo,
        status: "pending" 
      }),

      Interest.countDocuments({
        recipient: registrationNo,
        status: "accepted"
      })
    ]);

    res.status(200).json({
      received: receivedCount,
      sent: sentCount,
      accepted: acceptedCount
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching interest counts",
      error: error.message 
    });
  }
});

const getAcceptedConnections = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const userRole = req.user.user_role;

    if (!userId) {
      return res.status(400).json({ 
        message: "User registration number is required" 
      });
    }

    // Get pagination parameters
    const { page, pageSize } = getPaginationParams(req);
    const skip = page * pageSize;

    // First get total count of accepted connections
    const totalRecords = await Interest.countDocuments({
      $or: [
        { sender: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    });

    // Get paginated connections
    const acceptedConnections = await Interest.find({
      $or: [
        { sender: userId, status: 'accepted' },
        { recipient: userId, status: 'accepted' }
      ]
    })
    .sort({ updatedAt: -1 }) // Newest first
    .skip(skip)
    .limit(pageSize);

    // Get all needed profile IDs in one go
    const profileIds = acceptedConnections.map(conn => 
      conn.sender === userId ? conn.recipient : conn.sender
    );

    // Fetch profiles with role-based field exclusion
    const excludeFields = userRole === 'FreeUser' ? '-mobile_no -email_id' : '';
    let profiles = await Profile.find({
      registration_no: { $in: profileIds }
    }).select(excludeFields);

    // Process images
    profiles = await processUserImages(profiles, req.user.ref_no, userRole);

    // Map connections with profile data
    const connections = acceptedConnections.map(connection => {
      const isSender = connection.sender === userId;
      const otherUserId = isSender ? connection.recipient : connection.sender;
      const otherUserProfile = profiles.find(profile => 
        profile.registration_no === otherUserId
      );

      return {
        ...connection.toObject(),
        profile: otherUserProfile || null,
        direction: isSender ? 'sent' : 'received',
        connectionDate: connection.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      content: connections,
      currentPage: page,
      pageSize: pageSize,
      totalRecords: totalRecords
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Error fetching connections",
      error: error.message 
    });
  }
});



module.exports = {
  expressInterest,
  getSentInterests,
  getInterestStatus,
  updateInterestStatus,
  getReceivedInterests,
  getAcceptedInterests,
  cancelInterestRequest,
  getInterestCounts,
  getAcceptedConnections

};