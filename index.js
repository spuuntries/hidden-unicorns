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
  stego = require("f5stegojs"),
  fileTypes = ["jpg", "jpeg", "png"],
  axios = require("axios").default,
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
      prefixAndCommand = args.shift(),
      steg = new stego(message.author.id);

    switch (args[0]) {
      case "find":
      case "detect":
      case "verify":
        // Role checking for moderators
        let staffArray = procenv.STAFFROLES.split("|");
        if (
          !message.member.roles.cache.find((r) =>
            staffArray.includes(r.name)
          ) ||
          !message.member.roles.cache.find((r) => staffArray.includes(r.id))
        )
          return await message.reply(
            "You don't have permission to use this command."
          );

        try {
          if (message.attachments.size == 0) {
            if (args.length < 2) {
              return await message.reply({
                content: "Please provide a message ID!",
                allowedMentions: { repliedUser: false },
              });
            }

            /** @type {Discord.TextChannel} */
            let messageChannel = (await message.guild.channels.fetch()).find(
              async (c) =>
                (await c.messages.fetch({ limit: 100 })).find(
                  (m) => m.id == args[0]
                )
            );

            if (!messageChannel)
              return await message.reply({
                content: "Message not found!",
                allowedMentions: { repliedUser: false },
              });

            let msg = await messageChannel.messages.fetch(args[0]);

            if (!message.attachments.size > 0)
              return await message.reply({
                content: "The message must have an attachment!",
                allowedMentions: { repliedUser: false },
              });

            let attachments = msg.attachments,
              resVerdicts = [];

            attachments.forEach(async (attachment) => {
              if (attachment.contentType.startsWith("image/")) {
                let tempAttachment = attachment.attachment,
                  unstegged;
                if (
                  isStream.isStream(attachment.attachment) ||
                  !Buffer.isBuffer(attachment.attachment)
                )
                  return;

                if (!attachment.contentType.endsWith("png"))
                  tempAttachment = await sharp(tempAttachment).png().toBuffer();

                try {
                  unstegged = Buffer.from(steg.extract(tempAttachment));
                  resVerdicts.push(unstegged);
                } catch (err) {
                  logger(`Failed to extract data from image: ${err}`);
                }
              }
            });

            let embed = new Discord.MessageEmbed();

            if (resVerdicts.length > 0) {
              embed.setColor("#00ff00");
              embed.setTitle("Verification successful!");
              embed.setDescription(
                `**The message was successfully verified!**\nThe following bits of data were recovered:\n
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
            let attachments = message.attachments,
              resVerdicts = [];

            attachments.forEach(async (attachment) => {
              if (attachment.contentType.startsWith("image/")) {
                let tempAttachment = attachment.attachment,
                  unstegged;
                if (
                  isStream.isStream(attachment.attachment) ||
                  !Buffer.isBuffer(attachment.attachment)
                )
                  return;

                if (!attachment.contentType.endsWith("png"))
                  tempAttachment = await sharp(tempAttachment).png().toBuffer();

                try {
                  unstegged = Buffer.from(steg.extract(tempAttachment));
                  resVerdicts.push(unstegged);
                } catch (err) {
                  logger(`Failed to extract data from image: ${err}`);
                }
              }
            });

            let embed = new Discord.MessageEmbed();

            if (resVerdicts.length > 0) {
              embed.setColor("#00ff00");
              embed.setTitle("Verification successful!");
              embed.setDescription(
                `**The message was successfully verified!**\nThe following bits of data were recovered:\n
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

  if (message.attachments.size > 0) {
    try {
      let attachments = message.attachments,
        resAttachments = [],
        errArray = [],
        steg = new stego(message.author.id);

      logger(`Handling attachments for ${message.url}`);
      let promise = new Promise((resolve, reject) => {
        let stegged;
        Array.from(attachments).forEach(async (a, i) => {
          let attachment = a[1];
          try {
            logger(`Handling attachment ${i + 1} of ${attachments.size}`);
            if (fileTypes.includes(attachment.contentType.split("/")[1])) {
              let tempAttachment = attachment.attachment;
              if (isStream.isStream(attachment.attachment)) {
                return logger(`Attachment ${i + 1} is a stream!`);
              }

              if (!Buffer.isBuffer(attachment.attachment)) {
                logger(
                  `Attachment ${
                    i + 1
                  } is not a buffer! \nIt's a ${typeof attachment.attachment}\nChecking if it's a URL...`
                );

                let url;
                try {
                  url = new URL(attachment.attachment);
                } catch (err) {
                  logger(`It's not a URL.`);
                }

                if (url) {
                  logger(`It's a URL!`);
                  try {
                    logger(`Attempting to download attachment ${i + 1}..`);
                    let res = await axios.get(url.href, {
                      responseType: "arraybuffer",
                    });
                    tempAttachment = res.data;
                    logger(
                      `Downloaded attachment ${
                        i + 1
                      }, is buffer: ${Buffer.isBuffer(tempAttachment)}`
                    );
                  } catch (err) {
                    logger(`Failed to get attachment: ${err}`);
                  }
                } else {
                  return;
                }
              }

              logger(
                `Checking if attachment ${i + 1} is a buffer to make sure.
Is buffer: ${Buffer.isBuffer(tempAttachment)}`
              );

              if (
                !attachment.contentType.endsWith("jpg") ||
                !attachment.contentType.endsWith("jpeg")
              ) {
                logger(`Converting attachment ${i + 1} to jpg`);
                tempAttachment = await sharp(tempAttachment)
                  .jpeg({ quality: 100 })
                  .toBuffer();
                logger(`Converted attachment ${i + 1} to jpg`);
              }

              try {
                stegged = Buffer.from(
                  steg.embed(
                    tempAttachment,
                    Buffer.from(
                      `Sent by ${message.author.username}#${message.author.discriminator} <@${message.author.id}>, ${message.url}`
                    )
                  )
                );
                logger(
                  `Stegged attachment ${i + 1}, metadata: ${JSON.stringify(
                    await sharp(stegged).metadata()
                  )}`
                );
              } catch (err) {
                logger(`Failed to embed data in attachment ${i + 1}, ${err}`);
                errArray.push(err);
              }

              try {
                let contentType = attachment.contentType.split("/")[1];
                logger(
                  `Converting attachment ${
                    i + 1
                  } back to previous type, ${contentType}`
                );
                /*
                let converted = await sharp(tempAttachment)
                  .toFormat(contentType == "jpg" ? "jpeg" : contentType)
                  .toBuffer();
                  */
                converted = stegged;
                stegged = new Discord.MessageAttachment(
                  converted,
                  `${attachment.name}`
                );
                logger(
                  `Converted attachment ${i + 1} to ${
                    (await sharp(stegged.attachment).metadata()).format
                  }`
                );
              } catch (err) {
                logger(
                  `Failed to convert attachment ${
                    i + 1
                  } back to original type, ${err}`
                );
                errArray.push(err);
              }

              resAttachments.push(stegged);
              logger(
                `Attachment ${i + 1} of ${
                  attachments.size
                } handled, metadata: ${JSON.stringify(
                  await sharp(stegged.attachment).metadata()
                )}`
              );
              if (i == attachments.size - 1) resolve(resAttachments);
            }
          } catch (err) {
            errArray.push(err);
            if (i == attachments.size - 1) reject(errArray);
          }
        });
      });

      await promise;
      if (errArray.length > 0)
        return logger(`Failed to handle attachments: ${errArray}`);
      await message.delete();

      // Make an embed to send along with the attachments
      let embed = new Discord.MessageEmbed()
        .setColor((await message.author.fetch(true)).hexAccentColor)
        .setTitle(`🦄 ${message.author.username} sent a message 🔮`)
        .setDescription(
          `${message.author.toString()} sent this message:\n"${
            message.content ? message.content : "No content"
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
    } catch (err) {
      return logger(`Failed to send message for ${message.url}, ${err}`);
    }
  }
});
