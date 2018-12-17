var puppeteer = require('puppeteer');
var config = require('./config/config');

(async () => {

  var browser = await puppeteer.launch({
    // headless: false,
    // devtools: true,
    // slowMo: 250,
  });
  console.log(`\n已启动浏览器`);

  var page = await browser.newPage();
  console.log(`已新建标签页\n`);

  var urls = [];

  if (config.array && config.array.length > 0) {
    config.array.forEach(ele => {
      urls.push(`${config.baseUrl}${ele}.html`);
    });
  } else if (config.startIndex) {
    for (var i = config.startIndex; i <= config.count; i++) {
      urls.push(`${config.baseUrl}${i}.html`);
    }
  }

  for (var idx = 0; idx < urls.length; idx++) {
    await page.setViewport({
      width: 1920,
      height: 935,
    });
    await page.goto('https://cli.im/url');

    await page.waitForSelector('#url_content');
    console.log('01. 页面加载完毕');
    await page.type(
      '#url_content',
      urls[idx], {
        delay: 50,
      }
    );

    await page.waitForSelector('#click-create');
    await page.click('#click-create');
    console.log('02. 二维码图片生成中');

    await page.waitForNavigation();

    var qrcode = await page.$('#qrimage');
    console.log('03. 二维码图片已生成');

    if (config.array && config.array.length > 0) {
      await qrcode.screenshot({
        path: `img/${config.array[idx]}.png`,
      });
      console.log(`04. 二维码图片 ${config.array[idx]} 已保存\n`);

    } else if (config.startIndex) {
      await qrcode.screenshot({
        path: `img/${config.startIndex + idx}.png`,
      });
      console.log(`04. 二维码图片 ${config.startIndex + idx} 已保存\n`);
    }
  };

  // 检查二维码
  await page.goto('https://hewei.in/decode-qrcode/', {
    waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
  });
  console.log('页面已完全加载');

  for (var idx = 0; idx < urls.length; idx++) {

    await page.waitForSelector('input#upload');
    const input = await page.waitForSelector('input#upload');
    let fileName = config.array ? config.array[idx] : (config.startIndex + idx);
    await input.uploadFile('img/' + fileName + '.png');
    await page.waitForSelector('#decode');
    await page.click('#decode');

    await page.waitForSelector('#result');
    const innerText = await page.evaluate(() => document.querySelector('#result').innerText);
    if (innerText !== urls[idx]) {
      console.log('二维码图片内容有误');
      console.log(`报错信息：${innerText}`);
      console.log(`正确网址：${urls[idx]}`);
      console.log('请为上面的网址重新生成二维码图片并再次检查');
      console.log('\n');
    }
  }
  console.log('二维码图片全部检查完毕');

  await browser.close();
  console.log(`\n浏览器已关闭`);

})();