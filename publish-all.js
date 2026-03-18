require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
    console.error("❌ ERROR: Missing DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID in .env file.");
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Sleep function to avoid Discord rate limiting
const delay = ms => new Promise(res => setTimeout(res, ms));

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log("Preparing to publish all existing articles...");

    const targetChannel = client.channels.cache.get(CHANNEL_ID);
    if (!targetChannel) {
        console.error(`❌ ERROR: Could not find channel with ID ${CHANNEL_ID}`);
        process.exit(1);
    }

    try {
        const res = await axios.get('https://plutus-cheatsheet.vercel.app/articles.json');
        const articles = res.data;

        console.log(`Found ${articles.length} articles! Beginning mass publish...`);

        let count = 0;
        for (const article of articles) {
            count++;
            const embed = new EmbedBuilder()
                .setColor(0x1F80E0)
                .setTitle(`📌 Archive Snippet: ${article.title}`)
                .setURL(article.url)
                .setDescription(article.subtitle || 'An archived snippet from the Plutus Cheatsheet collection.')
                .addFields(
                    { name: 'Version', value: article.plutusVersion || 'N/A', inline: true },
                    { name: 'Complexity', value: article.complexity || 'N/A', inline: true },
                    { name: 'Tags', value: article.tags?.join(', ') || 'None', inline: true }
                )
                .setFooter({ text: 'Plutus Cheatsheet Archive', iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });

            await targetChannel.send({ embeds: [embed] });
            console.log(`[${count}/${articles.length}] 📨 Successfully posted: ${article.title}`);
            console.log(`Waiting 4 hours before sending the next snippet...`);

            // Wait 4 hours (14400000 ms) before sending the next one to slowly drip-feed content
            await delay(4 * 60 * 60 * 1000);
        }

        console.log("🎉 Successfully mass-published all old articles!");

    } catch (error) {
        console.error("❌ Error mass-publishing articles:", error.message);
    }

    client.destroy();
    process.exit(0);
});

client.login(TOKEN);
