var puppeteer = require('puppeteer');
var config = require('./config/config');

(async () => {

  var browser = await puppeteer.launch();
  console.log(`\nbrowser launched`);

  var page = await browser.newPage();
  console.log(`page opened`);

  for (var index = config.startIndex; index < config.startIndex + config.count; index++) {

    console.log(`\ncurrent index: ${index}`);
    const finalUrl = `${config.baseUrl}${index}.html`;
    const finalImg = `./img/${index}.png`;

    await page.goto('https://cli.im/url');
    await page.setViewport({
      width: 1920,
      height: 935,
    });

    await page.waitForSelector('#url_content');
    console.log('01. page rendered');
    await page.type(
      '#url_content',
      finalUrl, {
        delay: 50,
      }
    );

    await page.waitForSelector('#click-create');
    await page.click('#click-create', {
      delay: 50,
    });
    console.log('02. button clicked');

    await page.waitForNavigation();

    var qrcode = await page.$('#qrimage');
    console.log('03. qrcode rendered');
    await qrcode.screenshot({
      path: finalImg,
    });
    console.log(`04. image ${index} saved`);
  }

  await browser.close();
  console.log(`\npage closed`);
})();
