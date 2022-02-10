require("dotenv").config();
const procenv = process.env,
	Discord = require("discord.js"),
	client = new Discord.Client({intents: ["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "DIRECT_MESSAGES", "DIRECT_MESSAGE_REACTIONS"]}),
	sharp = require("sharp"),
	pkg = require("./package.json");

/**
 * Logger function.
 * @param {string} message - The message to log.
 * @returns {void}
 */
function logger(message) {
	console.log(`${new Date()} [${pkg.name}] ${message}`);
}

var contentChannels = procenv.CHANNELS.split("|")

function login() {
	client.login(procenv.TOKEN).catch(err => {
		logger(`Failed to login: ${err}, retrying in 5 seconds...`);
		setTimeout(login, 5000);
	});
}

login();

client.on("ready", () => {
	logger(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", async message => {
      	if (message.author.bot || message.channel.type != "GUILD_TEXT" || !contentChannels.includes(message.channel.id)) return;
});
