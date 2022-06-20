const sharp = require("sharp"),
  performance = require("perf_hooks").performance;

/**
 * Split an image into smallest equal chunks.
 * @param {Buffer} image - The image to split.
 * @returns {Promise<Buffer[]>} - The chunks.
 * @example
 * const image = await sharp("./image.png").toBuffer();
 * const chunks = await split(image);
 * console.log(chunks);
 * // [ ... ]
 */
async function split(image) {
  const start = performance.now();
  let chunks = [],
    gd = (n) => {
      let i;
      for (i = 2; i <= Math.sqrt(n); i++) {
        if (n % i == 0) {
          return n / i;
        }
      }
      return 1;
    },
    metadata = await sharp(image).metadata(),
    yGD = gd(metadata.height),
    xGD = gd(metadata.width),
    yChunk = Math.floor(metadata.height / yGD),
    xChunk = Math.floor(metadata.width / xGD);

  // Divide the image into equal chunks
  for (let y = 0; y < yGD; y++) {
    for (let x = 0; x < xGD; x++) {
      let chunk = await sharp(image)
        .extract({
          left: x * xChunk,
          top: y * yChunk,
          width: xChunk,
          height: yChunk,
        })
        .toBuffer();
      chunks.push(chunk);
    }
  }

  let res = Array.from(new Set(chunks));
  console.log(
    `Split image into ${res.length} chunks in ${performance.now() - start}ms`
  );
  return res;
}

module.exports = {
  split,
};
