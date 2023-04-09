const chalk = require('chalk');
const config = require('./config');

function message(content) {
  return { role: 'user', content: `${content}\n` };
}

function clearUserMessage(messages = []) {
  return messages.filter((item) => item.role !== 'user');
}

function get(obj, path, defaultValue) {
  // 如果path包含[n]，则匹配[n]，并使用正则表达式替换为.加上数字
  path = path.replace(/\[(\d+)\]/g, '.$1');
  // 将字符串转为数组
  path = path.split('.');
  // 遍历解析对象
  for (var i = 0; i < path.length; i++) {
    if (!obj || typeof obj !== 'object') return defaultValue;
    obj = obj[path[i]];
  }
  return obj === undefined ? defaultValue : obj;
}

function repeat(string, n) {
  let result = '';
  for (let i = 0; i < n; i++) {
    result += string;
  }
  return result;
}

function gptSay(text) {
  if (typeof text === 'undefined') return chalk.yellow('> chatgpt: ');
  console.log(chalk.yellow(`> chatgpt: ${chalk.cyan(text)}`));
}

function showUsageTips() {
  console.log(chalk.gray(config.usageTips));
}

function showConfigTips() {
  console.log(chalk.gray(config.shellTips));
}

function isProxyUrl(url) {
  return /http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}/.test(url);
}

module.exports = {
  message,
  clearUserMessage,
  get,
  repeat,
  gptSay,
  showUsageTips,
  showConfigTips,
  isProxyUrl,
};
