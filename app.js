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

// 检查今日是否更新
async function fetchContent(url, titleText) {
    try {
        const response = await axios.get(url, { headers: COMMON_HEADERS });
        if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const divs = $('div.title');
            let result = "";
            let todayIncluded = false;
            const today = dayjs().startOf('day');
            const threeDaysAgo = today.subtract(60, 'day');

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

async function fetchJwyx() {
    return await fetchContent("https://jwc.cuit.edu.cn/tzgg/jxyx.htm", "教学运行");
}

async function fetchTzgg() {
    return await fetchContent("https://jwc.cuit.edu.cn/tzgg.htm", "通知公告");
}

async function readNewsFile() {
    try {
        const content = await fs.readFile('news.md', 'utf8');
        return content;
    } catch (error) {
        console.error('存档读取失败:', error);
        return '';
    }
}

async function updateNewsFile(content) {
    try {
        await fs.writeFile('news.md', content, 'utf8');
        console.log('存档成功');
    } catch (error) {
        console.error('存档失败:', error);
    }
}

async function pushNotification(url, payload) {
    try {
        const response = await axios.post(url, payload);
        console.log(response.data.msg);
        return true;
    } catch (error) {
        console.error(`推送失败: ${error}`);
        return false;
    }
}

async function pushplus(content) {
    const TOKEN = process.env.PUSHPLUS_TOKEN;
    const TOPIC = process.env.PUSHPLUS_TOPIC || '';

    if (!TOKEN) {
        console.log('PUSHPLUS_TOKEN 未设置，跳过 Pushplus 推送。');
        return false;
    }

    const url = 'http://www.pushplus.plus/send/';
    const payload = {
        token: TOKEN,
        title: "成都信息工程大学教务处通知",
        content: content,
        topic: TOPIC,
        template: "markdown"
    };

    return await pushNotification(url, payload);
}

async function serverChan(content) {
    const SCKEY = process.env.SERVERCHAN_SCKEY;

    if (!SCKEY) {
        console.log('SERVERCHAN_SCKEY 未设置，跳过 Server酱 推送。');
        return false;
    }

    const url = `https://sctapi.ftqq.com/${SCKEY}.send`;
    const payload = {
        title: "成都信息工程大学教务处通知",
        desp: content
    };

    return await pushNotification(url, payload);
}

async function main() {
    const jwyxResult = await fetchJwyx();
    const tzggResult = await fetchTzgg();

    const content = jwyxResult.content + "\n\n" + tzggResult.content;

    if (content && (jwyxResult.todayIncluded || tzggResult.todayIncluded)) {
        const oldContent = await readNewsFile();
        if (content !== oldContent) {
            const pushplusSuccess = await pushplus(content);
            const serverChanSuccess = await serverChan(content);

            if (pushplusSuccess || serverChanSuccess) {
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

main();