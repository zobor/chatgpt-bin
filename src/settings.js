const settings = {
  proxy: process.env.http_proxy || process.env.https_proxy,
  key: '',
  continuous: 'N',
  session: '',
};

module.exports = settings;
