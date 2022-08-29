import { GuildMember, GuildTextBasedChannel, SlashCommandBuilder } from "discord.js";
import { isAllowedToChangeThreadTitle } from "../helpers/djsHelpers";
import { SlashCommandBuilderWithOptions } from "../helpers/typeHelpers";
import CommandCategory from "../models/enums/CommandCategory";
import InteractionContext from "../models/InteractionContext";
import NeedleCommand from "../models/NeedleCommand";

export default class TitleCommand extends NeedleCommand {
	public readonly name = "title";
	public readonly description = "Change the title of a thread";
	public readonly category = CommandCategory.ThreadOnly;

	public addOptions(builder: SlashCommandBuilder): SlashCommandBuilderWithOptions {
		return builder.addStringOption(option =>
			option
				.setName("value")
				.setDescription("The new title of the thread")
				.setMinLength(1)
				.setMaxLength(100)
				.setRequired(true)
		);
	}

	public async hasPermissionToExecuteHere(member: GuildMember, channel: GuildTextBasedChannel): Promise<boolean> {
		if (!channel.isThread()) return false;

		const hasBasePermissions = await super.hasPermissionToExecuteHere(member, channel);
		if (!hasBasePermissions) return false;

		return isAllowedToChangeThreadTitle(channel, member);
	}

	public async execute(context: InteractionContext): Promise<void> {
		const { settings, replyInSecret, replyWithErrors } = context;
		if (!context.isInThread()) {
			return replyWithErrors();
		}

		const { channel: thread, member } = context.interaction;
		if (!this.bot.isAllowedToRename(thread.id)) {
			return replyInSecret(settings.ErrorMaxThreadRenames);
		}

		let newThreadName = "";
		if (context.isSlashCommand()) {
			newThreadName = context.interaction.options.getString("value", true);
		} else if (context.isButtonPress()) {
			const titleModal = this.bot.getModal("title");
			const modalSubmitInteraction = await titleModal.openAndAwaitSubmit(context.interaction, [
				{ customId: "title", value: thread.name },
			]);
			newThreadName = modalSubmitInteraction.fields.getTextInputValue("title");
			context.setInteractionToReplyTo(modalSubmitInteraction);
		}

		const userHasPermission = await isAllowedToChangeThreadTitle(thread, member);
		const botHasPermission = await isAllowedToChangeThreadTitle(thread, thread.guild.members.me);

		if (!userHasPermission) return replyInSecret(settings.ErrorInsufficientUserPerms);
		if (!botHasPermission) return replyInSecret(settings.ErrorInsufficientBotPerms);
		if (thread.name === newThreadName) return replyInSecret(settings.ErrorNoEffect);

		await thread.setName(newThreadName);
		this.bot.reportThreadRenamed(thread.id);
		await replyInSecret("Success!");
	}
}
