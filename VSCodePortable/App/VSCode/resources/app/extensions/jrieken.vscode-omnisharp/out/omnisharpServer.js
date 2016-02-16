/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require('events');
var child_process_1 = require('child_process');
var path_1 = require('path');
var readline_1 = require('readline');
var omnisharpServerLauncher_1 = require('./omnisharpServerLauncher');
var vscode_1 = require('vscode');
var launchTargetFinder_1 = require('./launchTargetFinder');
var ServerState;
(function (ServerState) {
    ServerState[ServerState["Starting"] = 0] = "Starting";
    ServerState[ServerState["Started"] = 1] = "Started";
    ServerState[ServerState["Stopped"] = 2] = "Stopped";
})(ServerState || (ServerState = {}));
var OmnisharpServer = (function () {
    function OmnisharpServer() {
        this._eventBus = new events_1.EventEmitter();
        this._state = ServerState.Stopped;
        this._queue = [];
        this._isProcessingQueue = false;
        this._extraArgv = [];
        this._channel = vscode_1.window.createOutputChannel('OmniSharp Log');
    }
    OmnisharpServer.prototype.isRunning = function () {
        return this._state === ServerState.Started;
    };
    OmnisharpServer.prototype._getState = function () {
        return this._state;
    };
    OmnisharpServer.prototype._setState = function (value) {
        if (typeof value !== 'undefined' && value !== this._state) {
            this._state = value;
            this._fireEvent('stateChanged', this._state);
        }
    };
    OmnisharpServer.prototype.getSolutionPathOrFolder = function () {
        return this._solutionPath;
    };
    OmnisharpServer.prototype.getChannel = function () {
        return this._channel;
    };
    // --- eventing
    OmnisharpServer.prototype.onStdout = function (listener, thisArg) {
        return this._addListener('stdout', listener, thisArg);
    };
    OmnisharpServer.prototype.onStderr = function (listener, thisArg) {
        return this._addListener('stderr', listener, thisArg);
    };
    OmnisharpServer.prototype.onError = function (listener, thisArg) {
        return this._addListener('Error', listener, thisArg);
    };
    OmnisharpServer.prototype.onServerError = function (listener, thisArg) {
        return this._addListener('ServerError', listener, thisArg);
    };
    OmnisharpServer.prototype.onUnresolvedDependencies = function (listener, thisArg) {
        return this._addListener('UnresolvedDependencies', listener, thisArg);
    };
    OmnisharpServer.prototype.onBeforePackageRestore = function (listener, thisArg) {
        return this._addListener('PackageRestoreStarted', listener, thisArg);
    };
    OmnisharpServer.prototype.onPackageRestore = function (listener, thisArg) {
        return this._addListener('PackageRestoreFinished', listener, thisArg);
    };
    OmnisharpServer.prototype.onProjectChange = function (listener, thisArg) {
        return this._addListener('ProjectChanged', listener, thisArg);
    };
    OmnisharpServer.prototype.onProjectAdded = function (listener, thisArg) {
        return this._addListener('ProjectAdded', listener, thisArg);
    };
    OmnisharpServer.prototype.onProjectRemoved = function (listener, thisArg) {
        return this._addListener('ProjectRemoved', listener, thisArg);
    };
    OmnisharpServer.prototype.onMsBuildProjectDiagnostics = function (listener, thisArg) {
        return this._addListener('MsBuildProjectDiagnostics', listener, thisArg);
    };
    OmnisharpServer.prototype.onBeforeServerStart = function (listener) {
        return this._addListener('BeforeServerStart', listener);
    };
    OmnisharpServer.prototype.onServerStart = function (listener) {
        return this._addListener('ServerStart', listener);
    };
    OmnisharpServer.prototype.onServerStop = function (listener) {
        return this._addListener('ServerStop', listener);
    };
    OmnisharpServer.prototype.onMultipleLaunchTargets = function (listener, thisArg) {
        return this._addListener('server:MultipleLaunchTargets', listener, thisArg);
    };
    OmnisharpServer.prototype.onOmnisharpStart = function (listener) {
        return this._addListener('started', listener);
    };
    OmnisharpServer.prototype._addListener = function (event, listener, thisArg) {
        var _this = this;
        listener = thisArg ? listener.bind(thisArg) : listener;
        this._eventBus.addListener(event, listener);
        return new vscode_1.Disposable(function () { return _this._eventBus.removeListener(event, listener); });
    };
    OmnisharpServer.prototype._fireEvent = function (event, args) {
        this._eventBus.emit(event, args);
    };
    // --- start, stop, and connect
    OmnisharpServer.prototype.start = function (solutionPath) {
        if (!this._start) {
            this._start = this._doStart(solutionPath);
        }
        return this._start;
    };
    OmnisharpServer.prototype._doStart = function (solutionPath) {
        var _this = this;
        this._setState(ServerState.Starting);
        this._solutionPath = solutionPath;
        var cwd = path_1.dirname(solutionPath), argv = ['-s', solutionPath, '--hostPID', process.pid.toString(), 'dnx:enablePackageRestore=false'].concat(this._extraArgv);
        this._fireEvent('stdout', "[INFO] Starting OmniSharp at '" + solutionPath + "'...\n");
        this._fireEvent('BeforeServerStart', solutionPath);
        return omnisharpServerLauncher_1.default(cwd, argv).then(function (value) {
            _this._serverProcess = value.process;
            _this._fireEvent('stdout', "[INFO] Started OmniSharp from '" + value.command + "' with process id " + value.process.pid + "...\n");
            _this._fireEvent('ServerStart', solutionPath);
            _this._setState(ServerState.Started);
            return _this._doConnect();
        }).then(function (_) {
            _this._processQueue();
        }, function (err) {
            _this._fireEvent('ServerError', err);
            throw err;
        });
    };
    OmnisharpServer.prototype.stop = function () {
        var _this = this;
        var ret;
        if (!this._serverProcess) {
            // nothing to kill
            ret = Promise.resolve(undefined);
        }
        else if (/^win/.test(process.platform)) {
            // when killing a process in windows its child
            // processes are *not* killed but become root
            // processes. Therefore we use TASKKILL.EXE
            ret = new Promise(function (resolve, reject) {
                var killer = child_process_1.exec("taskkill /F /T /PID " + _this._serverProcess.pid, function (err, stdout, stderr) {
                    if (err) {
                        return reject(err);
                    }
                });
                killer.on('exit', resolve);
                killer.on('error', reject);
            });
        }
        else {
            this._serverProcess.kill('SIGTERM');
            ret = Promise.resolve(undefined);
        }
        return ret.then(function (_) {
            _this._start = null;
            _this._serverProcess = null;
            _this._setState(ServerState.Stopped);
            _this._fireEvent('ServerStop', _this);
            return;
        });
    };
    OmnisharpServer.prototype.restart = function (solutionPath) {
        var _this = this;
        if (solutionPath === void 0) { solutionPath = this._solutionPath; }
        if (solutionPath) {
            return this.stop().then(function () {
                _this.start(solutionPath);
            });
        }
    };
    OmnisharpServer.prototype.autoStart = function (preferredPath) {
        var _this = this;
        return launchTargetFinder_1.default().then(function (targets) {
            if (targets.length === 0) {
                return new Promise(function (resolve, reject) {
                    // 1st watch for files
                    var watcher = vscode_1.workspace.createFileSystemWatcher('{**/*.sln,**/project.json}', false, true, true);
                    watcher.onDidCreate(function (uri) {
                        watcher.dispose();
                        resolve();
                    });
                }).then(function () {
                    // 2nd try again
                    return _this.autoStart(preferredPath);
                });
            }
            if (targets.length > 1) {
                for (var _i = 0; _i < targets.length; _i++) {
                    var target = targets[_i];
                    if (target.target.fsPath === preferredPath) {
                        // start preferred path
                        return _this.restart(preferredPath);
                    }
                }
                _this._fireEvent('server:MultipleLaunchTargets', targets);
                return Promise.reject(undefined);
            }
            // just start
            return _this.restart(targets[0].target.fsPath);
        });
    };
    // --- requests et al
    OmnisharpServer.prototype.makeRequest = function (path, data, token) {
        var _this = this;
        if (this._getState() !== ServerState.Started) {
            return Promise.reject('server has been stopped or not started');
        }
        var request;
        var promise = new Promise(function (resolve, reject) {
            request = {
                path: path,
                data: data,
                onSuccess: resolve,
                onError: reject,
                _enqueued: Date.now()
            };
            _this._queue.push(request);
            // this._statOnRequestStart(request);
            if (_this._getState() === ServerState.Started && !_this._isProcessingQueue) {
                _this._processQueue();
            }
        });
        if (token) {
            token.onCancellationRequested(function () {
                var idx = _this._queue.indexOf(request);
                if (idx !== -1) {
                    _this._queue.splice(idx, 1);
                    var err = new Error('Canceled');
                    err.message = 'Canceled';
                    request.onError(err);
                }
            });
        }
        return promise;
    };
    OmnisharpServer.prototype._processQueue = function () {
        var _this = this;
        if (this._queue.length === 0) {
            // nothing to do
            this._isProcessingQueue = false;
            return;
        }
        // signal that we are working on it
        this._isProcessingQueue = true;
        // send next request and recurse when done
        var thisRequest = this._queue.shift();
        this._makeNextRequest(thisRequest.path, thisRequest.data).then(function (value) {
            thisRequest.onSuccess(value);
            _this._processQueue();
            // this._statOnRequestEnd(thisRequest, true);
        }, function (err) {
            thisRequest.onError(err);
            _this._processQueue();
            // this._statOnRequestEnd(thisRequest, false);
        }).catch(function (err) {
            console.error(err);
            _this._processQueue();
        });
    };
    return OmnisharpServer;
})();
exports.OmnisharpServer = OmnisharpServer;
var StdioOmnisharpServer = (function (_super) {
    __extends(StdioOmnisharpServer, _super);
    function StdioOmnisharpServer() {
        _super.call(this);
        this._activeRequest = Object.create(null);
        this._callOnStop = [];
        // extra argv
        this._extraArgv.push('--stdio');
    }
    StdioOmnisharpServer.prototype.stop = function () {
        while (this._callOnStop.length) {
            this._callOnStop.pop()();
        }
        return _super.prototype.stop.call(this);
    };
    StdioOmnisharpServer.prototype._doConnect = function () {
        var _this = this;
        this._serverProcess.stderr.on('data', function (data) { return _this._fireEvent('stderr', String(data)); });
        this._rl = readline_1.createInterface({
            input: this._serverProcess.stdout,
            output: this._serverProcess.stdin,
            terminal: false
        });
        var p = new Promise(function (resolve, reject) {
            var listener;
            // timeout logic
            var handle = setTimeout(function () {
                listener && listener.dispose();
                reject(new Error('Failed to start OmniSharp'));
            }, StdioOmnisharpServer.StartupTimeout);
            // handle started-event
            listener = _this.onOmnisharpStart(function () {
                listener && listener.dispose();
                clearTimeout(handle);
                resolve(_this);
            });
        });
        this._startListening();
        return p;
    };
    StdioOmnisharpServer.prototype._startListening = function () {
        var _this = this;
        var onLineReceived = function (line) {
            if (line[0] !== '{') {
                _this._fireEvent('stdout', line + "\n");
                return;
            }
            var packet;
            try {
                packet = JSON.parse(line);
            }
            catch (e) {
                // not json
                return;
            }
            if (!packet.Type) {
                // bogous packet
                return;
            }
            switch (packet.Type) {
                case 'response':
                    _this._handleResponsePacket(packet);
                    break;
                case 'event':
                    _this._handleEventPacket(packet);
                    break;
                default:
                    console.warn('unknown packet: ', packet);
                    break;
            }
        };
        this._rl.addListener('line', onLineReceived);
        this._callOnStop.push(function () { return _this._rl.removeListener('line', onLineReceived); });
    };
    StdioOmnisharpServer.prototype._handleResponsePacket = function (packet) {
        var requestSeq = packet.Request_seq, entry = this._activeRequest[requestSeq];
        if (!entry) {
            console.warn('Received a response WITHOUT a request', packet);
            return;
        }
        delete this._activeRequest[requestSeq];
        if (packet.Success) {
            entry.onSuccess(packet.Body);
        }
        else {
            entry.onError(packet.Message || packet.Body);
        }
    };
    StdioOmnisharpServer.prototype._handleEventPacket = function (packet) {
        if (packet.Event === 'log') {
            // handle log events
            var entry = packet.Body;
            this._fireEvent('stdout', "[" + entry.LogLevel + ":" + entry.Name + "] " + entry.Message + "\n");
            return;
        }
        else {
            // fwd all other events
            this._fireEvent(packet.Event, packet.Body);
        }
    };
    StdioOmnisharpServer.prototype._makeNextRequest = function (path, data) {
        var _this = this;
        var thisRequestPacket = {
            Type: 'request',
            Seq: StdioOmnisharpServer._seqPool++,
            Command: path,
            Arguments: data
        };
        return new Promise(function (c, e) {
            _this._activeRequest[thisRequestPacket.Seq] = {
                onSuccess: c,
                onError: e
            };
            _this._serverProcess.stdin.write(JSON.stringify(thisRequestPacket) + '\n');
        });
    };
    StdioOmnisharpServer._seqPool = 1;
    StdioOmnisharpServer.StartupTimeout = 1000 * 60;
    StdioOmnisharpServer.ResponsePacketTimeout = 1000 * 60 * 15; // helps debugging
    return StdioOmnisharpServer;
})(OmnisharpServer);
exports.StdioOmnisharpServer = StdioOmnisharpServer;
//# sourceMappingURL=omnisharpServer.js.map