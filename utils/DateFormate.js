// utils/DateFormate.js
const moment = require("moment");

const FormatDate = (dateString) => {
  const acceptedFormats = [
    "DD-MM-YYYY", 
    "MM/DD/YYYY", 
    "YYYY-MM-DD", 
    "MM-DD-YYYY", 
    "DD/MM/YYYY", 
    "YYYY/MM/DD",
    "DD.MM.YYYY", 
    "DD MM YYYY",
    "YYYY-MM-DDTHH:mm:ss.SSSZ"  
  ];
  
  const date = moment(dateString, acceptedFormats, true);
  
  if (!date.isValid()) {
    throw new Error(`Invalid date: ${dateString}. Accepted formats include: DD-MM-YYYY, MM/DD/YYYY, etc.`);
  }
  
  // Return just the formatted string instead of an object
  return date.format("MM/DD/YYYY");
};

module.exports = { FormatDate };