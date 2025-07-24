
function getPaginationParams(req) {
  let page = parseInt(req.body.page, 10);
  let pageSize = parseInt(req.body.pageSize, 10);
  if (isNaN(page) || page < 0) page = 0;
  if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
  return { page, pageSize };
}

module.exports = { getPaginationParams };
