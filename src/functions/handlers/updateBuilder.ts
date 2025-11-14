import { type Client } from "discord.js";
import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

function getEmoji(emojiId: string, client: Client) {
  return client.emojis.cache.get(emojiId);
}

export function buildUpdateMessage(
  {
    headingText,
    subheadingText,
    list,
    button,
    bulletEmojiId = process.env.EMOJI_BULLET_PINK || "",
    headingEmojiId,
  }: {
    headingText: string;
    subheadingText?: string;
    list: { text: string; url?: string }[];
    button: { text: string; url: string };
    bulletEmojiId: string;
    headingEmojiId?: string;
  },
  client: Client
) {
  const container = new ContainerBuilder();
  const separator = new SeparatorBuilder().setSpacing(
    SeparatorSpacingSize.Large
  );

  // Heading
  const heading = new TextDisplayBuilder().setContent(
    `### ${
      headingEmojiId ? getEmoji(headingEmojiId, client) : ""
    } ${headingText}`
  );
  container.addTextDisplayComponents(heading);

  // Subheading
  if (subheadingText) {
    const subheading = new TextDisplayBuilder().setContent(subheadingText);
    container.addTextDisplayComponents(subheading);
    container.addSeparatorComponents(separator);
  }

  // Bullet points
  const listString = list
    .map(({ text, url }) =>
      url
        ? `\n${getEmoji(bulletEmojiId, client)} [${text}](${url})`
        : `\n${getEmoji(bulletEmojiId, client)} ${text}`
    )
    .join(" ");

  const bulletPoints = new TextDisplayBuilder().setContent(listString);
  container.addTextDisplayComponents(bulletPoints);

  // Subheading
  // if (subheadingText) {
  //   container.addSeparatorComponents(separator);
  //   const subheading = new TextDisplayBuilder().setContent(subheadingText);
  //   container.addTextDisplayComponents(subheading);
  // }

  if (button) {
    const footerButton = new ButtonBuilder()
      .setLabel(button.text)
      .setURL(button.url)
      .setStyle(ButtonStyle.Link);

    container.addSeparatorComponents(separator);
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(footerButton)
    );
  }

  return container;
}
