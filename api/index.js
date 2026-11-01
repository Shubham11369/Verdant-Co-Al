let appInstance;

try {
  appInstance = require("./backend/dist/app").app;
} catch {
  try {
    appInstance = require("./backend/src/app").app;
  } catch (err) {
    console.error("[Root Vercel Handler] Failed to import app:", err);
  }
}

function handler(req, res) {
  if (!appInstance) {
    try {
      appInstance = require("./backend/dist/app").app;
    } catch {
      try {
        appInstance = require("./backend/src/app").app;
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        return res.end(
          JSON.stringify({
            error: "Internal Server Error",
            message: "Root handler failed to load app module.",
            details: String(err),
          }),
        );
      }
    }
  }

  return appInstance(req, res);
}

module.exports = handler;
module.exports.default = handler;
