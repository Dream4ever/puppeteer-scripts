var puppeteer = require('puppeteer');
var fs = require('fs');

(async () => {

  var browser = await puppeteer.launch({
    // headless: false,
  });
  console.log(`浏览器已启动`);

  var page = await browser.newPage();
  console.log(`页面已新建`);

  var albumUrl = 'https://www.ximalaya.com/renwen/3400890/';
  var baseUrl = `${albumUrl}p`;

  await page.setViewport({
    width: 1440,
    height: 900,
  });
  await page.goto(albumUrl, {
    waitUntil: 'networkidle0'
  });

  var pageCountDom = 'ul.pagination-page>li:nth-last-child(2)>a>span';
  var pageHandle = await page.$(pageCountDom);
  const pageCount = parseInt(await page.evaluate(pageIndex => pageIndex.innerHTML, pageHandle));
  await pageHandle.dispose();

  var line = '';
  var totalCount = 0;

  for (var pageIndex = 1; pageIndex < pageCount + 1; pageIndex++) {
    if (pageIndex > 1) {
      await page.goto(`${baseUrl}${pageIndex}/`, {
        waitUntil: 'networkidle0'
      });
    }
    console.log(`页面已加载完成\n`);

    // 显示当前页面标题
    var titleHandle = await page.$('title');
    var titleContent = await page.evaluate(title => title.innerHTML, titleHandle);
    await titleHandle.dispose();
    console.log(`当前页面：${titleContent.split('_')[0].substr(6) || '第1页'}`);

    var soundsCount = (await page.$$('div.sound-list>ul>li')).length;
    console.log(`当前页面音频数量：${soundsCount}\n`);

    for (var soundIndex = 1; soundIndex < soundsCount + 1; soundIndex++) {
      console.log(`第${soundIndex}个音频：`);

      await page.waitForSelector(`div.sound-list>ul>li:nth-child(${soundIndex})>div:nth-child(1)>div>div.defaultDOM>span`);
      var soundHandle = await page.$(`div.sound-list>ul>li:nth-child(${soundIndex})>div:nth-child(1)>div>div.defaultDOM>span`);
      await page.evaluate(sound => {
        // 如果不让当前元素显示在页面视图中，点击操作有时就会无效
        sound.scrollIntoView();
        sound.click();
      }, soundHandle);
      await soundHandle.dispose();

      var response = await page.waitForResponse(response => response.url().startsWith('http://audio.xmcdn.com/'));
      console.log(`地址: ${response.url()}`);

      var titleHandle = await page.$(`div.sound-list>ul>li:nth-child(${soundIndex})>div.text>a`);
      var soundTitle = await page.evaluate(title => title.innerText, titleHandle);
      await titleHandle.dispose();
      console.log(`标题：${soundTitle}\n`);

      totalCount++;

      // 这里无需等待，否则资源爬取反而经常会超时失败
      // await page.waitFor(5000);

      line += `${pageIndex},${soundIndex},${totalCount},${response.url()},${soundTitle}\n`;
    }
  }

  fs.writeFile('/Users/samsara/Downloads/urls.txt', line, (err) => {
    if (err) throw err;
    console.log('\n音频资源抓取完毕\n');
  });

  while (false) {

    // 逐个下载音频
    // 返回之前的列表页

    // 点击下一页按钮
    // https://github.com/GoogleChrome/puppeteer/issues/1412
    // 点击页面和等待页面导航会产生 race condition
    // 到第 30 页时，点击下一页按钮之后，page.waitForNavigation 经常出现 30 秒超时错误
    // await Promise.all([
    //   page.waitForNavigation({
    //     waitUntil: 'load',
    //   }).then(() => {
    //     console.log('新页面已加载完毕\n');
    //   }),
    //   page.click('li.page-next')
    //   .then(() => {
    //     console.log('下一页按钮已点击');
    //   }),
    // ]);
  }

  await browser.close();
  console.log(`\n浏览器已关闭`);
})();