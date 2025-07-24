const mongoose = require('mongoose');

const BlurredImagesSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  blurredImage : { type: String, required: true },
}, { timestamps: true, collection: "blurredImages" });

const BlurredImages = mongoose.model("blurredImages", BlurredImagesSchema);
module.exports = BlurredImages;