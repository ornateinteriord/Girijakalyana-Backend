const getCasteFilter = (req) => {
  const project = req.headers['x-project'];
  console.log("Project Header:", project);

  if (project === 'sangamsathi') {
    return { $regex: 'brahmin', $options: 'i' };
  }
  
  // Return undefined for girijakalyana to completely remove the logic
  return undefined;
};

module.exports = { getCasteFilter };
