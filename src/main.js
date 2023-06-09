const request = require('request');
const readline = require('readline');
const chalk = require('chalk');
const storage = require('node-persist');
const { SocksProxyAgent } = require('socks-proxy-agent');
const config = require('./config');
const utils = require('./utils');
const settings = require('./settings');

let proxy;

const {
  showConfigTips,
  message,
  clearUserMessage,
  get,
  repeat,
  gptSay,
  isProxyUrl,
  showUsageTips,
} = utils;

function checkProxy() {
  if (settings.proxy && settings.proxy.startsWith('socks')) {
    proxy = new SocksProxyAgent(settings.proxy);
  }
}

// vars
let inputing = false;
let readUserInput;
const postData = {
  model: config.model,
  messages: config.messages,
  stream: config.stream,
};

// entry
(async () => {
  // CONTINUOUS
  await storage.init({ dir: `${process.env.HOME}/.chat-gpt` });
  settings.continuous = await storage.getItem('CONTINUOUS');

  // API-KEY
  const apiKey = await storage.getItem('API_KEY');
  if (apiKey) {
    settings.key = apiKey;
  }

  // PROXY
  if (settings.proxy) {
    gptSay(`检测到terminal已配置代理:${config.proxy}`);
    checkProxy();
  } else {
    const configProxy = await storage.getItem('PROXY');
    if (configProxy) {
      settings.proxy = configProxy;
      checkProxy();
    }
  }

  // SESSION
  settings.session = await storage.getItem('SESSION');

  watchUserInput();

  gptSay('启动配置检查...');
  gptSay(`${settings.proxy ? '✔' : '✘'} 代理配置`);
  gptSay(`${settings.key ? '✔' : '✘'} API KEY配置`);
  gptSay(`${settings.continuous === 'Y' ? '✔' : '✘'} 连续对话`);

  // 开始提问
  ask();
})();

function watchUserInput() {
  readUserInput = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  // 键盘输入
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', (key, data) => {
    if (inputing) return;
    const isCtrlWithC = data.ctrl && data.name === 'c';
    const chat_q = data.name === 'q';

    if (isCtrlWithC || chat_q) {
      gptSay('已终止');
      process.exit();
    }
  });
}

function addContext(content) {
  if (settings.continuous === 'Y') {
    postData.messages.push(message(content));
  } else {
    postData.messages = config.messages;
    postData.messages.push(message(content));
  }
}

function clear() {
  postData.messages = clearUserMessage(postData.messages);
}

function ask() {
  inputing = true;
  gptSay('输入你的问题');
  readUserInput.question(
    chalk.yellow(`> ${repeat(' ', 5)}我: `),
    async (content) => {
      inputing = false;

      if (content && content.startsWith('$config.')) {
        const shell = content.replace(/^\$config./, '');
        const params = shell.split('=');
        if (params.length !== 2) {
          gptSay('参数错误');
          showConfigTips();
          ask();
          return;
        }
        const [key, value = ''] = params;
        const v = value.trim();
        switch (key.toLowerCase().trim()) {
          case 'proxy':
            if (isProxyUrl(v)) {
              storage.setItem('PROXY', v);
              settings.proxy = v;
              gptSay('代理配置成功');
            } else {
              gptSay('代理url格式错误，参考如下格式:http://127.0.0.1:8081');
            }
            ask();
            break;
          case 'key':
            storage.setItem('API_KEY', v);
            settings.key = v;
            gptSay('API KEY配置成功');
            ask();
            break;
          case 'continuous':
            if (['Y', 'N'].includes(v.toUpperCase())) {
              storage.setItem('CONTINUOUS', v.toUpperCase());
              gptSay('连续对话配置成功');
              ask();
            }
            break;
          case 'session':
            storage.setItem('SESSION', v.trim());
            settings.session = v.trim();
            gptSay('session设置成功，你可以使用usage指令查询chatgpt的使用情况');
            ask();
            break;
          case '':
            gptSay('请输入指令');
            showUsageTips();
            break;
          default:
            gptSay('未知指令');
            showUsageTips();
            ask();
        }
        return;
      }

      switch (content.toLowerCase().trim()) {
        case '?':
        case '？':
          showUsageTips();
          ask();
          return;
        case 'exit':
        case '\\q':
        case 'q':
          process.exit(0);
        case 'clear':
        case 'c':
          clear();
          gptSay('记录已清除');
          console.clear();
          ask();
          return;
        case 'aaa':
          const v = await storage.getItem('CONTINUOUS');
          const newV = v === 'Y' ? 'N' : 'Y';
          await storage.setItem('CONTINUOUS', newV);
          settings.continuous = newV;
          gptSay(
            `已切换${settings.continuous === 'Y' ? '连续对话' : '单句对话'}模式`
          );
          ask();
          return;
        case 'usage':
          requestUsage(() => {
            ask();
          });
          return;
        case 'reset':
          await reset();
          ask();
          return;
        case '':
          gptSay('请输入问题后再回车');
          ask();
          return;
      }

      addContext(content);
      requestGPT();
    }
  );
}

async function reset() {
  await storage.removeItem('PROXY');
  await storage.removeItem('API_KEY');
  await storage.removeItem('CONTINUOUS');
  await storage.removeItem('SESSION');
  gptSay('配置已重置');
}

function requestGPT() {
  if (!settings.key) {
    gptSay('请先配置API KEY');
    showConfigTips();
    ask();
    return;
  }
  const options = {
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: {
      connection: 'close',
      'transfer-encoding': 'chunked',
      pragma: 'no-cache',
      'cache-control': 'no-cache',
      authorization: `Bearer ${settings.key}`,
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    },
    json: postData,
    encoding: null,
    strictSSL: false,
    rejectUnauthorized: false,
    followRedirect: false,
    // ...(settings.proxy ? { proxy: settings.proxy } : {}),
  };
  // 支持socks代理
  if (settings.proxy && proxy) {
    options.agent = proxy;
  } else if (settings.proxy) {
    options.proxy = settings.proxy;
  }

  gptSay('处理中...');

  request(options)
    .on('data', (data) => {
      const dataString = data.toString();
      try {
        let isDone = false;
        dataString.split(/\n/).forEach((str) => {
          if (str && str.includes('data: [DONE]')) {
            process.stdout.write('\n\n');
            isDone = true;
            return;
          }
          if (str.length === 0) return;
          const json = JSON.parse(str.replace(/^data:\s*/, ''));
          get(json, 'choices[0].delta.content') &&
            process.stdout.write(`\x1b[36m${json.choices[0].delta.content}`);
        });
        if (isDone) {
          setTimeout(() => {
            ask();
          }, 1000);
        }
      } catch (err) {
        console.log('parseError', data.toString());
      }
    })
    .on('response', () => {
      process.stdout.write(gptSay());
    })
    .on('error', (err) => {
      gptSay(`[ERROR]：${err.message}`);
      setTimeout(() => {
        ask();
      }, 1000);
    });
}

// catch global error and continue run
process.on('uncaughtException', async (err) => {
  gptSay(`[ERROR]：${err.message}`);
  setTimeout(() => {
    ask();
  }, 1000);
});
function requestUsage(callback) {
  if (!settings.session) {
    gptSay('请先设置sessionId,再使用usage指令');
    gptSay('Example: $config.session=xxx');
    ask();
    return;
  }
  const options = {
    url: 'https://api.openai.com/dashboard/billing/credit_grants',
    params: {},
    headers: {
      pragma: 'no-cache',
      'cache-control': 'no-cache',
      authorization: `Bearer ${settings.session}`,
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    },
    strictSSL: false,
    rejectUnauthorized: false,
    followRedirect: false,
    ...(settings.proxy ? { proxy: settings.proxy } : {}),
  };
  request(options, (error, response, body) => {
    if (error) {
      gptSay(error.message);
    } else {
      try {
        const data = JSON.parse(body);
        console.table([
          {
            used: data.total_used,
            available: data.total_available,
            total: data.total_granted,
          },
        ]);
      } catch (err) {
        gptSay(err.message);
      }
    }
    callback && callback();
  });
}
