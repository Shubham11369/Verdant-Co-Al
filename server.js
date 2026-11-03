const path = require("path");
const fs = require("fs");

const distPath = path.join(__dirname, "backend/dist/index.js");

if (fs.existsSync(distPath)) {
  require(distPath);
} else {
  try {
    require("child_process").execSync("npm run build:backend", { stdio: "inherit" });
    require(distPath);
  } catch (err) {
    console.error("[Root Server] Failed to build or start backend:", err);
    process.exit(1);
  }
}
