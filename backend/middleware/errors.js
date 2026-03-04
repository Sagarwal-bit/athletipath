function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFound(req, res) {
  return res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = err.status || 500;
  const message = err.expose ? err.message : "Internal server error";
  return res.status(status).json({ error: message });
}

module.exports = {
  asyncHandler,
  notFound,
  errorHandler,
};
