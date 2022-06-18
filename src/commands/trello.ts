import { SlashCommandBuilder } from "@discordjs/builders";
import { type CommandInteraction, GuildMember, Permissions } from "discord.js";
import { interactionReply, getMessage, getThreadAuthor, addMessageContext } from "../helpers/messageHelpers";
import type { NeedleCommand } from "../types/needleCommand";
import { memberIsModerator } from "../helpers/permissionHelpers";
var nodemailer = require('nodemailer');

export const command: NeedleCommand = {
	name: "trello",
	shortHelpDescription: "Trello actions",
	longHelpDescription: "Trello actions.",

	async getSlashCommandBuilder() {
		return new SlashCommandBuilder()
			.setName("trello")
			.setDescription("Trello actions")
      .addSubcommand(subcommand => {
				return subcommand
					.setName("add")
					.setDescription("Creates a trello card based on thread")
					.addStringOption(option => {
						return option
							.setName("label")
							.setDescription("Main label to assign to the card")
							.addChoice("🔵 Low", "Low")
              .addChoice("🟡 Medium", "Medium")
              .addChoice("🟠 High", "High")
              .addChoice("🔴 Major", "Major")
              .addChoice("🟣 Critical", "Critical")
              .setRequired(true);
					})
          
          .addBooleanOption(option => {
						return option
							.setName("bug")
							.setDescription("Whether or not this card is a bug")
							.setRequired(true);
					});
			})
			.toJSON();
	},

	async execute(interaction: CommandInteraction): Promise<void> {
		const member = interaction.member;
    
		if (!(member instanceof GuildMember)) {
			return interactionReply(interaction, getMessage("ERR_UNKNOWN", interaction.id));
		}

    if (!memberIsModerator(member as GuildMember)) {
			return interactionReply(interaction, getMessage("ERR_INSUFFICIENT_PERMS", interaction.id));
		}

		const channel = interaction.channel;
		if (!channel?.isThread()) {
			return interactionReply(interaction, getMessage("ERR_ONLY_IN_THREAD", interaction.id));
		}

    if (interaction.options.getSubcommand() === "add") {
			return trelloAdd(interaction);
		}

    return interactionReply(interaction, getMessage("ERR_UNKNOWN", interaction.id));
	},
};

async function trelloAdd(interaction: CommandInteraction): Promise<void> {
	//const channel = interaction.options.getChannel("channel") as GuildTextBasedChannel;

  const channel = interaction.channel;
		if (!channel?.isThread()) {
			return interactionReply(interaction, getMessage("ERR_ONLY_IN_THREAD", interaction.id));
		}
  
	const bug = interaction.options.getBoolean("bug");
	const label = interaction.options.getString("label") ?? "Low";

	if (!interaction.guild || !interaction.guildId) {
		return interactionReply(interaction, getMessage("ERR_ONLY_IN_SERVER", interaction.id));
	}

	if (!channel || bug == null) {
		return interactionReply(interaction, getMessage("ERR_PARAMETER_MISSING", interaction.id));
	}

	const clientUser = interaction.client.user;
	if (!clientUser) {
    return interactionReply(interaction, getMessage("ERR_UNKNOWN", interaction.id));
  }

	const botMember = await interaction.guild.members.fetch(clientUser);
	const botPermissions = botMember.permissionsIn(channel.id);

	if (!botPermissions.has(Permissions.FLAGS.VIEW_CHANNEL)) {
		addMessageContext(interaction.id, { channel });
		return interactionReply(interaction, getMessage("ERR_CHANNEL_VISIBILITY", interaction.id));
	}

  
  const threadAuthor = await getThreadAuthor(channel);
		if (!threadAuthor) {
			return interactionReply(interaction, getMessage("ERR_AMBIGUOUS_THREAD_AUTHOR", interaction.id));
		}

  const firstMessage = (await channel.fetchStarterMessage());

  
  if (firstMessage == undefined)
    return interactionReply(interaction, 'Could not get first message');

  const firstMessageString = firstMessage.content;

  // let messages = await channel.messages.fetch();
  
  // messages.forEach(msg => {
  //     console.log(msg.id);
  //   });

  // var url = firstMessage.url;
  var url = "https://discord.com/channels/" + channel.guildId + "/" + channel.id;
  var userUrl = "hhttps://discordapp.com/users/" + threadAuthor.id;
  
  // console.log("url: "+  url + " channel id:" + channel.id + " channel parentId:" + channel.parentId + " firstMessage.id: " + firstMessage.id + " general channel id: " + channel.parent?.parent?.parent?.id + " guild id: " + channel.guildId);

  const result = await sendToTrello(bug, 
                                    label, 
                                    channel.name, 
                                    firstMessageString, 
                                    url, 
                                    threadAuthor.username,
                                    userUrl);
    return result == ""
        ? interactionReply(interaction, `Added Trello card: <#${channel.id}>`)
        : interactionReply(interaction, 'Could not send details to Trello');
}

async function sendToTrello(bug: boolean, label: string, title: string, description: string, url: string, userName: string, userUrl: string) {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  //let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: process.env['DRE_DISCORD_EMAIL_HOST'],
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env['DRE_DISCORD_EMAIL'], // generated ethereal user
      pass: process.env['DRE_DISCORD_PW'], // generated ethereal password
    },
  });

  // send mail with defined transport object
  await transporter.sendMail({
    from: '"DRE Discord Bot" <' + process.env['DRE_DISCORD_EMAIL'] + '>', // sender address
    to: process.env['TRELLO_BOARD_EMAIL'], // list of receivers
    // to: "sandfeld@gmail.com,egilsandfeld+cgobh51hhzrt1da1rxmr@boards.trello.com", // list of receivers
    subject: title + (bug ? " #Bug" : "") + " #" + label, // Subject line
    text: "**["+title+"]("+url+")**\n**["+userName+"]("+userUrl+")**\n\n" + description , // plain text body
    // attachments: [
    //     {   
    //         // filename: userName,
    //         filename: url
    //     }
    // ]
  });

  //console.log("Message sent: %s", info.messageId);
  return "";
}