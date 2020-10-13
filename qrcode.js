let fs = require('fs')
let puppeteer = require('puppeteer')
let config = require('./config/config')

// 启动浏览器并拼装二维码所对应的URL数据

const initBrowserConfig = () => {
  let config = {
    defaultViewport: {
      width: 1920,
      height: 935,
    },
    headless: false,
    devtools: false,
  }

  return config
}

const launchBrowser = async () => {
  const browserConfig = initBrowserConfig()
  let browser = await puppeteer.launch(browserConfig)

  console.log(`\n已启动浏览器\n`)

  return browser
}

const createNewPage = async (browser) => {
  const chromeUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36'

  let page = await browser.newPage()
  page.setUserAgent(chromeUserAgent)

  console.log(`已新建标签页\n`)

  return page
}

const concatUrlFromConfig = () => {
  let urls = []

  if (config.array && config.array.length > 0) {
    config.array.forEach(ele => {
      urls.push(`${config.baseUrl}${ele}${config.fileExtension}`);
    });
  } else if (config.startIndex) {
    for (let i = 0; i < config.count; i++) {
      urls.push(`${config.baseUrl}${config.startIndex + i}${config.fileExtension}`);
    }
  }

  return urls
}

// 生成二维码

const typeUrlText = async (page, url) => {
  console.log('01. 即将输入网址')

  // TODO: 想用 Promise.all 把下面这些语句统一起来一次执行
  // 就会卡在 click 函数上，但是报错却说 waitForNavigation 超时
  await page.waitForSelector('#url_content')

  // 草料网现在增加了检测机制，必须点击输入框之后才能模拟输入文字
  // delay 设置为 50，是为了模拟正常速度，降低草料网 API 调用频率
  await page.tap('#url_content')
  await page.type('#url_content', url, { delay: 15, })

  await page.waitForSelector('#click-create')
  await page.click('#click-create')

  // 输入网址生成二维码图片后，URL会变化，所以这一行不能省略
  await page.waitForNavigation()
}

// 设置二维码容错级别为 7%
const setDataLevel = async (page) => {
  // 点击选择 7% 的容错级别
  await page.waitForSelector('#level>label>input[value="L"]')
  await page.click('#level>label>input[value="L"]')

  console.log('02. 二维码图片生成中')
}

const getImageSource = async (page) => {
  let qrcode = await page.$('#qrimage')
  console.log('03. 二维码图片已生成')

  // 在这里需等待一会儿，才能正常获取到图片元素的 src 属性
  // 否则获取到的只是图片的 base64 值
  await page.waitForTimeout(1000)
  let imgSrc = await page.evaluate(() => {
    return document.querySelector('#qrimage').getAttribute('src')
  });
  await page.waitForTimeout(1000)
  console.log(imgSrc)
  let viewSource = await page.goto(`https:${imgSrc}`)
  return viewSource
}

const saveImage = async (idx, viewSource) => {
  let imgName = ''
  let imgPath = ''

  // 二维码图片非连续编号
  if (config.array && config.array.length > 0) {
    imgName = config.array[idx]
    imgPath = `img/${config.array[idx]}.png`
  }
  // 二维码图片连续编号
  else if (config.startIndex) {
    imgName = config.startIndex + idx
    imgPath = `img/${config.startIndex + idx}.png`
  }

  fs.writeFile(imgPath, await viewSource.buffer(), function (err) {
    if (err) {
      return console.log(err)
    }
  })
  console.log(`04. 二维码图片 ${imgName} 已保存\n`)
}

const generateQrcodes = async (urls, page) => {
  for (let idx = 0; idx < urls.length; idx++) {
    await page.goto('https://cli.im/url')
    await typeUrlText(page, urls[idx])
    await setDataLevel(page)
    let viewSource = await getImageSource(page)
    saveImage(idx, viewSource)
    await page.waitForTimeout(1000)
  }
}

// 检查二维码

const navToDeqrPage = async (idx, page) => {
  await page.goto('https://cli.im/deqr', {
    waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']
  });
  if (idx === 0) {
    console.log('二维码扫描页面已完全加载\n')
  }

  console.log(`第${idx + 1}个二维码检查中……\n`)
}

const uploadImage = async (page, idx) => {
  await page.waitForSelector('div.deqr-icon.deqr-icon-upload')

  let [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click('div.deqr-icon.deqr-icon-upload'),
  ])
  await page.waitForTimeout(1000)

  let imgName = ''
  if (config.array && config.array.length > 0) {
    imgName = `img/${config.array[idx]}.png`
  } else {
    imgName = `img/${config.startIndex + idx}.png`
  }

  await fileChooser.accept([imgName])
  await page.waitForTimeout(1000)
}

const compareQrcodeWithUrl = async (page, url) => {
  const innerText = await page.evaluate(() => document.querySelector('div.result').innerText);

  if (innerText !== url) {
    allOK = false;
    console.log('二维码图片内容有误');
    console.log(`innerText: ${innerText}`)
    console.log(url)
    console.log('请为上面的网址重新生成二维码图片并再次检查')
    console.log('\n')
    return false
  } else {
    console.log('二维码正确\n')
    return true
  }
}

const checkQrcodes = async (urls, page) => {
  let allOK = true
  for (let idx = 0; idx < urls.length; idx++) {
    await navToDeqrPage(idx, page)
    await uploadImage(page, idx)
    const qrcodeOk = await compareQrcodeWithUrl(page, urls[idx])
    if (!qrcodeOk) {
      allOK = false
    }
  }
  if (allOK) {
    console.log('二维码图片全部正常可用')
  } else {
    console.log('请检查出错的二维码')
  }
}

// 收尾

const closeBrowser = async (browser) => {
  await browser.close()
  console.log(`\n浏览器已关闭`)
}

(async () => {
  let browser = await launchBrowser()
  let page = await createNewPage(browser)
  let urls = concatUrlFromConfig()
  await generateQrcodes(urls, page)
  await checkQrcodes(urls, page)
  await closeBrowser(browser)
})()
