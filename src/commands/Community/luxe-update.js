const {
  SlashCommandBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const path = require("path");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("luxe-update")
    .setDescription("Send update to the server"),
  async execute(interaction, client) {
    try {
      const container = new ContainerBuilder();
      const separator = new SeparatorBuilder().setSpacing(
        SeparatorSpacingSize.Large
      );
      const emoji = "💌 ";
      const fingerheart = client.emojis.cache.get("1324870169205542993");
      const asterisk = client.emojis.cache.get("1436235574670397523");
      const bulletPink = client.emojis.cache.get("1436257652874416128");
      const bulletGreen = client.emojis.cache.get("1436256864697581630");
      const star = client.emojis.cache.get("1436261862814646292");

      const pinkBullets = `\n${bulletPink} News 1\n${bulletPink} News 2\n${bulletPink} News 3\n`;

      const intro = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent tincidunt ac justo eget dignissim. Praesent ut ipsum augue. `;

      const text = new TextDisplayBuilder().setContent(
        `### ${star} Luxe's Daily News Update\n ${intro}\n${pinkBullets}\n`
      );

      const button = new ButtonBuilder()
        .setLabel(`Click me`)
        .setURL(`https://www.google.com`)
        .setStyle(ButtonStyle.Link);

      // const section = new SectionBuilder()
      //   .addTextDisplayComponents(blank)
      //   .setButtonAccessory(button);

      container.addTextDisplayComponents(text);
      container.addSeparatorComponents(separator);
      container.addActionRowComponents({ components: [button] });

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      console.error("An error occurred while executing the command:", error);
    }
  },
};
