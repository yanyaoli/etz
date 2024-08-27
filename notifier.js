const axios = require('axios');

// Pushplus 推送
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

// Server酱 推送
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

// 企业微信BOT 推送
async function wechatBot(content) {
    const WECHAT_BOT_URL = process.env.WECHAT_BOT_URL;

    if (!WECHAT_BOT_URL) {
        console.log('WECHAT_BOT_URL 未设置，跳过企业微信BOT推送。');
        return false;
    }

    const payload = {
        msgtype: "markdown",
        markdown: {
            content: content
        }
    };

    return await pushNotification(WECHAT_BOT_URL, payload);
}

// 推送请求函数
async function pushNotification(url, payload) {
    try {
        const response = await axios.post(url, payload);
        console.log(response.data.msg || '推送成功');
        return true;
    } catch (error) {
        console.error(`推送失败: ${error}`);
        return false;
    }
}

// 导出模块
module.exports = {
    pushplus,
    serverChan,
    wechatBot
};
