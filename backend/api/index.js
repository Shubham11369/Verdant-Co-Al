let appInstance;

try {
  appInstance = require("../dist/app").app;
} catch {
  try {
    appInstance = require("../src/app").app;
  } catch (err) {
    console.error("[Vercel Handler] Failed to import app instance:", err);
  }
}

function handler(req, res) {
  if (!appInstance) {
    try {
      appInstance = require("../dist/app").app;
    } catch {
      try {
        appInstance = require("../src/app").app;
      } catch (err) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        return res.end(
          JSON.stringify({
            error: "Internal Server Error",
            message: "Verdant backend failed to load module.",
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
