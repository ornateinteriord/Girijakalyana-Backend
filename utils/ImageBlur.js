const fetch = require('node-fetch');
const sharp = require('sharp');
const FormData = require('form-data');

async function blurAndGetURL(imageUrl,username, blurAmount = 20) {
  try {
    // 1. Download and process image
    const response = await fetch(imageUrl);
    const buffer = await sharp(await response.arrayBuffer())
      .blur(Number(blurAmount))
      .jpeg()
      .toBuffer();

    const authResponse = await fetch(`${process.env.BACKEND_URL}/image-kit-auth`);
    const { signature, expire, token } = await authResponse.json();

   // 3. Create FormData for ImageKit
    const formData = new FormData();
    formData.append('file', buffer, { filename: `${username}.jpg`, contentType: 'image/jpeg' });
    formData.append('fileName', `${username}.jpg`); // must have extension
    formData.append('publicKey', process.env.IMAGEKIT_PUBLIC_KEY);
    formData.append('signature', signature);
    formData.append('expire', expire);
    formData.append('token', token);
    formData.append('folder', '/blurred-profile-images');


    // 3. Upload to imagekit
    const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

      const result = await uploadResponse.json();

    if (!uploadResponse.ok) {
      throw new Error(result.message || 'Image upload failed');
    }

    return result.url;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

module.exports = { blurAndGetURL };