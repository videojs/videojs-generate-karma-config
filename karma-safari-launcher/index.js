const applescript = require('applescript');

const getBrowserLauncher = function(browserName) {
  return function(url) {
    this._url = url;
    const script = `
    tell application "${browserName}"
      activate
      make new document with properties {URL:"${url}"}
    end tell
    `;

    applescript.execString(script, function(err) {
      if (err) {
        throw err;
      }
    });
  };
};

const getBrowserKiller = function(browserName) {
  return function(done) {
    const script = `
    tell application "${browserName}"
      close documents where URL = "${this._url}"
      close documents where name is "favorites"
    end tell
    `;

    applescript.execString(script, function(err) {
      if (err) {
        throw err;
      }
      done();
    });
  };
};

const SafariBrowser = function(baseBrowserDecorator) {
  baseBrowserDecorator(this);
  this._start = getBrowserLauncher('Safari');
  this.on('kill', getBrowserKiller('Safari'));
};

SafariBrowser.prototype = {
  name: 'Safari'
};

SafariBrowser.$inject = ['baseBrowserDecorator'];

const SafariTechBrowser = function(baseBrowserDecorator) {
  baseBrowserDecorator(this);
  this._start = getBrowserLauncher('Safari Technology Preview');
  this.on('kill', getBrowserKiller('Safari Technology Preview'));
};

SafariTechBrowser.prototype = {
  name: 'SafariTechPreview'
};

SafariBrowser.$inject = ['baseBrowserDecorator'];

module.exports = {
  'launcher:Safari': ['type', SafariBrowser],
  'launcher:SafariTechPreview': ['type', SafariTechBrowser]
};
