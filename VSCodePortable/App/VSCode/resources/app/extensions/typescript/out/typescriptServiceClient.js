/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var path = require('path');
var fs = require('fs');
var electron = require('./utils/electron');
var wireProtocol_1 = require('./utils/wireProtocol');
var vscode_1 = require('vscode');
var SalsaStatus = require('./utils/salsaStatus');
var isWin = /^win/.test(process.platform);
var isDarwin = /^darwin/.test(process.platform);
var isLinux = /^linux/.test(process.platform);
var arch = process.arch;
var TypeScriptServiceClient = (function () {
    function TypeScriptServiceClient(host) {
        var _this = this;
        this.host = host;
        this.pathSeparator = path.sep;
        var p = new Promise(function (resolve, reject) {
            _this._onReady = { promise: null, resolve: resolve, reject: reject };
        });
        this._onReady.promise = p;
        this.servicePromise = null;
        this.lastError = null;
        this.sequenceNumber = 0;
        this.exitRequested = false;
        this.firstStart = Date.now();
        this.numberRestarts = 0;
        this.requestQueue = [];
        this.pendingResponses = 0;
        this.callbacks = Object.create(null);
        this.tsdk = vscode_1.workspace.getConfiguration().get('typescript.tsdk', null);
        vscode_1.workspace.onDidChangeConfiguration(function () {
            var oldTask = _this.tsdk;
            _this.tsdk = vscode_1.workspace.getConfiguration().get('typescript.tsdk', null);
            if (_this.servicePromise === null && oldTask !== _this.tsdk) {
                _this.startService();
            }
        });
        this.startService();
    }
    TypeScriptServiceClient.prototype.onReady = function () {
        return this._onReady.promise;
    };
    Object.defineProperty(TypeScriptServiceClient.prototype, "trace", {
        get: function () {
            return TypeScriptServiceClient.Trace;
        },
        enumerable: true,
        configurable: true
    });
    TypeScriptServiceClient.prototype.service = function () {
        if (this.servicePromise) {
            return this.servicePromise;
        }
        if (this.lastError) {
            return Promise.reject(this.lastError);
        }
        this.startService();
        return this.servicePromise;
    };
    TypeScriptServiceClient.prototype.startService = function (resendModels) {
        var _this = this;
        if (resendModels === void 0) { resendModels = false; }
        var modulePath = path.join(__dirname, '..', 'server', 'typescript', 'lib', 'tsserver.js');
        var useSalsa = !!process.env['CODE_TSJS'] || !!process.env['VSCODE_TSJS'];
        if (this.tsdk) {
            if (path.isAbsolute(this.tsdk)) {
                modulePath = path.join(this.tsdk, 'tsserver.js');
            }
            else if (vscode_1.workspace.rootPath) {
                modulePath = path.join(vscode_1.workspace.rootPath, this.tsdk, 'tsserver.js');
            }
        }
        else if (useSalsa) {
            var candidate = path.join(vscode_1.workspace.rootPath, 'node_modules', 'typescript', 'lib', 'tsserver.js');
            if (fs.existsSync(candidate)) {
                modulePath = candidate;
            }
        }
        if (!fs.existsSync(modulePath)) {
            vscode_1.window.showErrorMessage("The path " + path.dirname(modulePath) + " doesn't point to a valid tsserver install. TypeScript language features will be disabled.");
            return;
        }
        if (useSalsa) {
            var versionOK = this.isTypeScriptVersionOkForSalsa(modulePath);
            var tooltip = modulePath;
            var label;
            if (!versionOK) {
                label = '(Salsa !)';
                tooltip = tooltip + " does not support Salsa!";
            }
            else {
                label = '(Salsa)';
                tooltip = tooltip + " does support Salsa.";
            }
            SalsaStatus.show(label, tooltip, !versionOK);
        }
        this.servicePromise = new Promise(function (resolve, reject) {
            try {
                var options = {
                    execArgv: [] //[`--debug-brk=5859`]
                };
                var value = process.env.TSS_DEBUG;
                if (value) {
                    var port = parseInt(value);
                    if (!isNaN(port)) {
                        options.execArgv = [("--debug=" + port)];
                    }
                }
                electron.fork(modulePath, [], options, function (err, childProcess) {
                    if (err) {
                        _this.lastError = err;
                        vscode_1.window.showErrorMessage("TypeScript language server couldn't be started. Error message is: " + err.message);
                        return;
                    }
                    _this.lastStart = Date.now();
                    childProcess.on('error', function (err) {
                        _this.lastError = err;
                        _this.serviceExited(false);
                    });
                    childProcess.on('exit', function (err) {
                        _this.serviceExited(true);
                    });
                    _this.reader = new wireProtocol_1.Reader(childProcess.stdout, function (msg) {
                        _this.dispatchMessage(msg);
                    });
                    _this._onReady.resolve();
                    resolve(childProcess);
                });
            }
            catch (error) {
                reject(error);
                _this._onReady.reject();
            }
        });
        this.serviceStarted(resendModels);
    };
    TypeScriptServiceClient.prototype.serviceStarted = function (resendModels) {
        if (resendModels) {
            this.host.populateService();
        }
    };
    TypeScriptServiceClient.prototype.isTypeScriptVersionOkForSalsa = function (serverPath) {
        var p = serverPath.split(path.sep);
        if (p.length <= 2) {
            return true; // assume OK, cannot check
        }
        var p2 = p.slice(0, -2);
        var modulePath = p2.join(path.sep);
        var fileName = path.join(modulePath, 'package.json');
        if (!fs.existsSync(fileName)) {
            return true; // assume OK, cannot check
        }
        var contents = fs.readFileSync(fileName).toString();
        var desc = null;
        try {
            desc = JSON.parse(contents);
        }
        catch (err) {
            return true;
        }
        if (!desc.version) {
            return true;
        }
        // just use a string compare, don't want to add a dependency on semver
        return desc.version.indexOf('1.8') >= 0 || desc.version.indexOf('1.9') >= 0;
    };
    TypeScriptServiceClient.prototype.serviceExited = function (restart) {
        var _this = this;
        this.servicePromise = null;
        Object.keys(this.callbacks).forEach(function (key) {
            _this.callbacks[parseInt(key)].e(new Error('Service died.'));
        });
        this.callbacks = Object.create(null);
        if (!this.exitRequested && restart) {
            var diff = Date.now() - this.lastStart;
            this.numberRestarts++;
            var startService = true;
            if (this.numberRestarts > 5) {
                if (diff < 60 * 1000 /* 1 Minutes */) {
                    vscode_1.window.showWarningMessage('The Typescript language service died unexpectedly 5 times in the last 5 Minutes. Please consider to open a bug report.');
                }
                else if (diff < 2 * 1000 /* 2 seconds */) {
                    startService = false;
                    vscode_1.window.showErrorMessage('The Typesrript language service died 5 times right after it got started. The service will not be restarted. Please open a bug report.');
                }
            }
            if (startService) {
                this.startService(true);
            }
        }
    };
    TypeScriptServiceClient.prototype.asAbsolutePath = function (resource) {
        if (resource.scheme !== 'file') {
            return null;
        }
        var result = resource.fsPath;
        // Both \ and / must be escaped in regular expressions
        return result ? result.replace(new RegExp('\\' + this.pathSeparator, 'g'), '/') : null;
    };
    TypeScriptServiceClient.prototype.asUrl = function (filepath) {
        return vscode_1.Uri.file(filepath);
    };
    TypeScriptServiceClient.prototype.execute = function (command, args, expectsResultOrToken, token) {
        var _this = this;
        var expectsResult = true;
        if (typeof expectsResultOrToken === 'boolean') {
            expectsResult = expectsResultOrToken;
        }
        else {
            token = expectsResultOrToken;
        }
        var request = {
            seq: this.sequenceNumber++,
            type: 'request',
            command: command,
            arguments: args
        };
        var requestInfo = {
            request: request,
            promise: null,
            callbacks: null
        };
        var result = null;
        if (expectsResult) {
            result = new Promise(function (resolve, reject) {
                requestInfo.callbacks = { c: resolve, e: reject, start: Date.now() };
                if (token) {
                    token.onCancellationRequested(function () {
                        _this.tryCancelRequest(request.seq);
                        var err = new Error('Canceled');
                        err.message = 'Canceled';
                        reject(err);
                    });
                }
            });
        }
        requestInfo.promise = result;
        this.requestQueue.push(requestInfo);
        this.sendNextRequests();
        return result;
    };
    TypeScriptServiceClient.prototype.sendNextRequests = function () {
        while (this.pendingResponses === 0 && this.requestQueue.length > 0) {
            this.sendRequest(this.requestQueue.shift());
        }
    };
    TypeScriptServiceClient.prototype.sendRequest = function (requestItem) {
        var _this = this;
        var serverRequest = requestItem.request;
        if (TypeScriptServiceClient.Trace) {
            console.log('TypeScript Service: sending request ' + serverRequest.command + '(' + serverRequest.seq + '). Response expected: ' + (requestItem.callbacks ? 'yes' : 'no') + '. Current queue length: ' + this.requestQueue.length);
        }
        if (requestItem.callbacks) {
            this.callbacks[serverRequest.seq] = requestItem.callbacks;
            this.pendingResponses++;
        }
        this.service().then(function (childProcess) {
            childProcess.stdin.write(JSON.stringify(serverRequest) + '\r\n', 'utf8');
        }).catch(function (err) {
            var callback = _this.callbacks[serverRequest.seq];
            if (callback) {
                callback.e(err);
                delete _this.callbacks[serverRequest.seq];
                _this.pendingResponses--;
            }
        });
    };
    TypeScriptServiceClient.prototype.tryCancelRequest = function (seq) {
        for (var i = 0; i < this.requestQueue.length; i++) {
            if (this.requestQueue[i].request.seq === seq) {
                this.requestQueue.splice(i, 1);
                if (TypeScriptServiceClient.Trace) {
                    console.log('TypeScript Service: canceled request with sequence number ' + seq);
                }
                return true;
            }
        }
        if (TypeScriptServiceClient.Trace) {
            console.log('TypeScript Service: tried to cancel request with sequence number ' + seq + '. But request got already delivered.');
        }
        return false;
    };
    TypeScriptServiceClient.prototype.dispatchMessage = function (message) {
        try {
            if (message.type === 'response') {
                var response = message;
                var p = this.callbacks[response.request_seq];
                if (p) {
                    if (TypeScriptServiceClient.Trace) {
                        console.log('TypeScript Service: request ' + response.command + '(' + response.request_seq + ') took ' + (Date.now() - p.start) + 'ms. Success: ' + response.success + ((!response.success) ? ('. Message: ' + response.message) : ''));
                    }
                    delete this.callbacks[response.request_seq];
                    this.pendingResponses--;
                    if (response.success) {
                        p.c(response);
                    }
                    else {
                        p.e(response);
                    }
                }
            }
            else if (message.type === 'event') {
                var event = message;
                if (event.event === 'syntaxDiag') {
                    this.host.syntaxDiagnosticsReceived(event);
                }
                if (event.event === 'semanticDiag') {
                    this.host.semanticDiagnosticsReceived(event);
                }
            }
            else {
                throw new Error('Unknown message type ' + message.type + ' recevied');
            }
        }
        finally {
            this.sendNextRequests();
        }
    };
    TypeScriptServiceClient.Trace = process.env.TSS_TRACE || false;
    return TypeScriptServiceClient;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TypeScriptServiceClient;
