const steg = require("./steg.js");

/**
 * Find smallest equal size of possible chunks of a data
 * that can be embedded by steg.js using an exhaustive search.
 * @param {Buffer|String} base
 * @param {String} message
 * @returns {number}
 */
async function findSmallestEqualSize(base, message) {
  let divider = 2,
    found,
    result;

  do {
    let chunks;

    if (Buffer.isBuffer(base)) {
      chunks = [];
      for (let i = 0; i < base.length; i += divider) {
        chunks.push(base.slice(i, i + divider));
      }
    }

    if (typeof base == "string") {
      chunks = [];
      for (let i = 0; i < base.length; i += divider) {
        chunks.push(base.substring(i, i + divider));
      }
    }

    if (!chunks) {
      throw new Error("Base is not a buffer or a string");
    }

    let chunk = chunks[0];

    console.log(`Using chunk size ${chunk.length}`);
    try {
      res = steg.embed(chunk, message);
      found = true;
      result = divider;
      console.log(`Found smallest equal size: ${divider}`);
    } catch (e) {
      console.log(`Failed to embed message with chunk size ${divider}`);
      found = false;
      divider++;
    }
  } while (!found);

  return result;
}

module.exports = {
  findSmallestEqualSize,
};
