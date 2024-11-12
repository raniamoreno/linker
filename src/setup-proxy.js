// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://api.notion.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.originalUrl);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('Received response from target:', proxyRes.statusCode);
      },
    })
  );
};
