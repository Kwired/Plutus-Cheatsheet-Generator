import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import axios from 'axios';

export default async function handler(req, res) {
    console.log("Starting Plutus Cheatsheet Discord Cron Job...");

    const TOKEN = process.env.DISCORD_BOT_TOKEN;
    const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

    if (!TOKEN || !CHANNEL_ID) {
        return res.status(500).json({ error: "Missing Discord Credentials in Vercel Environment Variables" });
    }

    try {
        // 1. Fetch current articles from the newly deployed sitemap API
        const response = await axios.get('https://plutus-cheatsheet.vercel.app/articles.json');
        const articles = response.data;

        // 2. Fetch the metadata from the KV store (or a dummy API if no KV exists)
        // Since Vercel Serverless Functions are stateless, we can't write to a local "published.json"
        // For a true automated cron job, you either need a Database, a Vercel KV store, or to manually trigger it.
        // For Milestone 2 simplicity without a DB, this endpoint will just broadcast the latest article 
        // IF a specific secret trigger is passed, or it can be set to just run the manual !plutus-update behavior.

        // We will simulate the `!plutus-update` broadcast feature here so it can be triggered by a simple URL visit.

        const client = new Client({
            intents: [GatewayIntentBits.Guilds] // We only need Guilds intent to send messages, we don't need to listen
        });

        await client.login(TOKEN);

        const targetChannel = await client.channels.fetch(CHANNEL_ID);

        if (!targetChannel) {
            client.destroy();
            return res.status(500).json({ error: "Channel not found" });
        }

        // Feature the 3 most recent absolute snippets
        const recentArticles = articles.slice(-3).reverse();

        const embed = new EmbedBuilder()
            .setColor(0xF0A000)
            .setTitle('🚀 New Plutus Snippets Added!')
            .setURL('https://plutus-cheatsheet.vercel.app/')
            .setDescription('We just merged new community contributions into the Plutus Cheatsheet Generator!')
            .setTimestamp()
            .setFooter({ text: 'Plutus Cheatsheet Team', iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });

        recentArticles.forEach(article => {
            embed.addFields({
                name: `📌 ${article.title}`,
                value: `[View Snippet](${article.url}) | **Complexity:** ${article.complexity}`
            });
        });

        await targetChannel.send({ embeds: [embed] });

        client.destroy();

        return res.status(200).json({ success: true, message: "Successfully broadcasted the update to Discord!" });

    } catch (error) {
        console.error("Cron Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
