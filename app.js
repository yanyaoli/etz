const { pushplus, serverChan, wechatBot } = require('./notifier');

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const dayjs = require('dayjs');
const isBetween = require('dayjs/plugin/isBetween');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const fs = require('fs').promises;

dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

const COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
};

// 教务处
async function fetchContent(url, titleText) {
    try {
        const response = await axios.get(url, { headers: COMMON_HEADERS });
        if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const divs = $('div.title');
            let result = "";
            let todayIncluded = false;
            const today = dayjs().startOf('day');
            const threeDaysAgo = today.subtract(3, 'day');

            divs.each((index, div) => {
                const h5 = $(div).find('h5');
                const a = h5.find('a');
                const h6Text = $(div).find('h6').text().trim();
                const date = dayjs(h6Text, 'YYYY/MM/DD', true);

                if (date.isValid() && date.isBetween(threeDaysAgo, today, null, '[]')) {
                    const href = new URL(a.attr('href'), url).href;
                    const text = `${a.text().trim()} (${h6Text})`;
                    result += `[${text}](${href})\n\n`;
                    if (date.isSame(today, 'day')) {
                        todayIncluded = true;
                    }
                }
            });
            return { content: result ? `[【${titleText}】(点击查看更多)](${url})\n\n` + result : "", todayIncluded };
        } else {
            console.error('页面访问失败');
            return { content: "", todayIncluded: false };
        }
    } catch (error) {
        console.error(`${titleText} 获取失败: ${error}`);
        return { content: "", todayIncluded: false };
    }
}

// 教务处-教务运行
async function fetchJwyx() {
    return await fetchContent("https://jwc.cuit.edu.cn/tzgg/jxyx.htm", "教学运行");
}

// 教务处-通知公告
async function fetchTzgg() {
    return await fetchContent("https://jwc.cuit.edu.cn/tzgg.htm", "通知公告");
}

// 官网新闻中心-通知公告
async function fetchXxgg() {
    const url = "https://www.cuit.edu.cn/index/tzgg.htm";
    const titleText = "信息公告";

    try {
        const response = await axios.get(url, { headers: COMMON_HEADERS });
        if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const items = $('ul.list li[data-aos="fade-up"]');
            let result = "";
            let todayIncluded = false;
            const today = dayjs().startOf('day');
            const threeDaysAgo = today.subtract(3, 'day');

            items.each((index, item) => {
                const dateText = $(item).find('span').text().trim();
                const date = dayjs(dateText, 'YYYY-MM-DD', true);
                if (date.isValid() && date.isBetween(threeDaysAgo, today, null, '[]')) {
                    const a = $(item).find('a');
                    const href = new URL(a.attr('href'), url).href;
                    const text = `${a.attr('title')} (${dateText})`;
                    result += `[${text}](${href})\n\n`;
                    if (date.isSame(today, 'day')) {
                        todayIncluded = true;
                    }
                }
            });

            return { content: result ? `[【${titleText}】(点击查看更多)](${url})\n\n` + result : "", todayIncluded };
        } else {
            console.error(`${titleText} 页面访问失败`);
            return { content: "", todayIncluded: false };
        }
    } catch (error) {
        console.error(`${titleText} 获取失败: ${error}`);
        return { content: "", todayIncluded: false };
    }
}

// 学生处-公示栏
async function fetchGsl() {
    const url = "https://xsgzc.cuit.edu.cn/index/gsl.htm";
    const titleText = "公示栏";

    try {
        const response = await axios.get(url, { headers: COMMON_HEADERS });
        if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const items = $('ul.nav-left li.list');
            let result = "";
            let todayIncluded = false;
            const today = dayjs().startOf('day');
            const threeDaysAgo = today.subtract(3, 'day');

            items.each((index, item) => {
                const dateText = $(item).find('span.date').text().trim();
                const date = dayjs(dateText, 'YYYY-MM-DD', true);
                if (date.isValid() && date.isBetween(threeDaysAgo, today, null, '[]')) {
                    const a = $(item).find('a.list_data');
                    const href = new URL(a.attr('href'), url).href;
                    const text = `${a.attr('title')} (${dateText})`;
                    result += `[${text}](${href})\n\n`;
                    if (date.isSame(today, 'day')) {
                        todayIncluded = true;
                    }
                }
            });

            return { content: result ? `[【${titleText}】(点击查看更多)](${url})\n\n` + result : "", todayIncluded };
        } else {
            console.error(`${titleText} 页面访问失败`);
            return { content: "", todayIncluded: false };
        }
    } catch (error) {
        console.error(`${titleText} 获取失败: ${error}`);
        return { content: "", todayIncluded: false };
    }
}

// 读档
async function readNewsFile() {
    try {
        const content = await fs.readFile('news.md', 'utf8');
        return content;
    } catch (error) {
        console.error('存档读取失败:', error);
        return '';
    }
}

// 存档
async function updateNewsFile(content) {
    try {
        await fs.writeFile('news.md', content, 'utf8');
        console.log('存档成功');
    } catch (error) {
        console.error('存档失败:', error);
    }
}

async function main() {
    const jwyxResult = await fetchJwyx(); // 教务处-教务运行
    const tzggResult = await fetchTzgg(); // 教务处-通知公告
    const xxggResult = await fetchXxgg(); // 官网新闻中心-信息公告
    const gslResult = await fetchGsl(); // 学生处-公示栏

    const content = jwyxResult.content + "\n\n" + tzggResult.content + "\n\n" + xxggResult.content + "\n\n" + gslResult.content;

    if (content && (jwyxResult.todayIncluded || tzggResult.todayIncluded || xxggResult.todayIncluded || gslResult.todayIncluded)) {
        const oldContent = await readNewsFile();
        if (content !== oldContent) {
            const pushplusSuccess = await pushplus(content);
            const serverChanSuccess = await serverChan(content);
            const wechatBotSuccess = await wechatBot(content);

            if (pushplusSuccess || serverChanSuccess || wechatBotSuccess) {
                await updateNewsFile(content);
            } else {
                console.log('所有推送方式均失败。');
            }
        } else {
            console.log('内容未变更，不推送。');
        }
    } else {
        console.log('今日无更新，不推送。');
    }
}

// 测试
async function testMain() {
    const jwyxResult = await fetchJwyx(); // 教务运行
    const tzggResult = await fetchTzgg(); // 通知公告
    const xxggResult = await fetchXxgg(); // 信息公告
    const gslResult = await fetchGsl(); // 公示栏

    const content = jwyxResult.content + "\n\n" + tzggResult.content + "\n\n" + xxggResult.content + "\n\n" + gslResult.content;

    if (content) {
        const oldContent = await readNewsFile();
        if (content !== oldContent) {
            const pushplusSuccess = await pushplus(content);
            const serverChanSuccess = await serverChan(content);
            const wechatBotSuccess = await wechatBot(content);

            if (pushplusSuccess || serverChanSuccess || wechatBotSuccess) {
                await updateNewsFile(content);
            } else {
                console.log('所有推送方式均失败。');
            }
        } else {
            console.log('内容未变更，不推送。');
        }
    } else {
        console.log('无内容，不推送。');
    }
}

main();

// testMain();