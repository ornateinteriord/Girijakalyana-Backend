const fetch = require('node-fetch');
const sharp = require('sharp');
const FormData = require('form-data');

async function blurAndGetURL(imageUrl, blurAmount = 20) {
  try {
    // 1. Download and process image
    const response = await fetch(imageUrl);
    const buffer = await sharp(await response.arrayBuffer())
      .blur(Number(blurAmount))
      .jpeg()
      .toBuffer();

    // 2. Create FormData using Node.js approach
    const formData = new FormData();
    formData.append('file', buffer, { filename: 'blurred.jpg', contentType: 'image/jpeg' });
    formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET);

    // 3. Upload to Cloudinary
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      }
    );

    const result = await uploadResponse.json();
    return result.secure_url;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

module.exports = { blurAndGetURL };