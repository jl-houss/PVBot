const { Client, GatewayIntentBits, Collection } = require(`discord.js`);
const fs = require('fs');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.commands = new Collection();
require('dotenv').config();

const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
const commandFiles = fs.readdirSync("./src/commands").filter(file => file.endsWith(".js"));

if (!fs.readdirSync(".").includes("main.db")) {
    const db = require('better-sqlite3')('./main.db');

    (async () => {
        await db.prepare(`
            CREATE TABLE "accounts" (
                "id"	        INTEGER NOT NULL UNIQUE,
                "username"	    TEXT NOT NULL UNIQUE,
                "password"	    TEXT NOT NULL,
                "elevagePVId"	INTEGER NOT NULL UNIQUE,
                "elevageFId"	INTEGER UNIQUE,
                "elevageMId"	INTEGER UNIQUE,
                "affixeId"	    INTEGER NOT NULL UNIQUE,
                "elevageOldId"	INTEGER,
                PRIMARY KEY("id" AUTOINCREMENT)
            );`).run()
    })()

}

(async () => {
    for (file of functions) {
        require(`./functions/${file}`)(client);
    }
    client.handleEvents(eventFiles, "./src/events");
    client.handleCommands(commandFiles, "./src/commands");
    client.login(process.env.TOKEN)
})();

