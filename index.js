var puppeteer = require('puppeteer');
var config = require('./config/config');

(async () => {

  var browser = await puppeteer.launch({
    // headless: false,
  });
  console.log(`\n浏览器已启动`);

  var page = await browser.newPage();
  console.log(`标签已新建\n`);

  var urls = [];

  if (config.array && config.array.length > 0) {
    config.array.forEach(ele => {
      urls.push(`${config.baseUrl}${ele}.html`);
    });

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
      await qrcode.screenshot({
        path: `img/${config.array[idx]}.png`,
      });
      console.log(`04. 图片 ${config.array[idx]} 已保存\n`);
    };
  }

  await browser.close();
  console.log(`\n浏览器已关闭`);
})();