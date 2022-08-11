import { SlashCommandBuilder } from "@discordjs/builders";
import { type CommandInteraction, GuildMember, Permissions, MessageActionRow, MessageButton } from "discord.js";
//const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
import { interactionReply, getMessage, addMessageContext } from "../helpers/messageHelpers";
import type { NeedleCommand } from "../types/needleCommand";
import { memberIsModerator } from "../helpers/permissionHelpers";

export const command: NeedleCommand = {
  name: "xsupport",
  shortHelpDescription: "Support actions",
  longHelpDescription: "Support actions.",

  async getSlashCommandBuilder() {
    return new SlashCommandBuilder()
      .setName("xsupport")
      .setDescription("Start a new ticket")
      .toJSON();
  },

  async execute(interaction: CommandInteraction): Promise<void> {
    const member = interaction.member;

    if (!(member instanceof GuildMember)) {
      return interactionReply(interaction, getMessage("ERR_UNKNOWN", interaction.id));
    }

    //REMOVE THIS WHEN RELEASING, SO ALL USERS CAN ACCESS THE COMMAND
    if (!memberIsModerator(member as GuildMember)) {
      return interactionReply(interaction, getMessage("ERR_INSUFFICIENT_PERMS", interaction.id));
    }
    return startSupport(interaction);
  },
};

async function startSupport(interaction: CommandInteraction): Promise<void> {
  //const channel = interaction.options.getChannel("channel") as GuildTextBasedChannel;

  const channel = interaction.channel;

  if (!interaction.guild || !interaction.guildId) {
    return interactionReply(interaction, getMessage("ERR_ONLY_IN_SERVER", interaction.id));
  }
  if (!channel) {
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

  const author = "AUTHOR WHO";
  if (!author) {
    return interactionReply(interaction, getMessage("ERR_AMBIGUOUS_THREAD_AUTHOR", interaction.id));
  }

  //console.log("channel id:" + channel.id);

  const row = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setStyle(1)
        .setLabel('💰 Account & Billing')
        .setCustomId("support-type-billing"),

      new MessageButton()
        .setStyle(4)
        .setLabel('⚡ Report an issue')
        .setCustomId("support-type-issue"),

      new MessageButton()
        .setStyle(3)
        .setLabel('💡 Suggest an idea')
        .setCustomId("support-type-idea")
    );

  await interaction.reply({ ephemeral: true, content: 'Select the type of support', components: [row], fetchReply: true });

  return;
}