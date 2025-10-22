// Karma configuration file for Test-Driven Development (TDD)
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // Configuration for Jasmine test framework
        random: false, // Run tests in order for consistent results
        seed: null,
        stopSpecOnExpectationFailure: false,
        stopOnSpecFailure: false,
        timeoutInterval: 10000 // 10 seconds timeout for async tests
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
      suppressFailed: false // show stack traces for failed tests
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/todo-frontend'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' },
        { type: 'json' }
      ],
      check: {
        // Enforce minimum coverage thresholds
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ]
      },
      ChromeDebug: {
        base: 'Chrome',
        flags: ['--remote-debugging-port=9333']
      }
    },
    singleRun: false,
    restartOnFileChange: true,
    browserNoActivityTimeout: 30000,
    browserDisconnectTimeout: 10000,
    browserDisconnectTolerance: 3,
    captureTimeout: 210000
  });
};
