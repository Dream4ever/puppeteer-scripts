var fs = require('fs');
var puppeteer = require('puppeteer');
var config = require('./config/config');

(async () => {

  /* 设置浏览器启动参数 */
  const width = 1920;
  const height = 935;
  const chrome = { x: 0, y: 74 };

  // 设置启动后的窗口尺寸
  // https://github.com/GoogleChrome/puppeteer/issues/1183
  let args = [];
  args.push(`--window-size=${width + chrome.x},${height + chrome.y}`);

  var browser = await puppeteer.launch({
    headless: true,
    args,
    // devtools: true,
    // slowMo: 250,
  });

  console.log(`\n已启动浏览器\n`);


  /* 设置新建标签页的参数 */
  var page = await browser.newPage();
  await page.setViewport({
    width,
    height,
  });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
  console.log(`已新建标签页\n`);

  /* 从配置文件中读取需生成二维码的URL数组 */
  var urls = [];
  if (config.array && config.array.length > 0) {
    config.array.forEach(ele => {
      urls.push(`${config.baseUrl}${ele}.html`);
    });
  } else if (config.startIndex) {
    for (var i = 0; i < config.count; i++) {
      urls.push(`${config.baseUrl}${config.startIndex + i}.html`);
    }
  }

  /* 逐个生成二维码 */
  for (var idx = 0; idx < urls.length; idx++) {
    await page.goto('https://cli.im/url');

    await page.waitForSelector('#url_content');
    console.log('01. 页面加载完毕');

    // 草料网现在增加了检测机制，必须点击输入框之后才能模拟输入文字
    await page.tap('#url_content');
    await page.type('#url_content', urls[idx], { delay: 50, }
    );

    await page.waitForSelector('#click-create');
    await page.click('#click-create');

    // 输入网址生成二维码图片后，URL会变化，所以这一行不能省略
    await page.waitForNavigation();

    // 设置二维码容错级别为最低的7%
    await page.waitForSelector('li.col-md-3.col-sm-3.col-xs-3.first');
    await page.click('li.col-md-3.col-sm-3.col-xs-3.first');
    await page.waitForSelector('div#level')
    await page.click('div#level')
    await page.waitForSelector('a.dropdown-item[data-level="L"]')
    await page.click('a.dropdown-item[data-level="L"]')

    console.log('02. 二维码图片生成中');

    var qrcode = await page.$('#qrimage');
    console.log('03. 二维码图片已生成');

    // 在这里需等待1秒，才能正常获取到图片元素的src
    // 否则获取到的是图片的base64值
    await page.waitFor(1000);
    let imgSrc = await page.evaluate(() => {
      return document.querySelector('#qrimage').getAttribute('src')
    });
    await page.waitFor(1000);
    console.log(imgSrc);
    let viewSource = await page.goto(`https:${imgSrc}`);

    // 二维码图片非连续编号
    if (config.array && config.array.length > 0) {
      fs.writeFile(`img/${config.startIndex + idx}.png`, await viewSource.buffer(), function (err) {
        if (err) {
          return console.log(err);
        }
      })
      console.log(`04. 二维码图片 ${config.array[idx]} 已保存\n`);
    }
    // 二维码图片连续编号
    else if (config.startIndex) {
      fs.writeFile(`img/${config.startIndex + idx}.png`, await viewSource.buffer(), function (err) {
        if (err) {
          return console.log(err);
        }
      })
      console.log(`04. 二维码图片 ${config.startIndex + idx} 已保存\n`);
    }
    await page.waitFor(1000);
  };

  // 检查二维码
  await page.goto('https://cli.im/deqr', {
    waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
  });
  console.log('二维码扫描页面已完全加载\n');

  let allOK = true;
  for (var idx = 0; idx < urls.length; idx++) {
    console.log(`第${idx + 1}个二维码检查中……\n`);

    await page.waitForSelector('input#filedatacode');
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.click('input#filedatacode'),
    ]);
    await page.waitFor(2000);
    await fileChooser.accept([`img/${config.startIndex + idx}.png`]);
    await page.waitFor(2000);

    const innerText = await page.evaluate(() => document.querySelector('#deqrresult').innerText);

    if (innerText !== urls[idx]) {
      allOK = false;
      console.log('二维码图片内容有误');
      console.log(`innerText: ${innerText}`)
      console.log(urls[idx])
      console.log('请为上面的网址重新生成二维码图片并再次检查');
      console.log('\n');
    }
  }
  console.log('二维码图片全部检查完毕');
  if (allOK) {
    console.log('二维码图片全部正常可用 :)')
  }

  await browser.close();
  console.log(`\n浏览器已关闭`);

})();