const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await page.goto('https://cli.im/url');
  
  await page.waitForSelector('#url_content');
  await page.type('#url_content', 'https://www.baidu.com/', {
    delay: 50,
  });
  
  await page.waitForSelector('#click-create');
  await page.click('#click-create', {
    delay: 50,
  });
  
  await page.waitForNavigation();
  
  const qrcode = await page.$('#qrimage');
  await qrcode.screenshot({
    path: 'screenshot.png',
  });
  
  await browser.close();  
})();
