/* eslint-disable no-console, camelcase */
const path = require('path');
const karmaPlugins = ['karma-*'];
const libPkg = require('./package.json');
const isCI = require('is-ci');

// dynamically require karma plugins from `videojs-generate-karma-config`
// as karma-* only works on project local plugins.
Object.keys(libPkg.dependencies).forEach(function(pkgName) {
  const parts = pkgName.split('/');
  const name = parts[parts.length - 1];

  if ((/^karma-/).test(name)) {
    karmaPlugins.push(require(pkgName));
  }
});

const browserstackLaunchers = {
  bsChrome: {
    'base': 'BrowserStack',
    'browser': 'chrome',
    'os': 'Windows',
    'os_version': '10',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsFirefox: {
    'base': 'BrowserStack',
    'browser': 'firefox',
    'os': 'Windows',
    'os_version': '10',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsSafariMojave: {
    'base': 'BrowserStack',
    'browser': 'safari',
    'os': 'OS X',
    'os_version': 'Mojave',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsSafariElCapitan: {
    'base': 'BrowserStack',
    'browser': 'safari',
    'os': 'OS X',
    'os_version': 'El Capitan',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsEdgeWin10: {
    'base': 'BrowserStack',
    'browser': 'edge',
    'os': 'Windows',
    'os_version': '10',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsIE11Win10: {
    'base': 'BrowserStack',
    'browser': 'ie',
    'browser_version': '11',
    'os': 'Windows',
    'os_version': '10',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  }
};

module.exports = function(config, options = {}) {
  const pkg = require(path.join(process.cwd(), 'package.json'));

  // set defaults
  const settings = {
    serverBrowsers: [],
    customLaunchers: {},
    ciLaunchers: {},
    browserstackLaunchers: Object.assign(browserstackLaunchers),
    preferHeadless: typeof options.preferHeadless === 'boolean' ? options.preferHeadless : true,
    browsers: (browsers) => browsers,
    detectBrowsers: true,
    coverage: typeof options.coverage === 'boolean' ? options.coverage : true,
    files: [
      'node_modules/video.js/dist/video-js.css',
      'dist/*.css',
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/video.js/dist/video.js',
      'test/dist/bundle.js'
    ]
  };

  // options that are passed as values
  ['detectBrowsers', 'preferHeadless', 'browsers'].forEach(function(k) {
    if (typeof options[k] !== 'undefined') {
      settings[k] = options[k];
    }
  });

  // options that are passed as functions
  [
    'customLaunchers',
    'ciLaunchers',
    'browserstackLaunchers',
    'serverBrowsers',
    'files'
  ].forEach(function(k) {
    if (!options[k]) {
      return;
    }

    // pass default settings to the options function
    settings[k] = options[k](settings[k]);
  });

  // detect if we are being run in "server mode" with --no-single-run
  let serverMode = false;

  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if ((/^(--no-single-run|--noSingleRun|--no-singleRun|--single-run=false|--singleRun=false)$/i).test(arg)) {
      serverMode = true;
    }
  }

  config.set({
    frameworks: ['qunit', 'detectBrowsers'],
    basePath: process.cwd(),
    customHeaders: [
      {match: '.*', name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate'},
      {match: '.*', name: 'Pragma', value: 'no-cache'},
      {match: '.*', name: 'Expires', value: '0'}
    ],
    customLaunchers: Object.assign(
      settings.customLaunchers,
      settings.ciLaunchers,
      settings.browserstackLaunchers
    ),
    client: {clearContext: false, qunit: {showUI: true, testTimeout: 5000}},

    detectBrowsers: {
      preferHeadless: settings.preferHeadless,
      enabled: false,
      usePhantomJS: false,
      postDetection: settings.browsers
    },
    browserStack: {
      project: process.env.TEAMCITY_PROJECT_NAME || pkg.name,
      name: process.env.TEAMCITY_PROJECT_NAME || pkg.name,
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
    files: settings.files,
    port: 9999,
    urlRoot: '/test/',
    middleware: ['staticServer'],
    plugins: karmaPlugins,
    colors: true,
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity,
    browserDisconnectTolerance: 3,
    browserDisconnectTimeout: 300000,
    captureTimeout: 30000,
    browserNoActivityTimeout: 300000
  });

  /* dynamic configuration, for ci and detectBrowsers */

  // determine what browsers should be run on this environment
  if (process.env.BROWSER_STACK_USERNAME && Object.keys(settings.browserstackLaunchers).length) {
    config.browsers = Object.keys(settings.browserstackLaunchers);
  } else if (isCI && Object.keys(settings.ciLaunchers).length) {
    config.browsers = Object.keys(settings.ciLaunchers);
  }

  // set the build to the name for more information about a build
  config.browserStack.build = config.browserStack.name;

  // in "server mode" if we have "serverBrowsers"
  if (serverMode && settings.serverBrowsers) {
    config.browsers = settings.serverBrowsers;
  }

  // if detect browsers is not explicitly disabled, turn it on
  // otherwise
  if (settings.browsers) {
    // if browsers is a boolean convert it to an array so postDetection is not confusing
    if (!Array.isArray(config.browsers)) {
      config.browsers = [];
    }
    config.browsers = settings.browsers(config.browsers);
  }

  // if no browsers are configured, and we are not in server mode.
  if (!serverMode && config.browser !== false && !config.browsers.length) {
    config.detectBrowsers.enabled = true;
  }

  if (serverMode || settings.coverage === false) {
    delete config.coverageReporter;
    // remove coverage
    config.reporters.splice(config.reporters.indexOf('coverage'), 1);

    // remove karma-coverage
    config.plugins.splice(config.plugins.indexOf('karma-coverage'), 1);
  }

  return config;
};
