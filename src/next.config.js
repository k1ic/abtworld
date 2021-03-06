/* eslint import/no-extraneous-dependencies:"off" */
require('dotenv').config();

const path = require('path');
const withCSS = require('@zeit/next-css');
const withCustomBabelConfigFile = require('next-plugin-custom-babel-config');
const withBundleAnalyzer = require('@zeit/next-bundle-analyzer');
const withPlugins = require('next-compose-plugins');
// const withTranspile = require('next-transpile-modules');

if (typeof require !== 'undefined') {
  require.extensions['.css'] = () => {};
}

module.exports = withPlugins(
  [
    [
      withCustomBabelConfigFile,
      {
        babelConfigFile: path.join(__dirname, './babel.config.js'),

        env: {
          appName: process.env.APP_NAME,
          appDescription: process.env.APP_DESCRIPTION,
          appInfoLink: process.env.APP_INFO_LINK,
          baseUrl: process.env.BASE_URL,
          appId: process.env.APP_ID,
          appOwnerAccount: process.env.APP_OWNER_ACCOUNT,
          appAdminAccounts: process.env.APP_ADMIN_ACCOUNTS,
          apiPrefix: process.env.NF_API_PREFIX || process.env.API_PREFIX || '',
          chainName: process.env.CHAIN_NAME,
          chainHost: process.env.CHAIN_HOST,
          chainId: process.env.CHAIN_ID,
          assetChainName: process.env.ASSET_CHAIN_NAME,
          assetChainHost: process.env.ASSET_CHAIN_HOST,
          assetChainId: process.env.ASSET_CHAIN_ID,
        },

        webpack: config => {
          // Fixes npm packages that depend on `fs` module
          config.node = {
            fs: 'empty',
          };

          const originalEntry = config.entry;
          config.entry = async () => {
            const entries = await originalEntry();
            if (entries['main.js']) {
              entries['main.js'].unshift('@babel/polyfill');
            }
            return entries;
          };

          // fixes https://github.com/graphql/graphql-js/issues/1272
          config.module.rules.push({
            test: /\.mjs$/,
            include: /node_modules/,
            type: 'javascript/auto',
          });

          return config;
        },
      },
    ],
    [
      withCSS,
      {
        cssModules: false,
        cssLoaderOptions: {
          url: false,
        },
      },
    ],
    [
      withBundleAnalyzer,
      {
        analyzeServer: ['server', 'both'].includes(process.env.BUNDLE_ANALYZE),
        analyzeBrowser: ['browser', 'both'].includes(process.env.BUNDLE_ANALYZE),
        bundleAnalyzerConfig: {
          server: {
            analyzerMode: 'static',
            reportFilename: '../dist/server.html',
          },
          browser: {
            analyzerMode: 'static',
            reportFilename: '../dist/client.html',
          },
        },
      },
    ],
  ],
  {}
);
