const f5stego = require("f5stegojs"),
  steggy = require("steggy"),
  sharp = require("sharp"),
  dotenv = require("dotenv"),
  StegCloak = require("stegcloak"),
  crypto = require("crypto");

dotenv.config();

/**
 * Encrypt a message using AES-256
 * @param {String} message - The message to encrypt.
 * @param {String} key - The key to use for encryption.
 * @returns {String} - The encrypted message.
 */
function encrypt(message, key) {
  let iv = crypto.randomBytes(16),
    keySalt = crypto.randomBytes(16),
    keyToUse = crypto.scryptSync(key, keySalt, 32),
    cipher = crypto.createCipheriv("aes-256-cbc", keyToUse, iv),
    encrypted = cipher.update(message, "utf8", "hex");
  encrypted += cipher.final("hex");
  return (
    Buffer.from(iv).toString("hex") +
    Buffer.from(keySalt).toString("hex") +
    encrypted
  );
}

/**
 * Decrypt a message using AES-256
 * @param {String} message - The message to decrypt.
 * @param {String} key - The key to use for decryption.
 * @returns {String} - The decrypted message.
 */
function decrypt(message, key) {
  let iv = Buffer.from(message.substring(0, 32), "hex"),
    keySalt = Buffer.from(message.substring(32, 64), "hex"),
    encrypted = message.substring(64),
    keyToUse = crypto.scryptSync(key, keySalt, 32),
    decipher = crypto.createDecipheriv("aes-256-cbc", keyToUse, iv),
    decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * @description Embeds a message into an artwork.
 * @param {String|Uint8Array|Buffer} cover - The cover data.
 * @param {String} message - The message to embed.
 * @param {Object} [options] - Optional settings.
 * @param {String} [options.shuffleKey] - Key used for shuffling in the algoritm. Ignored if the algorithm doesn't support shuffling.
 * @param {String} [options.encryptionKey] - Encryption key for encrypting the message.
 * @returns {Promise<String|Uint8Array|Buffer>} - The embedded message.
 */
async function embed(cover, message, options = {}) {
  let coverData = cover,
    stegged;

  if (!options) {
    var options = {};
  }

  if (options) {
    if (options.encryptionKey) {
      message = encrypt(message, options.encryptionKey);
    }
  }

  if (cover instanceof Uint8Array || Buffer.isBuffer(cover)) {
    if (cover instanceof Uint8Array) {
      coverData = Buffer.from(cover);
    }

    if (Buffer.isBuffer(cover)) {
      coverData = cover;
    }

    try {
      coverData = (await sharp(coverData).metadata())
        ? sharp(coverData)
        : coverData;
    } catch (e) {
      coverData = coverData;
    }
  }

  if (coverData instanceof sharp) {
    let bufferedMessage = Buffer.from(message);
    switch ((await coverData.metadata()).format) {
      case "jpeg":
        let stego = new f5stego(
          options.shuffleKey
            ? options.shuffleKey
            : process.env.shuffleKey
            ? process.env.shuffleKey
            : "key"
        );
        stegged = await coverData.toBuffer();
        stegged = stego.embed(stegged, bufferedMessage);
        stegged = Buffer.from(stegged);
        break;
      case "png":
        stegged = await coverData.toBuffer();
        stegged = steggy.conceal()(stegged, message);
        break;
    }
  }

  if (typeof coverData == "string") {
    let stegcloak = new StegCloak(false, true);
    stegged = stegcloak.hide(message, "", coverData);
  }

  return stegged;
}

/**
 * @description Extracts a message from an artwork.
 * @param {String|Uint8Array|Buffer} cover - The cover data.
 * @param {Object} [options] - Optional settings.
 * @param {String} [options.shuffleKey] - Key used for shuffling in the algoritm. Ignored if the algorithm doesn't support shuffling.
 * @param {String} [options.encryptionKey] - Encryption key for decrypting the message.
 * @returns {Promise<String|Buffer>} - The extracted message.
 */
async function extract(cover, options = {}) {
  let coverData = cover,
    message;

  if (!options) {
    var options = {};
  }

  if (cover instanceof Uint8Array || Buffer.isBuffer(cover)) {
    if (cover instanceof Uint8Array) {
      coverData = Buffer.from(cover);
    }

    if (Buffer.isBuffer(cover)) {
      coverData = cover;
    }
  }

  if (Buffer.isBuffer(coverData)) {
    switch ((await sharp(coverData).metadata()).format) {
      case "jpeg":
        message = coverData;
        let stego = new f5stego(
          options.shuffleKey
            ? options.shuffleKey
            : process.env.shuffleKey
            ? process.env.shuffleKey
            : "key"
        );
        message = stego.extract(message);
        message = Buffer.from(message);
        break;
      case "png":
        message = coverData;
        message = steggy.reveal()(message);
        break;
    }
  }

  if (typeof coverData == "string") {
    let stegcloak = new StegCloak(false, true);
    message = stegcloak.reveal(coverData);
  }

  if (options) {
    if (options.encryptionKey) {
      message = decrypt(message, options.encryptionKey);
    }
  }

  return message;
}

module.exports = {
  embed,
  extract,
  utils: {
    encrypt,
    decrypt,
  },
};
