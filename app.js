const { pushplus, serverChan, wechatBot, wecomBot, Bark } = require('./notifier');
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const fs = require('fs').promises;

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
            let result = [];
            const today = dayjs().startOf('day');

            divs.each((index, div) => {
                const h5 = $(div).find('h5');
                const a = h5.find('a');
                const h6Text = $(div).find('h6').text().trim();
                const date = dayjs(h6Text, 'YYYY/MM/DD', true);

                if (date.isValid() && date.isSame(today, 'day')) {
                    const href = new URL(a.attr('href'), url).href;
                    const text = `${a.text().trim()}`;
                    result.push({ titleText, text, href, url });
                }
            });
            return result;
        } else {
            console.error('页面访问失败');
            return [];
        }
    } catch (error) {
        console.error(`${titleText} 获取失败: ${error}`);
        return [];
    }
}

// 教务处-教学运行
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
    const titleText = "新闻中心通知公告";

    try {
        const response = await axios.get(url, { headers: COMMON_HEADERS });
        if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const items = $('ul.list li[data-aos="fade-up"]');
            let result = [];
            const today = dayjs().startOf('day');

            items.each((index, item) => {
                const dateText = $(item).find('span').text().trim();
                const date = dayjs(dateText, 'YYYY-MM-DD', true);
                if (date.isValid() && date.isSame(today, 'day')) {
                    const a = $(item).find('a');
                    const href = new URL(a.attr('href'), url).href;
                    const text = `${a.attr('title')}`;
                    result.push({ titleText, text, href, url });
                }
            });

            return result;
        } else {
            console.error(`${titleText} 页面访问失败`);
            return [];
        }
    } catch (error) {
        console.error(`${titleText} 获取失败: ${error}`);
        return [];
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
            let result = [];
            const today = dayjs().startOf('day');

            items.each((index, item) => {
                const dateText = $(item).find('span.date').text().trim();
                const date = dayjs(dateText, 'YYYY-MM-DD', true);
                if (date.isValid() && date.isSame(today, 'day')) {
                    const a = $(item).find('a.list_data');
                    const href = new URL(a.attr('href'), url).href;
                    const text = `${a.attr('title')}`;
                    result.push({ titleText, text, href, url });
                }
            });

            return result;
        } else {
            console.error(`${titleText} 页面访问失败`);
            return [];
        }
    } catch (error) {
        console.error(`${titleText} 获取失败: ${error}`);
        return [];
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

// 格式化微信推送内容
function formatWechatBotContent(items, dateInfo) {
    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.titleText]) {
            acc[item.titleText] = [];
        }
        acc[item.titleText].push(item);
        return acc;
    }, {});

    let content = `${dateInfo}\n\n`;
    for (const [titleText, group] of Object.entries(groupedItems)) {
        content += `【${titleText}】\n`;
        group.forEach(item => {
            content += `${item.text}\n${item.href}\n\n`;
        });
    }
    return content;
}

// 格式化 Markdown 内容
function formatMarkdownContent(items, dateInfo) {
    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.titleText]) {
            acc[item.titleText] = [];
        }
        acc[item.titleText].push(item);
        return acc;
    }, {});

    let content = `${dateInfo}\n\n`;
    for (const [titleText, group] of Object.entries(groupedItems)) {
        content += `## ${titleText}\n`;
        group.forEach(item => {
            content += `- [${item.text}](${item.href})\n`;
        });
        content += '\n';
    }
    return content;
}

async function main() {
    const jwyxItems = await fetchJwyx(); // 教务处-教务运行
    const tzggItems = await fetchTzgg(); // 教务处-通知公告
    const xxggItems = await fetchXxgg(); // 官网新闻中心-通知公告
    const gslItems = await fetchGsl(); // 学生处-公示栏

    const allItems = [...jwyxItems, ...tzggItems, ...xxggItems, ...gslItems];

    if (allItems.length > 0) {
        const today = dayjs().format('YYYY年M月D日');
        const wechatBotContent = formatWechatBotContent(allItems, today);
        const markdownContent = formatMarkdownContent(allItems, today);
        const fullContent = markdownContent;

        const oldContent = await readNewsFile();
        if (fullContent !== oldContent) {
            const pushplusSuccess = await pushplus(fullContent);
            const serverChanSuccess = await serverChan(fullContent);
            const wechatBotSuccess = await wechatBot(wechatBotContent);
            const wecomBotSuccess = await wecomBot(fullContent);
            const BarkBotSuccess = await Bark(fullContent);

            if (pushplusSuccess || serverChanSuccess || wechatBotSuccess || wecomBotSuccess || BarkBotSuccess) {
                await updateNewsFile(fullContent);
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

module.exports = {
    fetchJwyx,
    fetchTzgg,
    fetchXxgg,
    fetchGsl,
    readNewsFile,
    updateNewsFile,
    formatWechatBotContent,
    formatMarkdownContent
};

main();