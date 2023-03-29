const { SlashCommandBuilder } = require("@discordjs/builders");
const db = require('better-sqlite3')('./main.db');
const { EmbedBuilder } = require('discord.js');
const { get_cookie } = require("../utils/functions");

const Green = 0x57F287
const Red = 0xED4245
const Yellow = 0xFFFF00
const Blue = 0x3498DB

async function account_add(interaction) {
    const username = interaction.options.getString('username')
    const password = interaction.options.getString('password')
    const elevage_PV_id = interaction.options.getInteger('pv-id')
    const elevage_F_id = interaction.options.getInteger('f-id')
    const elevage_M_id = interaction.options.getInteger('m-id')
    const elevage_Old_id = interaction.options.getInteger('old-id')
    const affixe_id = interaction.options.getInteger('affixe-id')

    let account = await db.prepare('SELECT id FROM accounts WHERE username = ?').get(username);

    if (account) {
        const embed = new EmbedBuilder()
            .setColor(Red)
            .setTitle("Ce compte existe déja !");

        await interaction.reply({ embeds: [embed], ephemeral: true })
        return
    }

    await interaction.deferReply({ ephemeral: true })

    if (!await get_cookie(username, password)) {
        const embed = new EmbedBuilder()
            .setColor(Red)
            .setTitle("Nom d'utilisateur et/ou mot de passe incorrectes !");

        await interaction.editReply({ embeds: [embed] })
        return
    }

    await db.prepare("INSERT INTO accounts (username, password, elevagePVId, elevageFId, elevageMId, affixeId, elevageOldId) VALUES (?,?,?,?,?,?,?)")
        .run(
            username,
            password,
            elevage_PV_id,
            elevage_F_id,
            elevage_M_id,
            affixe_id,
            elevage_Old_id
        )

    const embed = new EmbedBuilder()
        .setColor(Green)
        .setTitle("Compte ajouté !")
        .setDescription(`Le compte **\`${username}\`** a été ajouté.`);
    await interaction.editReply({ embeds: [embed] })

}

async function account_edit(interaction) {
    const username = interaction.options.getString('username')
    const new_username = interaction.options.getString('new-username')
    const new_password = interaction.options.getString('new-password')
    const new_elevage_PV_id = interaction.options.getString('new-pv-id')
    const new_elevage_F_id = interaction.options.getString('new-f-id')
    const new_elevage_M_id = interaction.options.getString('new-m-id')
    const new_elevage_Old_id = interaction.options.getString('new-old-id')
    const new_affixe_id = interaction.options.getString('new-affixe-id')


    let account = await db.prepare('SELECT id, username, password FROM accounts WHERE username = ?').get(username)

    if (!new_username && !new_password && !new_elevage_PV_id && !new_elevage_F_id && !new_elevage_M_id && !new_affixe_id && !new_elevage_Old_id) {
        const embed = new EmbedBuilder()
            .setColor(Yellow)
            .setTitle("Aucun changement effectué !")
        await interaction.reply({ embeds: [embed], ephemeral: true })
        return
    }

    if (!account) {
        {
            const embed = new EmbedBuilder()
                .setColor(Red)
                .setTitle("Ce compte n'existe pas !")
                .setDescription(`Le compte **\`${username}\`** n'existe pas`)
            await interaction.reply({ embeds: [embed], ephemeral: true })
            return
        }
    }

    let newaccount = await db.prepare('SELECT id FROM accounts WHERE username = ?').get(new_username)

    if (newaccount) {
        {
            const embed = new EmbedBuilder()
                .setColor(Red)
                .setTitle("Le nouveau nom d'utilisateur existe déja !")
            await interaction.reply({ embeds: [embed], ephemeral: true })
            return
        }
    }

    await interaction.deferReply({ ephemeral: true })

    if (new_username && new_password) {

        if (await get_cookie(new_username, new_password)) {
            await db.prepare("UPDATE accounts SET username = ?, password = ? WHERE id = ?").run(new_username, new_password, account.id)
        } else {
            const embed = new EmbedBuilder()
                .setColor(Red)
                .setTitle("Nom d'utilisateur et/ou mot de passe incorrectes !")
            await interaction.editReply({ embeds: [embed] })
            return
        }

    } else if (new_username) {

        if (await get_cookie(new_username, account.password)) {
            await db.prepare("UPDATE accounts SET username = ? WHERE id = ?").run(new_username, account.id)
        } else {
            const embed = new EmbedBuilder()
                .setColor(Red)
                .setTitle("Nom d'utilisateur incorrect !")
            await interaction.editReply({ embeds: [embed] })
            return
        }
    } else if (new_password) {

        if (await get_cookie(account.username, new_password)) {
            await db.prepare("UPDATE accounts SET password = ? WHERE id = ?").run(new_password, account.id)
        } else {
            const embed = new EmbedBuilder()
                .setColor(Red)
                .setTitle("Mot de passe incorrect !")
            await interaction.editReply({ embeds: [embed] })
            return
        }
    }

    account = await db.prepare('SELECT * FROM accounts WHERE id = ?').get(account.id)

    if (new_elevage_PV_id) {
        await db.prepare("UPDATE accounts SET elevagePVId = ? WHERE id = ?").run(new_elevage_PV_id, account.id)
    }
    if (new_elevage_F_id) {
        await db.prepare("UPDATE accounts SET elevageFId = ? WHERE id = ?").run(new_elevage_F_id, account.id)
    }
    if (new_elevage_M_id) {
        await db.prepare("UPDATE accounts SET elevageMId = ? WHERE id = ?").run(new_elevage_M_id, account.id)
    }
    if (new_affixe_id) {
        await db.prepare("UPDATE accounts SET affixeId = ? WHERE id = ?").run(new_affixe_id, account.id)
    }
    if (new_elevage_Old_id) {
        await db.prepare("UPDATE accounts SET elevageOldId = ? WHERE id = ?").run(new_elevage_Old_id, account.id)
    }

    const embed = new EmbedBuilder()
        .setColor(Green)
        .setTitle(`Compte mis a jour !`)
        .setDescription(`Le compte **\`${username}\`** a été modifié.`);
    await interaction.editReply({ embeds: [embed] })

}

async function account_remove(interaction) {
    const username = interaction.options.getString('username')

    let account = await db.prepare('SELECT id FROM accounts WHERE username = ?').get(username)

    if (account) {
        await db.prepare('DELETE FROM accounts WHERE id = ?').run(account.id)

        const embed = new EmbedBuilder()
            .setColor(Green)
            .setTitle("Compte supprimé !")
            .setDescription(`Le compte **\`${username}\`** a été retiré.`)

        await interaction.reply({ embeds: [embed], ephemeral: true })
    } else {
        const embed = new EmbedBuilder()
            .setColor(Red)
            .setTitle("Ce compte n'existe pas !")
            .setDescription(`Le compte **${username}** n'existe pas`)
        await interaction.reply({ embeds: [embed], ephemeral: true })
    }
}

async function account_list(interaction) {
    let accounts = await db.prepare('SELECT username, password FROM accounts').all()

    const embed = new EmbedBuilder()
        .setColor(accounts.length ? Blue : Yellow)
        .setTitle(accounts.length ? "List des comptes:" : "Aucun compte pour l'instant")

    if (accounts.length) {
        accounts.map(account => {
            embed.addFields({ name: `*${account.username}*`, value: "\\*".repeat(account.password.length) })
        })
    }

    await interaction.reply({ embeds: [embed], ephemeral: true })
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("account")
        .setDescription("Gestion des comptes")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Pour ajouter un compte")
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription("Le nom d'utilisateur du compte")
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('password')
                        .setDescription('Le mot de passe du compte')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option
                        .setName('pv-id')
                        .setDescription("L'identifiant de l'elevage de PV a utiliser")
                        .setRequired(true))
                .addIntegerOption(option =>
                    option
                        .setName('affixe-id')
                        .setDescription("L'identifiant de l'affixe a utiliser"))
                .addIntegerOption(option =>
                    option
                        .setName('f-id')
                        .setDescription("L'identifiant de l'elevage des femelles a utiliser"))
                .addIntegerOption(option =>
                    option
                        .setName('m-id')
                        .setDescription("L'identifiant de l'elevage des males a utiliser"))
                .addIntegerOption(option =>
                    option
                        .setName('old-id')
                        .setDescription("L'identifiant de l'elevage des vieux a utiliser")))
        .addSubcommand((subcommand) =>
            subcommand
                .setName("edit")
                .setDescription("Pour modifier un compte")
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription("Le nom d'utilisateur du compte a modifier")
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('new-username')
                        .setDescription("Le nouveau nom d'utilisateur"))
                .addStringOption(option =>
                    option
                        .setName('new-password')
                        .setDescription('Le nouveau mot de passe du compte'))
                .addStringOption(option =>
                    option
                        .setName('new-pv-id')
                        .setDescription("L'identifiant du nouvel elevage de PV a utiliser"))
                .addStringOption(option =>
                    option
                        .setName('new-f-id')
                        .setDescription("L'identifiant du nouvel elevage de femelles a utiliser"))
                .addStringOption(option =>
                    option
                        .setName('new-m-id')
                        .setDescription("L'identifiant du nouvel elevage de males a utiliser"))
                .addStringOption(option =>
                    option
                        .setName('new-affixe-id')
                        .setDescription("L'identifiant du nouvel affixe a utiliser"))
                .addStringOption(option =>
                    option
                        .setName('new-old-id')
                        .setDescription("L'identifiant du nouvel elevage des vieux a utiliser")))
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Pour enlever un compte")
                .addStringOption(option =>
                    option
                        .setName('username')
                        .setDescription("Le nom d'utilisateur du compte a supprimer")
                        .setRequired(true)))
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("Pour lister tous les comptes ajoutés")),
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand()

        commands = {
            'add': account_add,
            'edit': account_edit,
            'remove': account_remove,
            'list': account_list
        }

        await commands[subcommand](interaction)
    }
};
