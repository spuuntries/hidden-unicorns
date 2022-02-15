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
  steg = new stego(procenv.F5KEY),
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
                let tempAttachment = attachment.attachment;
                if (
                  isStream.isStream(attachment.attachment) ||
                  !Buffer.isBuffer(attachment.attachment)
                )
                  return;

                if (!attachment.contentType.endsWith("png"))
                  tempAttachment = await sharp(tempAttachment).png().toBuffer();

                /** @type {Buffer} */
                let stegged = steggy.reveal(tempAttachment);

                resVerdicts.push(stegged);
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
                `**The message was not verified!**\nThe message was not encrypted with the unicorn!`
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
                let tempAttachment = attachment.attachment;
                if (
                  isStream.isStream(attachment.attachment) ||
                  !Buffer.isBuffer(attachment.attachment)
                )
                  return;

                if (
                  !attachment.contentType.endsWith("jpeg") ||
                  !attachment.contentType.endsWith("jpg")
                )
                  tempAttachment = await sharp(tempAttachment)
                    .jpeg()
                    .toBuffer();

                try {
                  let stegged = Buffer.from(steg.extract(tempAttachment));
                } catch (err) {
                  logger(`Failed to extract data from image: ${err}`);
                }

                resVerdicts.push(stegged);
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
                `**The message was not verified!**\nThe message was not encrypted with the unicorn!`
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
        resAttachments = [];

      let promiseWaitForAttachments = new Promise((resolve, reject) => {
        try {
          attachments.forEach(async (attachment, i) => {
            if (attachment.contentType.startsWith("image/")) {
              let tempAttachment = attachment.attachment;
              if (
                isStream.isStream(attachment.attachment) ||
                !Buffer.isBuffer(attachment.attachment)
              )
                return;

              if (!attachment.contentType.endsWith("png"))
                tempAttachment = await sharp(tempAttachment).png().toBuffer();

              /** @type {Buffer} */
              let stegged = steggy.conceal()(
                tempAttachment,
                `Sent by ${message.author.username}#${message.author.discriminator} in ${message.guild.name} (#${message.channel.name})`
              );

              resAttachments.push(stegged);
              if (i == attachments.size - 1) resolve(resAttachments);
            }
          });
        } catch (err) {
          reject(err);
        }
      });

      logger(`Processing attachments for ${message.url}`);
      await Promise.all([promiseWaitForAttachments]);
      logger(`Created ${resAttachments.length} attachments for ${message.url}`);

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
        await message.channel.send({
          embeds: [embed],
          files: resAttachments,
        });
      } catch (err) {
        logger(`Failed to send embed for ${message.url}, ${err}`);
      }
    } catch (err) {
      logger(`Failed to send message for ${message.url}, ${err}`);
    }
  }
});
