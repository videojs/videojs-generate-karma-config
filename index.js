/* eslint-disable no-console, camelcase */
const path = require('path');
const karmaPlugins = [];
const libPkg = require('./package.json');

// dynamically require  all local karma plugins
Object.keys(libPkg.dependencies).forEach(function(p) {
  if ((/^karma-/).test(p)) {
    karmaPlugins.push(require(p));
  }
});

/* browsers to run on teamcity */
const teamcityLaunchers = {};

/* browsers to run on browserstack */
const browserstackLaunchers = {
  bsChrome: {
    base: 'BrowserStack',
    browser: 'chrome',
    os: 'Windows',
    os_version: '10'
  },

  bsFirefox: {
    base: 'BrowserStack',
    browser: 'firefox',
    os: 'Windows',
    os_version: '10'
  },

  bsSafariSierra: {
    base: 'BrowserStack',
    browser: 'safari',
    os: 'OS X',
    os_version: 'Sierra'
  },

  bsEdgeWin10: {
    base: 'BrowserStack',
    browser: 'edge',
    os: 'Windows',
    os_version: '10'
  },

  bsIE11Win10: {
    base: 'BrowserStack',
    browser: 'ie',
    browser_version: '11',
    os: 'Windows',
    os_version: '10'
  },

  bsIE11Win7: {
    base: 'BrowserStack',
    browser: 'ie',
    browser_version: '11',
    os: 'Windows',
    os_version: '7'
  }
};

/* browsers to run on travis */
const travisLaunchers = {
  travisFirefox: {
    base: 'Firefox'
  },
  travisChrome: {
    base: 'Chrome',
    flags: ['--no-sandbox']
  }
};

module.exports = function(config) {
  const pkg = require(path.join(process.cwd(), 'package.json'));

  config.set({
    frameworks: ['qunit', 'detectBrowsers'],
    basePath: process.cwd(),
    customHeaders: [
      {match: '.*', name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate'},
      {match: '.*', name: 'Pragma', value: 'no-cache'},
      {match: '.*', name: 'Expires', value: '0'}
    ],
    customLaunchers: Object.assign(
      {},
      travisLaunchers,
      teamcityLaunchers,
      browserstackLaunchers
    ),
    client: {clearContext: false, qunit: {showUI: true, testTimeout: 5000}},

    detectBrowsers: {
      enabled: false,
      usePhantomJS: false
    },
    browserStack: {
      project: process.env.TEAMCITY_PROJECT_NAME || pkg.name,
      name: '',
      build: process.env.TRAVIS_BUILD_NUMBER || process.env.BUILD_NUMBER,
      pollingTimeout: 30000,
      captureTimeout: 600,
      timeout: 600
    },
    reporters: ['dots', 'coverage'],
    coverageReporter: {
      reporters: [
        // generates test/dist/coverage/index.html
        {type: 'html', dir: '.', subdir: 'test/dist/coverage'},

        // generates test/dist/coverage/lcov.info
        {type: 'lcovonly', dir: '.', subdir: 'test/dist/coverage'},

        // generates test/dist/coverage-final.json
        {type: 'json', dir: '.', subdir: 'test/dist/coverage'},

        // show a text summary on the command line
        {type: 'text', dir: '.', subdir: 'test/dist/coverage', file: 'text.txt'}
      ]
    },
    files: [
      'node_modules/video.js/dist/video-js.css',
      'dist/*.css',
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/video.js/dist/video.js',
      'test/dist/bundle.js'
    ],
    port: 9999,
    urlRoot: '/test/',
    middleware: ['staticServer'],
    plugins: karmaPlugins,
    colors: true,
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity,

    captureTimeout: 30000,
    browserNoActivityTimeout: 300000
  });

  /* dynamic configuration, for ci and detectBrowsers */

  // determine what browsers should be run on this environment
  if (process.env.BROWSER_STACK_USERNAME) {
    config.browsers = Object.keys(browserstackLaunchers);
  } else if (process.env.TRAVIS) {
    config.browsers = Object.keys(travisLaunchers);
  } else if (process.env.TEAMCITY_VERSION) {
    config.browsers = Object.keys(teamcityLaunchers);
  }

  // if running on travis
  if (process.env.TRAVIS) {
    config.browserStack.name = process.env.TRAVIS_BUILD_NUMBER;
    if (process.env.TRAVIS_PULL_REQUEST !== 'false') {
      config.browserStack.name += process.env.TRAVIS_PULL_REQUEST;
      config.browserStack.name += ' ';
      config.browserStack.name += process.env.TRAVIS_PULL_REQUEST_BRANCH;
    }

    config.browserStack.name += ' ' + process.env.TRAVIS_BRANCH;

  // if running on teamcity
  } else if (process.env.TEAMCITY_VERSION) {
    config.reporters.push('teamcity');
    config.browserStack.name = process.env.TEAMCITY_PROJECT_NAME;
    config.browserStack.name += '_';
    config.browserStack.name += process.env.BUILD_NUMBER;
  }

  // If no browsers are specified, we enable `karma-detect-browsers`
  // this will detect all browsers that are available for testing
  if (config.browsers !== false && !config.browsers.length) {
    config.detectBrowsers.enabled = true;
  }

  return config;
};
