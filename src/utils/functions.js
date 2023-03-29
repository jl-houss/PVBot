const puppeteer = require("puppeteer");
const db = require('better-sqlite3')('./main.db');


const isHeadless = process.env.SHOWBROWSER === "oui" ? false : true

function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time))
}

async function get_cookie(username, password) {
    return new Promise(async (resolve) => {
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
        await page.type("#login", username);
        await page.type("#password", password);
        await page.click("#autoidentification");
        await page.click("#authentificationSubmit");

        await sleep(1000);

        var cookies = await page.cookies();

        var cookie = cookies.find((cookie) => cookie.name === "autoLoginprod");
        let autoLoginprod = cookie ? cookie.value : null

        await browser.close();

        resolve(autoLoginprod);
    });
}

async function remove_ovnis(page) {
    await page.evaluate(`
        (async () => {
            let ovni = document.getElementById("Ufo_0")
            if (ovni) { ovni.click() }
        })()
    `)
}

module.exports = {
    get_cookie,
    sleep,
    remove_ovnis
}