// Vercel Serverless Function
const app = require('../backend/server-firebase');

// Export as Vercel function
module.exports = (req, res) => {
  return app(req, res);
};
