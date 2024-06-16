const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const dayjs = require('dayjs');
const isBetween = require('dayjs/plugin/isBetween');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(isBetween);
dayjs.extend(customParseFormat);

const COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
};

// 获取日期为最近三天的内容
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
                    a.attr('href', new URL(a.attr('href'), url).href);
                    a.text(`${a.text().trim()} (${h6Text})`);
                    result += $.html(a) + "<br/>";
                    if (date.isSame(today, 'day')) {
                        todayIncluded = true;
                    }
                }
            });
            return { content: result ? `<a href='${url}'>【${titleText}】(点击查看更多)<a/><br/>` + result : "", todayIncluded };
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

async function pushplus() {
    const TOKEN = process.env.TOKEN;
    const TOPIC = process.env.TOPIC || '';

    const jwyxResult = await fetchJwyx();
    const tzggResult = await fetchTzgg();

    const content = jwyxResult.content + "<br/>" + tzggResult.content;
    const todayIncluded = jwyxResult.todayIncluded || tzggResult.todayIncluded;

    console.log(content);
    if (todayIncluded) {
        const url = 'http://www.pushplus.plus/send/';
        const payload = {
            token: TOKEN,
            title: "成都信息工程大学教务处通知",
            content: content,
            topic: TOPIC,
            template: "html"
        };

        try {
            const response = await axios.post(url, payload);
            const data = response.data;
            console.log(data.msg);
        } catch (error) {
            console.error(`推送失败: ${error}`);
        }
    } else {
        console.log('今日无更新，不推送。');
    }
}

// 调用推送函数
pushplus();
