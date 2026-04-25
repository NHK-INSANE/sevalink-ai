const crypto = require("crypto");

/**
 * Generates a unique hexadecimal ID.
 * @param {number} length - Number of digits (default 8).
 * @returns {string} - Capitalized Hex ID.
 */
function generateHexId(length = 8) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

module.exports = { generateHexId };
