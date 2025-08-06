const UAParser = require('ua-parser-js');

const detectPlatform = (userAgent = '') => {
  const parser = new UAParser(userAgent);
  const deviceType = parser.getDevice().type || 'desktop'; // "mobile", "tablet", or undefined
  const os = parser.getOS().name || 'Unknown OS';

  const platformType = deviceType === 'mobile' || deviceType === 'tablet' ? 'mobile' : 'desktop';

  return `${platformType} (${os})`;
};

module.exports = {
  detectPlatform,
}