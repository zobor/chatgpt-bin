const chalk = require('chalk');
const shellTips = `
如何设置：
    1、如何设置API KEY
    我: ${chalk.magenta('$config.key=YOUR_CHAT_GPT_KEY')}

    2、如何设置代理
    我: ${chalk.magenta('$config.proxy=http://127.0.0.1:8081')}
`;
const usageTips = `
你可以在提示你输入问题时候，输入如下指令：
    ${chalk.magenta('q')}: 退出
    ${chalk.magenta('exit')}: 退出
    ${chalk.magenta('clear')}: 清除上下文（给ChatGPT提新的问题）
    ${chalk.magenta('$config.key=xyz')}: 设置ChatGPT的API KEY
    ${chalk.magenta('$config.proxy=http://127.0.0.1:8081')}: 设置代理
    ${chalk.magenta('$config.reset=true')}: 清空设置
`;

const config = {
  messages: [
    {
      role: 'system',
      content:
        "You are an AI programming assistent. - Follow the user's requirements carefully & to the letter. -Then ouput the code in a sigle code block - Minimize any other prose.",
    },
  ],
  model: 'gpt-3.5-turbo',
  stream: true,
  shellTips,
  usageTips,
};
module.exports = config;
