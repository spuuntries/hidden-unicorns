require("dotenv").config();
var isStream;
const procenv = process.env,
  Discord = require("discord.js"),
  client = new Discord.Client({
    intents: [
      "GUILDS",
      "GUILD_MEMBERS",
      "GUILD_MESSAGES",
      "GUILD_MESSAGE_REACTIONS",
      "DIRECT_MESSAGES",
      "DIRECT_MESSAGE_REACTIONS",
    ],
  }),
  sharp = require("sharp"),
  fileTypes = ["jpg", "jpeg", "png"],
  axios = require("axios").default,
  fs = require("fs"),
  crypto = require("crypto"),
  steg = require("./steg.js"),
  pkg = require("./package.json");

(async () => {
  isStream = await import("is-stream");
})();

/**
 * Logger function.
 * @param {string} message - The message to log.
 * @returns {void}
 */
function logger(message) {
  console.log(`${new Date()} [${pkg.name}] ${message}`);
}

var contentChannels = procenv.CHANNELS.split("|");

function login() {
  client.login(procenv.TOKEN).catch((err) => {
    logger(`Failed to login: ${err}, retrying in 5 seconds...`);
    setTimeout(login, 5000);
  });
}

login();

client.on("ready", () => {
  logger(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || message.channel.type != "GUILD_TEXT") return;

  if (message.content.startsWith(`${procenv.PREFIX}unicorn`)) {
    let args = message.content
        .toLowerCase()
        .trim()
        .slice(`${procenv.PREFIX}unicorn`.length)
        .split(/ +/g),
      prefixAndCommand = args.shift();

    switch (args[0]) {
      case "find":
      case "detect":
      case "verify":
        // Role checking for moderators
        let staffArray = procenv.STAFFROLES.split("|");
        if (
          !(await message.member.fetch()).roles.cache.find((r) =>
            staffArray.includes(r.name)
          ) &&
          !(await message.member.fetch()).roles.cache.find((r) =>
            staffArray.includes(r.id)
          )
        )
          return await message.reply(
            "You don't have permission to use this command."
          );

        try {
          if (message.attachments.size == 0) {
            if (args.length < 2) {
              return await message.reply({
                content: "Please provide the channel ID of the message!",
                allowedMentions: {
                  repliedUser: false,
                },
              });
            }

            if (args.length < 3) {
              return await message.reply({
                content: "Please provide a message ID!",
                allowedMentions: { repliedUser: false },
              });
            }

            if (
              !(await message.guild.channels.fetch()).find(
                (c) => c.id == args[1]
              )
            )
              return await message.reply({
                content: "Please provide a valid channel ID!",
                allowedMentions: {
                  repliedUser: false,
                },
              });

            let msg = await message.channel.messages.fetch(args[2]);

            let attachments = msg.attachments,
              resVerdicts = [],
              errArray = [];

            let promise = new Promise((resolve, reject) => {
              Array.from(attachments).forEach(async (a, i) => {
                let attachment = await axios.get(a[1].url, {
                  responseType: "arraybuffer",
                });
                if (fileTypes.find((f) => a[1].contentType.includes(f))) {
                  try {
                    let extracted = await steg.extract(attachment.data, {
                      encryptionKey: (() => {
                        // Check if encryption credentials are set in the env vars,
                        // If not, generate any of the missing ones and set them in a plaintext file
                        if (!fs.existsSync("./encryption.txt")) {
                          let encryptionKey = crypto
                            .randomBytes(32)
                            .toString("hex");
                          fs.writeFileSync("./encryption.txt", encryptionKey);
                          return encryptionKey;
                        }
                        return fs.readFileSync("./encryption.txt").toString();
                      })(),
                    });
                    if (
                      extracted.toString() ==
                      `Uploaded by ${msg.author.id} in ${msg.channel.id} at ${msg.createdAt}: ${msg.url}`
                    )
                      resVerdicts.push(true);
                    else resVerdicts.push(false);
                  } catch (err) {
                    errArray.push(err);
                    resVerdicts.push(false);
                  }
                }
                if (i == attachments.size - 1 && errArray.length > 0)
                  logger(errArray);
                if (i == attachments.size - 1) resolve(resVerdicts);
              });
            });

            await promise;
            let embed = new Discord.MessageEmbed(),
              steggedContent;

            if (message.content.split(" ").join("\n").split("\n").length > 2) {
              steggedContent = await steg.extract(message.content, {
                encryptionKey: (() => {
                  // Check if encryption credentials are set in the env vars,
                  // If not, generate any of the missing ones and set them in a plaintext file
                  if (!fs.existsSync("./encryption.txt")) {
                    let encryptionKey = crypto.randomBytes(32).toString("hex");
                    fs.writeFileSync("./encryption.txt", encryptionKey);
                    return encryptionKey;
                  }
                  return fs.readFileSync("./encryption.txt").toString();
                })(),
              });
            }

            if (resVerdicts.length > 0 || steggedContent) {
              embed.setColor("#00ff00");
              embed.setTitle("Verification successful!");
              embed.setDescription(
                `**The message was successfully verified!**\nThe following verdicts were recovered:\n
Content: ${steggedContent ? steggedContent : "false"}\n
${resVerdicts.map((v, i) => `${i + 1}.) ${v}`).join("\n")}`
              );
            } else {
              embed.setColor("#ff0000");
              embed.setTitle("Verification failed!");
              embed.setDescription(
                `**The message was not verified!**\nIt doesn't have any unicorns!`
              );
            }

            embed
              .setAuthor({
                name: `Found unicorns!`,
                iconURL: client.user.displayAvatarURL(),
              })
              .setTimestamp();

            return await message.reply({
              embeds: [embed],
              allowedMentions: { repliedUser: false },
            });
          } else {
            let msg = message;

            let attachments = msg.attachments,
              resVerdicts = [],
              errArray = [];

            let promise = new Promise((resolve, reject) => {
              Array.from(attachments).forEach(async (a, i) => {
                let attachment = await axios.get(a[1].url, {
                  responseType: "arraybuffer",
                });
                if (fileTypes.find((f) => a[1].contentType.includes(f))) {
                  try {
                    let extracted = await steg.extract(attachment.data, {
                      encryptionKey: (() => {
                        // Check if encryption credentials are set in the env vars,
                        // If not, generate any of the missing ones and set them in a plaintext file
                        if (!fs.existsSync("./encryption.txt")) {
                          let encryptionKey = crypto
                            .randomBytes(32)
                            .toString("hex");
                          fs.writeFileSync("./encryption.txt", encryptionKey);
                          return encryptionKey;
                        }
                        return fs.readFileSync("./encryption.txt").toString();
                      })(),
                    });
                    if (
                      extracted.toString() ==
                      `Uploaded by ${msg.author.id} in ${msg.channel.id} at ${msg.createdAt}: ${msg.url}`
                    )
                      resVerdicts.push(true);
                    else resVerdicts.push(false);
                  } catch (err) {
                    errArray.push(err);
                    resVerdicts.push(false);
                  }
                }
                if (i == attachments.size - 1 && errArray.length > 0)
                  logger(errArray);
                if (i == attachments.size - 1) resolve(resVerdicts);
              });
            });

            await promise;
            let embed = new Discord.MessageEmbed(),
              steggedContent;

            if (message.content.split(" ").join("\n").split("\n").length > 2) {
              steggedContent = await steg.extract(message.content, {
                encryptionKey: (() => {
                  // Check if encryption credentials are set in the env vars,
                  // If not, generate any of the missing ones and set them in a plaintext file
                  if (!fs.existsSync("./encryption.txt")) {
                    let encryptionKey = crypto.randomBytes(32).toString("hex");
                    fs.writeFileSync("./encryption.txt", encryptionKey);
                    return encryptionKey;
                  }
                  return fs.readFileSync("./encryption.txt").toString();
                })(),
              });
            }

            if (resVerdicts.length > 0 || steggedContent) {
              embed.setColor("#00ff00");
              embed.setTitle("Verification successful!");
              embed.setDescription(
                `**The message was successfully verified!**\nThe following verdicts were recovered:\n
Content: ${steggedContent ? steggedContent : "false"}\n
${resVerdicts.map((v, i) => `${i + 1}.) ${v}`).join("\n")}`
              );
            } else {
              embed.setColor("#ff0000");
              embed.setTitle("Verification failed!");
              embed.setDescription(
                `**The message was not verified!**\nIt doesn't have any unicorns!`
              );
            }

            embed
              .setAuthor({
                name: `Found unicorns!`,
                iconURL: client.user.displayAvatarURL(),
              })
              .setTimestamp();

            return await message.reply({
              embeds: [embed],
              allowedMentions: { repliedUser: false },
            });
          }
        } catch (err) {
          logger(`Failed to verify message for ${message.url}, ${err}`);
          return await message.reply({
            content: "Failed to verify message!",
            allowedMentions: { repliedUser: false },
          });
        }

      case "help":
        return await message.reply({
          content: `🔮 **Help finding unicorns** 🦄
🦄 Hidden Unicorns 🦄 are steganographic watermarks that are hidden in artworks.
They are designed to be used as a first line of defense for artistic rights of an artwork posted here.

__Want to find a unicorn?__ 🔮
Find an artwork that's been reposted by the bot with an embed that has the 🦄 emote in it, 
then verify the existence of a unicorn in the attachments.

Either of these commands will find unicorns in a message:
\`${procenv.PREFIX}unicorn find <message id>\`
\`${procenv.PREFIX}unicorn detect <message id>\`
\`${procenv.PREFIX}unicorn verify <message id>\`

You can also find unicorns in an attachment!
Do any of the above commands with an attachment in the message.`,
          allowedMentions: { repliedUser: false },
        });
    }
  }

  if (!contentChannels.includes(message.channel.id)) return;

  let steggedMessage,
    resAttachments = [];
  if (message.attachments.size > 0) {
    let attachments = message.attachments,
      errArray = [];

    logger(`Handling attachments for ${message.url}`);
    let promise = new Promise((resolve, reject) => {
      Array.from(attachments).forEach(async (a, i) => {
        let attachment = await axios.get(a[1].url, {
          responseType: "arraybuffer",
        });
        if (fileTypes.find((f) => a[1].contentType.includes(f))) {
          try {
            let stegged = await steg.embed(
              attachment.data,
              `Uploaded by ${message.author.id} in ${message.channel.id} at ${message.createdAt}: ${message.url}`,
              {
                encryptionKey: (() => {
                  // Check if encryption credentials are set in the env vars,
                  // If not, generate any of the missing ones and set them in a plaintext file
                  if (!fs.existsSync("./encryption.txt")) {
                    let encryptionKey = crypto.randomBytes(32).toString("hex");
                    fs.writeFileSync("./encryption.txt", encryptionKey);
                    return encryptionKey;
                  }
                  return fs.readFileSync("./encryption.txt").toString();
                })(),
              }
            );
            resAttachments.push(stegged);
          } catch (error) {
            errArray.push(error);
          }
        }
        if (i == attachments.size - 1 && errArray.length > 0) resolve(errArray);
        if (i == attachments.size - 1) resolve(resAttachments);
      });
    });

    await promise;
    if (errArray.length > 0)
      return logger(`Failed to handle attachments: ${errArray}`);
  }

  if (message.content.split(" ").join("\n").split("\n").length > 2)
    steggedMessage = await steg.embed(
      message.content,
      `Uploaded by ${message.author.id} in ${message.channel.id} at ${message.createdAt}: ${message.url}`,
      {
        encryptionKey: (() => {
          // Check if encryption credentials are set in the env vars,
          // If not, generate any of the missing ones and set them in a plaintext file
          if (!fs.existsSync("./encryption.txt")) {
            let encryptionKey = crypto.randomBytes(32).toString("hex");
            fs.writeFileSync("./encryption.txt", encryptionKey);
            return encryptionKey;
          }
          return fs.readFileSync("./encryption.txt").toString();
        })(),
      }
    );

  await message.delete();

  // Make an embed to send along with the attachments
  let embed = new Discord.MessageEmbed()
    .setColor((await message.author.fetch(true)).hexAccentColor)
    .setTitle(`🦄 ${message.author.username} sent a message 🔮`)
    .setDescription(
      `${message.author.toString()} sent this message:\n"${
        typeof steggedMessage == "string"
          ? steggedMessage
          : message.content
          ? message.content
          : "No content"
      }"`
    )
    .setAuthor({
      name: message.author.username,
      iconURL: message.author.displayAvatarURL(),
    })
    .setTimestamp();

  try {
    return await message.channel.send({
      embeds: [embed],
      files: resAttachments,
    });
  } catch (err) {
    return logger(`Failed to send embed for ${message.url}, ${err}`);
  }
});
