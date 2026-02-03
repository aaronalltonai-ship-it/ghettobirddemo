const os = require("os");

const getAllowedDevOrigins = () => {
  const origins = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://6e141ff792e4.ngrok-free.app",
    "http://6e141ff792e4.ngrok-free.app",
  ]);
  const interfaces = os.networkInterfaces();

  Object.values(interfaces).forEach((entries) => {
    if (!entries) {
      return;
    }
    entries.forEach((entry) => {
      if (entry.family === "IPv4" && !entry.internal) {
        origins.add(`http://${entry.address}:3000`);
      }
    });
  });

  return Array.from(origins);
};

/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
};

module.exports = nextConfig;
