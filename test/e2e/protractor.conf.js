fs = require('fs');
process = require('process');

exports.config = {
    chromeDriver : '../../node_modules/chromedriver/lib/chromedriver/chromedriver' + (process.platform === 'win32' ? '.exe' : ''),
    baseUrl: 'http://localhost:8082', //
    suites: {
       util: './util/delays.js',
       pretest: 'pre-test/pretest.spec.js',
       tests: '**/grumph.spec.js'
    },
    directConnect: true,
    exclude: [],
    chromeOnly: true,
    multiCapabilities: [{
        browserName: 'chrome'
    }],
    allScriptsTimeout: 110000,
    getPageTimeout: 100000,
    framework: 'jasmine2',
    jasmineNodeOpts: {
        isVerbose: false,
        showColors: true,
        includeStackTrace: false,
        defaultTimeoutInterval: 400000
    },
    plugins: [
        {
            package: 'protractor-console-plugin',
            failOnWarning: false,
            failOnError: false,
            logWarnings: true,
            exclude: [
                /http:\/\/piwik\.dainst\.org\/piwik\.js.*Failed to load resource: the server responded with a status of 404 \(Not Found\)/,
                /.*tile\.openstreetmap\.org/,
                /.*Failed to load resource: the server responded with a status of 400 \(Bad Request\)/,
                /.*Failed to load resource: the server responded with a status of 401 \(Unauthorized\)/,
                /.*Failed to load resource: the server responded with a status of 403 \(Forbidden\)/,
                /.*Failed to load resource: the server responded with a status of 404 \(Not Found\)/,
                /.*Failed to load resource: the server responded with a status of 500 \(Forbidden\)/
            ]
        }
    ],
    onPrepare: function() {
        
        var FailureScreenshotReporter = function() {

            this.specDone = function(spec) {
                if (spec.status === 'failed') {

                    browser.takeScreenshot().then(function (png) {
                        var stream = fs.createWriteStream('test/e2e-screenshots/'+spec.fullName.replace(/ /g,"_")+'.png');
                        stream.write(new Buffer(png, 'base64'));
                        stream.end();
                    });
                }
            }
        };
        jasmine.getEnv().addReporter(new FailureScreenshotReporter());


        // Set display size in top suite so one can safely override it for single tests without risk of forgetting to set it back.
        jasmine.getEnv().topSuite().beforeEach({fn: function() {
            browser.manage().window().setSize(
                1200, // With this resolution the navbar is fully expanded.
                800);
        }});


        // fail fast - die when pre-test-ckeck faild
        var failFast = require('./util/failfast');
        jasmine.getEnv().addReporter(failFast.init());

    }
};