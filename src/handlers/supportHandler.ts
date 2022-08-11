// ________________________________________________________________________________________________
//
// This file is part of Needle.
//
// Needle is free software: you can redistribute it and/or modify it under the terms of the GNU
// Affero General Public License as published by the Free Software Foundation, either version 3 of
// the License, or (at your option) any later version.
//
// Needle is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
// the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
// General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License along with Needle.
// If not, see <https://www.gnu.org/licenses/>.
//
// ________________________________________________________________________________________________

import { type CommandInteraction, type MessageComponentInteraction, MessageActionRow, MessageButton } from "discord.js";
import { promises } from "fs";
import { resolve as pathResolve } from "path";
import { getMessage, interactionReply } from "../helpers/messageHelpers";
import type { NeedleCommand } from "../types/needleCommand";

const COMMANDS_PATH = pathResolve(__dirname, "../commands");

let loadedCommands: NeedleCommand[] = [];

export function handleCommandInteraction(interaction: CommandInteraction): Promise<void> {
  const command = getCommand(interaction.commandName);
  if (!command) return Promise.reject();

  try {
    return command.execute(interaction);
  }
  catch (error) {
    console.error(error);
    return interactionReply(interaction, getMessage("ERR_UNKNOWN", interaction.id));
  }
}

export async function handleButtonClickedInteraction(interaction: MessageComponentInteraction): Promise<void> {

  if (interaction.customId.includes('support-type-')) {
    if (interaction.customId.includes('billing')) {
      await interaction.reply({ ephemeral: true, content: 'You chose Billing' });
    } else if (interaction.customId.includes('issue')) {
      await onSupportTypeIssue(interaction);
    } else if (interaction.customId.includes('idea')) {
      await interaction.reply({ ephemeral: true, content: 'You chose Idea' });
    }

    return;
  }

  if (interaction.customId.includes('issue-')) {
    if (interaction.customId.includes('general')) {
      await interaction.reply({ ephemeral: true, content: 'You chose general' });
    } else if (interaction.customId.includes('recognition')) {
      await interaction.reply({ ephemeral: true, content: 'You chose recognition' });
    } else if (interaction.customId.includes('output')) {
      await interaction.reply({ ephemeral: true, content: 'You chose output' });
    } else if (interaction.customId.includes('legacy')) {
      await interaction.reply({ ephemeral: true, content: 'You chose legacy' });
    }

    return;
  }

  const command = getCommand(interaction.customId);
  if (!command) return Promise.reject();

  try {
    return command.execute(interaction);
  }
  catch (error) {
    console.error(error);
    return interactionReply(interaction, getMessage("ERR_UNKNOWN", interaction.id));
  }
}

export async function onSupportTypeIssue(interaction: MessageComponentInteraction): Promise<void> {
    //await interaction.reply({ ephemeral: true, content: 'You chose Issue' });
    const row = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setStyle(4)
          .setLabel('General issue')
          .setCustomId("issue-general"),

        new MessageButton()
          .setStyle(4)
          .setLabel('Speech recognition')
          .setCustomId("issue-recognition"),

        new MessageButton()
          .setStyle(4)
          .setLabel('Output')
          .setCustomId("issue-output"),

        new MessageButton()
          .setStyle(2)
          .setLabel('DRE 3 Legacy')
          .setCustomId("issue-legacy")
      );

    await interaction.reply({ ephemeral: true, content: 'What kind of issue do you have?', components: [row], fetchReply: true });
  }

export async function getOrLoadAllCommands(allowCache = true): Promise<NeedleCommand[]> {
  if (loadedCommands.length > 0 && allowCache) {
    return loadedCommands;
  }

  console.log("Started reloading commands from disk.");

  let commandFiles = await promises.readdir(COMMANDS_PATH);
  commandFiles = commandFiles.filter(file => file.endsWith(".js"));
  const output = [];
  for (const file of commandFiles) {
    const { command } = await import(`${COMMANDS_PATH}/${file}`);
    output.push(command);
    console.log("Successfully reloaded command: " + file);
  }

  console.log("Successfully reloaded commands from disk.");
  loadedCommands = output;
  return output;
}

export function getAllLoadedCommands(): NeedleCommand[] {
  if (loadedCommands.length === 0) {
    console.error("No commands found. Did you forget to invoke \"getOrLoadAllCommands()\"?");
  }

  return loadedCommands;
}

export function getCommand(commandName: string): NeedleCommand | undefined {
  if (loadedCommands.length === 0) {
    console.error("No commands found. Did you forget to invoke \"getOrLoadAllCommands()\"?");
  }

  return loadedCommands.find(command => command.name === commandName);
}
