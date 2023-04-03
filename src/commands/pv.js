const { SlashCommandBuilder } = require("@discordjs/builders");
const db = require('better-sqlite3')('./main.db');
const { EmbedBuilder } = require('discord.js');
const puppeteer = require("puppeteer");
const { sleep, remove_ovnis } = require("../utils/functions");

const Green = 0x57F287
const Red = 0xED4245
const Yellow = 0xFFFF00

const isHeadless = process.env.SHOWBROWSER === "oui" ? false : true

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pv")
        .setDescription("Pour faire les PVs")
        .addStringOption(option =>
            option
                .setName("saillir")
                .setDescription("Voulez vous saillir les juments")
                .setChoices(
                    { name: 'Oui', value: 'oui' },
                    { name: 'Non', value: 'non' })
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName("username")
                .setDescription("Le compte auquel faire les PVs")),
    async execute(interaction, client) {
        const faire_saillie = interaction.options.getString('saillir') === 'oui'
        const username = interaction.options.getString('username')

        let accounts = []

        if (username) {
            const account = await db.prepare("SELECT * FROM accounts WHERE username = ?").get(username)

            if (account) {
                accounts.push(account)
            } else {
                embed = new EmbedBuilder()
                    .setColor(Red)
                    .setTitle("Ce compte n'existe pas !")
                    .setDescription(`Le compte **\`${username}\`** n'existe pas.`)
                await interaction.reply({ embeds: [embed], ephemeral: true })
                return
            }
        } else {
            accounts = await db.prepare("SELECT * FROM accounts").all()

            if (!accounts.length) {

                embed = new EmbedBuilder()
                    .setColor(Red)
                    .setTitle("Aucun compte a utiliser !")
                    .setDescription("Veuillez ajouter un compte en utilisant la commande **\`/account add\`**.")
                await interaction.reply({ embeds: [embed], ephemeral: true })
                return

            }
        }

        await interaction.deferReply({ ephemeral: false })

        for (let account of accounts) {
            console.log(account.username);

            const browser = await puppeteer.launch({ headless: isHeadless });
            const page = await browser.newPage();

            page.setDefaultNavigationTimeout(0);
            await page.setViewport({ width: 1200, height: 750 });

            await page.goto("https://gaia.equideow.com/site/logIn");

            var [cookieBtn] = await page.$x(
                "/html/body/aside/div/article/div/div[2]/div/div/div[3]/form/button"
            );

            if (cookieBtn) {
                cookieBtn.click();
            }

            await page.waitForNavigation();
            await page.type("#login", account.username);
            await page.type("#password", account.password);
            await page.click("#authentificationSubmit");

            await sleep(500)

            while (true) {
                await page.goto(`https://gaia.equideow.com/elevage/chevaux/?elevage=${account.elevagePVId}`)

                await sleep(500);

                await remove_ovnis(page)

                await sleep(50);

                await page.evaluate(`
                    function sleep(time) {
                        return new Promise(resolve => setTimeout(resolve, time))
                    }

                    (async () => {
                        await document.querySelector("#linkBlocRecherche").click()
                        await sleep(400)
                        await document.querySelector("#horseSearchLink-criteres").click()
                        await sleep(400)
                        await document.querySelector("#horseSearchCouche").click()
                        await document.querySelector("#horseSearchCouche").click()
                        await document.querySelector("#horseSearchSubmit").click()
                    })()
                `)

                let jumentsIds = await page.evaluate(`
                    function sleep(time) {
                        return new Promise(resolve => setTimeout(resolve, time))
                    }

                    (async () => {
                        let jumentsIds = []

                        for (let i = 0; i <= 100; i++) {
                            let pageLink = Array.from(document.querySelectorAll(".page > a")).find(link => link.getAttribute("data-page") == i)
                            if (!pageLink) {
                                break
                            }
                            pageLink.click()
                            await sleep(800)

                            for (let jument of document.querySelectorAll("a.horsename")) {
                                jumentsIds.push(parseInt(jument.getAttribute("href").replace("/elevage/chevaux/cheval?id=", "")))
                            }
                        }

                        return jumentsIds

                    })()
                `)

                console.log(jumentsIds, jumentsIds.length);

                if (!jumentsIds.length) {
                    console.log("finished " + account.username);
                    break
                }

                for (let jumentId of jumentsIds) {
                    console.log(jumentId);
                    await page.goto(`https://gaia.equideow.com/elevage/chevaux/cheval?id=${jumentId}`)

                    await sleep(500)

                    await remove_ovnis(page)

                    await sleep(100);

                    console.log("checking if dead");

                    let is_dead = await page.evaluate(` 
                        (async () => {
                            return document.querySelector(".grid-cell.align-top.spacer-large-right > h1")
                        })()
                    `)

                    if (is_dead) {
                        console.log("est mort");
                        continue
                    }

                    console.log("getting age");

                    let age = await page.evaluate(`
                        (async () => {
                            let age_text = document
                                .getElementById("characteristics")
                                .querySelector(".align-right")
                                .textContent.replace("Âge : ", "")

                            let age = 0
                            if (age_text.includes("an")) {
                                age = parseInt(age_text.slice(0, 2))
                            }
                            return age
                        })()
                    `)

                    if (age > 32) {
                        console.log("age > 32");
                        console.log("renaming and moving");
                        elevageOld = account.elevageOldId ? account.elevageOldId : "''"

                        await page.evaluate(`
                            function sleep(time) {
                                return new Promise((resolve) => setTimeout(resolve, time));
                            }

                            (async () => {
                                await document.querySelector(".options-button > button").click()
                                await document.querySelector(".options-menu > ul > li > a").click()
                                document.querySelector("#horseNameName").value = "VIEUX 32 ANS"
                                document.querySelector("#horseNameElevage").value = ${elevageOld}
                                await document.querySelector("#profil-popup-content").querySelector("button").click()
                            })()
                        `)

                        console.log("renamed and moved");
                        await page.reload()
                    } else {
                        console.log("age < 32");
                        const CE = await page.$("#cheval-inscription"); // Check si besoin CE

                        if (CE) {
                            console.log("doing boxage");
                            const CEPage = await browser.newPage()
                            await CEPage.goto(`https://gaia.equideow.com/elevage/chevaux/centreInscription?id=${jumentId}`)
                            await sleep(500)
                            await remove_ovnis(CEPage)
                            await sleep(100)
                            await CEPage.evaluate(`
                                function sleep(time) {
                                    return new Promise((resolve) => setTimeout(resolve, time));
                                }

                                (async () => {
                                    Array.from(await document.querySelectorAll("a")).find((el) => el.textContent.includes("60 jours")).click()
                                    await sleep(1000)
                                    await document.querySelector("#table-0 > tbody > tr:nth-child(1) > td:nth-child(11) > button").click()
                                })()
                            `)
                            await CEPage.close()
                            await page.reload()
                            await remove_ovnis(page)
                            console.log("did boxage");
                        }

                        if (age < 30 && age > 2) {
                            const Saillie = await page.$(".saillir"); // Check si saillie disponible

                            if (Saillie && faire_saillie) {
                                console.log("doing saillir");
                                const SaillirPage = await browser.newPage()
                                await SaillirPage.goto(`https://gaia.equideow.com/elevage/chevaux/rechercherMale?tri=cTotal&page=0&sens=DESC&rechercher=1&potentielTotal=0&prix=500&blup=-100&purete=2&cE=0&cV=0&cD=0&cG=0&cT=0&cS=0&cheval=1&poney=1&cheval-pegase=1&poney-pegase=1&=1&prixC=l&jument=${jumentId}&type=public`)
                                await sleep(500)
                                await remove_ovnis(SaillirPage)
                                await sleep(500)

                                let offreLink = await SaillirPage.evaluate(`
                                    document.querySelector("#table-0 > tbody > tr:nth-child(1) > td.align-center.action > a").getAttribute("href")
                                `)

                                await SaillirPage.goto(`https://gaia.equideow.com${offreLink}`)

                                await sleep(500)

                                await (await SaillirPage.$("#boutonDoReproduction")).click()

                                await SaillirPage.close()

                                await page.reload()
                                await remove_ovnis(page)
                                console.log("did saillir");
                            }
                        }

                        const boutonVeto = await page.$("#boutonVeterinaire"); // Check si mise base

                        if (boutonVeto) {
                            console.log("doing mise base");
                            const VetoPage = await browser.newPage()
                            await VetoPage.goto(`https://gaia.equideow.com/elevage/chevaux/mettreBas?jument=${jumentId}`)
                            await sleep(500)
                            await remove_ovnis(VetoPage)
                            await sleep(100)

                            let gender = await VetoPage.evaluate(`Array.from(document.querySelectorAll("img")).find(el => el.getAttribute("alt") == "femelle") ? "femelle" : "male"`)

                            console.log(gender);

                            let horseName = gender == "femelle" ? "F" : "M"
                            let affixeId = account.affixeId ? account.affixeId : "''"
                            let elevageF = account.elevageFId ? account.elevageFId : "''"
                            let elevageM = account.elevageMId ? account.elevageMId : "''"
                            let elevage = gender == "femelle" ? elevageF : elevageM

                            console.log(horseName);
                            console.log(elevage);

                            await VetoPage.evaluate(`
                                function sleep(time) {
                                    return new Promise((resole) => setTimeout(resole, time))
                                }

                                (async () => {                                    
                                    document.querySelector("#poulain-1").value = '${horseName}'

                                    document.querySelector("#profilLien1 > a").click()

                                    document.querySelector("#affixe-1").value = ${affixeId}

                                    document.querySelector("#elevage-1").value = ${elevage}

                                    await sleep(200)

                                    await document.querySelector("#boutonChoisirNom").click()
                                })()
                            `)

                            await VetoPage.close()

                            await page.reload()
                            await remove_ovnis(page)
                            console.log("did mise bas");
                        }

                        await sleep(900)
                        console.log("doing sdb");

                        if (age > 2) {
                            await page.evaluate(`
                                function sleep(time) {
                                    return new Promise((resole) => setTimeout(resole, time))
                                }

                                (async () => {
                                    if (document.getElementById("boutonMissionMontagne")) {
                                        document.getElementById("boutonMissionMontagne").click()
                                    } else if (document.getElementById("boutonMissionForet")) {
                                        document.getElementById("boutonMissionForet").click()
                                    } else if (document.getElementById("boutonMissionEquus")) {
                                        document.getElementById("boutonMissionEquus").click()
                                    } else if (document.getElementById("boutonMissionPlage")) {
                                        document.getElementById("boutonMissionPlage").click()
                                    }
                                })()
                            `)

                            await sleep(500)

                            await page.reload()
                            await remove_ovnis(page)
                        }

                        await sleep(600)

                        await page.evaluate(`
                            function sleep(time) {
                                    return new Promise((resolve) => setTimeout(resolve, time));
                            }

                            (async () => {
                                await sleep(500)

                                let msgPrblmPoids = document
                                    .querySelector("#care-tab-feed")
                                    .querySelector("#messageBoxInline");
                                let tropMaigre = false;
                                let tropGros = false;
                                if (msgPrblmPoids) {
                                    tropMaigre = msgPrblmPoids.textContent.indexOf("maigre") !== -1;
                                    tropGros = msgPrblmPoids.textContent.indexOf("gros") !== -1;
                                }

                                document.getElementById("boutonCaresser").click();
                                await sleep(600);
                                document.getElementById("boutonBoire").click();
                                await sleep(600);

                                let nourrirBtn = document.getElementById("boutonNourrir")

                                if (nourrirBtn && !tropGros) {
                                    document.getElementById("boutonNourrir").click();
                                    await sleep(1100);
                                    let qtteFourrageRequise = parseInt(
                                        document.querySelector(".section-fourrage-target").textContent
                                    );
                                    let qtteAvoineRequise = 0;
                                    let qtteAvoineDonnee = 1;
                                    let testAvoine = document.querySelector(".section-avoine-target");
                                    if (testAvoine !== null) {
                                        qtteAvoineRequise = parseInt(
                                            document.querySelector(".section-avoine-target").textContent
                                        );
                                        qtteAvoineDonnee = parseInt(
                                            document.querySelector(".section-avoine-quantity").textContent
                                        );
                                    }
                                    let qtteFourrageDonnee = parseInt(
                                        document.querySelector(".section-fourrage-quantity").textContent
                                    );

                                    if (tropMaigre) {
                                        qtteFourrageRequise = 20;
                                    }
                                    let fourrage = qtteFourrageRequise - qtteFourrageDonnee;
                                    let avoine = qtteAvoineRequise - qtteAvoineDonnee;
                                    if (fourrage > 0) {
                                        document
                                            .querySelector("#haySlider ol")
                                            .querySelectorAll(".alternative, .green")
                                        [fourrage].click();
                                    }
                                    if (avoine > 0) {
                                        document
                                            .querySelector("#oatsSlider ol")
                                            .querySelectorAll(".alternative, .green")
                                        [avoine].click();
                                    }
                                    await sleep(600);

                                    document.getElementById("feed-button").click();
                                }
                                
                                await sleep(600)
                                document.getElementById("boutonPanser").click();
                                await sleep(600);
                                document.getElementById("boutonCoucher").click();
                            })()
                        `)
                        await sleep(1200)
                        console.log("did sdb");
                    }
                }
            }
            await browser.close()

        }


    }
}