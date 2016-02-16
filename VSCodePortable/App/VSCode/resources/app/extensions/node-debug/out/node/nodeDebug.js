/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var vscode_debugadapter_1 = require('vscode-debugadapter');
var nodeV8Protocol_1 = require('./nodeV8Protocol');
var sourceMaps_1 = require('./sourceMaps');
var terminal_1 = require('./terminal');
var PathUtils = require('./pathUtilities');
var CP = require('child_process');
var Net = require('net');
var Path = require('path');
var FS = require('fs');
var RANGESIZE = 1000;
var PropertyExpander = (function () {
    function PropertyExpander(obj, ths) {
        this._object = obj;
        this._this = ths;
        this._mode = 'all';
        this._start = 0;
        this._end = -1;
    }
    PropertyExpander.prototype.Expand = function (session, variables, done) {
        var _this = this;
        session._addProperties(variables, this._object, this._mode, this._start, this._end, function () {
            if (_this._this) {
                session._addVariable(variables, 'this', _this._this, done);
            }
            else {
                done();
            }
        });
    };
    return PropertyExpander;
})();
exports.PropertyExpander = PropertyExpander;
var PropertyRangeExpander = (function (_super) {
    __extends(PropertyRangeExpander, _super);
    function PropertyRangeExpander(obj, start, end) {
        _super.call(this, obj, null);
        this._mode = 'range';
        this._start = start;
        this._end = end;
    }
    return PropertyRangeExpander;
})(PropertyExpander);
exports.PropertyRangeExpander = PropertyRangeExpander;
var ArrayExpander = (function () {
    function ArrayExpander(obj, size) {
        this._object = obj;
        this._size = size;
    }
    ArrayExpander.prototype.Expand = function (session, variables, done) {
        var _this = this;
        // first add named properties
        session._addProperties(variables, this._object, 'named', 0, -1, function () {
            // then add indexed properties as ranges
            for (var start = 0; start < _this._size; start += RANGESIZE) {
                var end = Math.min(start + RANGESIZE, _this._size) - 1;
                variables.push(new vscode_debugadapter_1.Variable("[" + start + ".." + end + "]", ' ', session._variableHandles.create(new PropertyRangeExpander(_this._object, start, end))));
            }
            done();
        });
    };
    return ArrayExpander;
})();
exports.ArrayExpander = ArrayExpander;
/**
 * This class represents an internal line/column breakpoint and its verification state.
 * It is only used temporarily in the setBreakpointsRequest.
 */
var InternalBreakpoint = (function () {
    function InternalBreakpoint() {
    }
    return InternalBreakpoint;
})();
exports.InternalBreakpoint = InternalBreakpoint;
/**
 * A SourceSource represents the source contents of an internal module or of a source map with inlined contents.
 */
var SourceSource = (function () {
    function SourceSource(sid, content) {
        this.scriptId = sid;
        this.source = content;
    }
    return SourceSource;
})();
var NodeDebugSession = (function (_super) {
    __extends(NodeDebugSession, _super);
    function NodeDebugSession(debuggerLinesStartAt1, isServer) {
        var _this = this;
        if (isServer === void 0) { isServer = false; }
        _super.call(this, debuggerLinesStartAt1, isServer);
        this._variableHandles = new vscode_debugadapter_1.Handles();
        this._frameHandles = new vscode_debugadapter_1.Handles();
        this._sourceHandles = new vscode_debugadapter_1.Handles();
        this._refCache = new Map();
        this._pollForNodeProcess = false;
        this._nodeProcessId = -1; // pid of the node runtime
        this._nodeExtensionsAvailable = false;
        this._tryToExtendNode = true;
        this._attachMode = false;
        this._node = new nodeV8Protocol_1.NodeV8Protocol();
        this._node.on('break', function (event) {
            _this._stopped('break');
            _this._lastStoppedEvent = _this._createStoppedEvent(event.body);
            if (_this._lastStoppedEvent.body.reason === NodeDebugSession.ENTRY_REASON) {
                _this._log('NodeDebugSession: supressed stop-on-entry event');
            }
            else {
                _this.sendEvent(_this._lastStoppedEvent);
            }
        });
        this._node.on('exception', function (event) {
            _this._stopped('exception');
            _this._lastStoppedEvent = _this._createStoppedEvent(event.body);
            _this.sendEvent(_this._lastStoppedEvent);
        });
        this._node.on('close', function (event) {
            _this._terminated('node v8protocol close');
        });
        this._node.on('error', function (event) {
            _this._terminated('node v8protocol error');
        });
        this._node.on('diagnostic', function (event) {
            // console.error('diagnostic event: ' + event.body.reason);
        });
    }
    /**
     * clear everything that is no longer valid after a new stopped event.
     */
    NodeDebugSession.prototype._stopped = function (reason) {
        this._log("_stopped: got " + reason + " event from node");
        this._exception = undefined;
        this._variableHandles.reset();
        this._frameHandles.reset();
        this._refCache = new Map();
    };
    /**
     * The debug session has terminated.
     */
    NodeDebugSession.prototype._terminated = function (reason) {
        this._log("_terminated: " + reason);
        if (this._terminalProcess) {
            // if the debug adapter owns a terminal,
            // we delay the TerminatedEvent so that the user can see the result of the process in the terminal.
            return;
        }
        if (!this._isTerminated) {
            this._isTerminated = true;
            this.sendEvent(new vscode_debugadapter_1.TerminatedEvent());
        }
    };
    //---- initialize request -------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.initializeRequest = function (response, args) {
        this._log("initializeRequest: adapterID: " + args.adapterID);
        this._adapterID = args.adapterID;
        //---- Send back feature and their options
        // This debug adapter supports the configurationDoneRequest.
        response.body.supportsConfigurationDoneRequest = true;
        // This debug adapter does not (yet) support a side effect free evaluate request for data hovers.
        response.body.supportsEvaluateForHovers = false;
        // This debug adapter does not (yet) support function breakpoints.
        response.body.supportsFunctionBreakpoints = false;
        this.sendResponse(response);
    };
    //---- launch request -----------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.launchRequest = function (response, args) {
        var _this = this;
        this._externalConsole = (typeof args.externalConsole === 'boolean') && args.externalConsole;
        this._processCommonArgs(args);
        var port = random(3000, 50000);
        var runtimeExecutable = this.convertClientPathToDebugger(args.runtimeExecutable);
        if (runtimeExecutable) {
            if (!FS.existsSync(runtimeExecutable)) {
                this.sendErrorResponse(response, 2006, "runtime executable '{path}' does not exist", { path: runtimeExecutable });
                return;
            }
        }
        else {
            if (!terminal_1.Terminal.isOnPath(NodeDebugSession.NODE)) {
                this.sendErrorResponse(response, 2001, "cannot find runtime '{_runtime}' on PATH", { _runtime: NodeDebugSession.NODE });
                return;
            }
            runtimeExecutable = NodeDebugSession.NODE; // use node from PATH
        }
        var runtimeArgs = args.runtimeArgs || [];
        var programArgs = args.args || [];
        // special code for 'extensionHost' debugging
        if (this._adapterID === 'extensionHost') {
            // we always launch in 'debug-brk' mode, but we only show the break event if 'stopOnEntry' attribute is true.
            var launchArgs_1 = [runtimeExecutable, ("--debugBrkPluginHost=" + port)].concat(runtimeArgs, programArgs);
            this._sendLaunchCommandToConsole(launchArgs_1);
            var cmd = CP.spawn(runtimeExecutable, launchArgs_1.slice(1));
            cmd.on('error', function (err) {
                _this._terminated("failed to launch extensionHost (" + err + ")");
            });
            this._captureOutput(cmd);
            // we are done!
            this.sendResponse(response);
            return;
        }
        var programPath = args.program;
        if (programPath) {
            programPath = this.convertClientPathToDebugger(programPath);
            if (!FS.existsSync(programPath)) {
                this.sendErrorResponse(response, 2007, "program '{path}' does not exist", { path: programPath });
                return;
            }
            if (programPath != PathUtils.realPath(programPath)) {
                this.sendErrorResponse(response, 2021, "program path uses differently cased character than file on disk; this might result in breakpoints not being hit");
                return;
            }
        }
        else {
            this.sendErrorResponse(response, 2005, "property 'program' is missing or empty");
            return;
        }
        if (NodeDebugSession.isJavaScript(programPath)) {
            if (this._sourceMaps) {
                // source maps enabled indicates that a tool like Babel is used to transpile js to js
                var generatedPath = this._sourceMaps.MapPathFromSource(programPath);
                if (generatedPath) {
                    // there seems to be a generated file, so use that
                    programPath = generatedPath;
                }
            }
        }
        else {
            // node cannot execute the program directly
            if (!this._sourceMaps) {
                this.sendErrorResponse(response, 2002, "cannot launch program '{path}'; enabling source maps might help", { path: programPath });
                return;
            }
            var generatedPath = this._sourceMaps.MapPathFromSource(programPath);
            if (!generatedPath) {
                this.sendErrorResponse(response, 2003, "cannot launch program '{path}'; setting the 'outDir' attribute might help", { path: programPath });
                return;
            }
            programPath = generatedPath;
        }
        var program;
        var workingDirectory = this.convertClientPathToDebugger(args.cwd);
        if (workingDirectory) {
            if (!FS.existsSync(workingDirectory)) {
                this.sendErrorResponse(response, 2004, "working directory '{path}' does not exist", { path: workingDirectory });
                return;
            }
            // if working dir is given and if the executable is within that folder, we make the executable path relative to the working dir
            program = Path.relative(workingDirectory, programPath);
        }
        else {
            // if no working dir given, we use the direct folder of the executable
            workingDirectory = Path.dirname(programPath);
            program = Path.basename(programPath);
        }
        // we always break on entry (but if user did not request this, we will not stop in the UI).
        var launchArgs = [runtimeExecutable, ("--debug-brk=" + port)].concat(runtimeArgs, [program], programArgs);
        if (this._externalConsole) {
            terminal_1.Terminal.launchInTerminal(workingDirectory, launchArgs, args.env).then(function (term) {
                if (term) {
                    // if we got a terminal process, we will track it
                    _this._terminalProcess = term;
                    term.on('exit', function () {
                        _this._terminalProcess = null;
                        _this._terminated('terminal exited');
                    });
                }
                // since node starts in a terminal, we cannot track it with an 'exit' handler
                // plan for polling after we have gotten the process pid.
                _this._pollForNodeProcess = true;
                _this._attach(response, port);
            }).catch(function (error) {
                _this.sendErrorResponse(response, 2011, "cannot launch target in terminal (reason: {_error})", { _error: error.message }, vscode_debugadapter_1.ErrorDestination.Telemetry | vscode_debugadapter_1.ErrorDestination.User);
                _this._terminated('terminal error: ' + error.message);
            });
        }
        else {
            this._sendLaunchCommandToConsole(launchArgs);
            // merge environment variables into a copy of the process.env
            var env = extendObject(extendObject({}, process.env), args.env);
            var options = {
                cwd: workingDirectory,
                env: env
            };
            var cmd = CP.spawn(runtimeExecutable, launchArgs.slice(1), options);
            cmd.on('error', function (error) {
                _this.sendErrorResponse(response, 2017, "cannot launch target (reason: {_error})", { _error: error.message }, vscode_debugadapter_1.ErrorDestination.Telemetry | vscode_debugadapter_1.ErrorDestination.User);
                _this._terminated("failed to launch target (" + error + ")");
            });
            cmd.on('exit', function () {
                _this._terminated('target exited');
            });
            cmd.on('close', function (code) {
                _this._terminated('target closed');
            });
            this._captureOutput(cmd);
            //cmd.stdin.end();	// close stdin because we do not support input for a target
            this._attach(response, port);
        }
    };
    NodeDebugSession.prototype._sendLaunchCommandToConsole = function (args) {
        // print the command to launch the target to the debug console
        var cli = '';
        for (var _i = 0; _i < args.length; _i++) {
            var a = args[_i];
            if (a.indexOf(' ') >= 0) {
                cli += '\'' + a + '\'';
            }
            else {
                cli += a;
            }
            cli += ' ';
        }
        this.sendEvent(new vscode_debugadapter_1.OutputEvent(cli, 'console'));
    };
    NodeDebugSession.prototype._captureOutput = function (process) {
        var _this = this;
        process.stdout.on('data', function (data) {
            _this.sendEvent(new vscode_debugadapter_1.OutputEvent(data.toString(), 'stdout'));
        });
        process.stderr.on('data', function (data) {
            _this.sendEvent(new vscode_debugadapter_1.OutputEvent(data.toString(), 'stderr'));
        });
    };
    NodeDebugSession.prototype._processCommonArgs = function (args) {
        this._stopOnEntry = (typeof args.stopOnEntry === 'boolean') && args.stopOnEntry;
        if (!this._sourceMaps) {
            if (typeof args.sourceMaps === 'boolean' && args.sourceMaps) {
                var generatedCodeDirectory = args.outDir;
                this._sourceMaps = new sourceMaps_1.SourceMaps(generatedCodeDirectory);
            }
        }
    };
    //---- attach request -----------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.attachRequest = function (response, args) {
        this._processCommonArgs(args);
        if (this._adapterID === 'extensionHost') {
            // in EH mode 'attach' means 'launch' mode
            this._attachMode = false;
        }
        else {
            this._attachMode = true;
        }
        this._localRoot = args.localRoot;
        this._remoteRoot = args.remoteRoot;
        this._attach(response, args.port, args.address, args.timeout);
    };
    /*
     * shared code used in launchRequest and attachRequest
     */
    NodeDebugSession.prototype._attach = function (response, port, address, timeout) {
        var _this = this;
        if (!port) {
            port = 5858;
        }
        if (!address || address === 'localhost') {
            address = '127.0.0.1';
        }
        if (!timeout) {
            timeout = NodeDebugSession.ATTACH_TIMEOUT;
        }
        this._log("_attach: address: " + address + " port: " + port);
        var connected = false;
        var socket = new Net.Socket();
        socket.connect(port, address);
        socket.on('connect', function (err) {
            _this._log('_attach: connected');
            connected = true;
            _this._node.startDispatch(socket, socket);
            _this._initialize(response);
        });
        var endTime = new Date().getTime() + timeout;
        socket.on('error', function (err) {
            if (connected) {
                // since we are connected this error is fatal
                _this._terminated('socket error');
            }
            else {
                // we are not yet connected so retry a few times
                if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
                    var now = new Date().getTime();
                    if (now < endTime) {
                        setTimeout(function () {
                            _this._log('_attach: retry socket.connect');
                            socket.connect(port);
                        }, 200); // retry after 200 ms
                    }
                    else {
                        _this.sendErrorResponse(response, 2009, "cannot connect to runtime process (timeout after {_timeout}ms)", { _timeout: timeout });
                    }
                }
                else {
                    _this.sendErrorResponse(response, 2010, "cannot connect to runtime process (reason: {_error})", { _error: err.message });
                }
            }
        });
        socket.on('end', function (err) {
            _this._terminated('socket end');
        });
    };
    NodeDebugSession.prototype._initialize = function (response, retryCount) {
        var _this = this;
        if (retryCount === void 0) { retryCount = 0; }
        this._node.command('evaluate', { expression: 'process.pid', global: true }, function (resp) {
            var ok = resp.success;
            if (resp.success) {
                _this._nodeProcessId = parseInt(resp.body.value);
                _this._log("_initialize: got process id " + _this._nodeProcessId + " from node");
            }
            else {
                if (resp.message.indexOf('process is not defined') >= 0) {
                    _this._log('_initialize: process not defined error; got no pid');
                    ok = true; // continue and try to get process.pid later
                }
            }
            if (ok) {
                if (_this._pollForNodeProcess) {
                    _this._pollForNodeTermination();
                }
                var runtimeSupportsExtension = _this._node.embeddedHostVersion === 0; // node version 0.x.x (io.js has version >= 1)
                if (_this._tryToExtendNode && runtimeSupportsExtension) {
                    _this._extendDebugger(function (success) {
                        _this.sendResponse(response);
                        _this._startInitialize(!resp.running);
                        return;
                    });
                }
                else {
                    _this.sendResponse(response);
                    _this._startInitialize(!resp.running);
                    return;
                }
            }
            else {
                _this._log('_initialize: retrieving process id from node failed');
                if (retryCount < 10) {
                    setTimeout(function () {
                        // recurse
                        _this._initialize(response, retryCount + 1);
                    }, 50);
                    return;
                }
                else {
                    _this._sendNodeResponse(response, resp);
                }
            }
        });
    };
    NodeDebugSession.prototype._pollForNodeTermination = function () {
        var _this = this;
        var id = setInterval(function () {
            try {
                if (_this._nodeProcessId > 0) {
                    process.kill(_this._nodeProcessId, 0); // node.d.ts doesn't like number argumnent
                }
                else {
                    clearInterval(id);
                }
            }
            catch (e) {
                clearInterval(id);
                _this._terminated('node process kill exception');
            }
        }, NodeDebugSession.NODE_TERMINATION_POLL_INTERVAL);
    };
    /*
     * Inject code into node.js to fix timeout issues with large data structures.
     */
    NodeDebugSession.prototype._extendDebugger = function (done) {
        var _this = this;
        try {
            var contents = FS.readFileSync(Path.join(__dirname, NodeDebugSession.DEBUG_EXTENSION), 'utf8');
            this._repeater(4, done, function (callback) {
                _this._node.command('evaluate', { expression: contents }, function (resp) {
                    if (resp.success) {
                        _this._log('_extendDebugger: node code inject: OK');
                        _this._nodeExtensionsAvailable = true;
                        callback(false);
                    }
                    else {
                        _this._log('_extendDebugger: node code inject: failed, try again...');
                        callback(true);
                    }
                });
            });
        }
        catch (e) {
            done(false);
        }
    };
    /*
     * start the initialization sequence:
     * 1. wait for "break-on-entry" (with timeout)
     * 2. send "inititialized" event in order to trigger setBreakpointEvents request from client
     * 3. prepare for sending "break-on-entry" or "continue" later in _finishInitialize()
     */
    NodeDebugSession.prototype._startInitialize = function (stopped, n) {
        var _this = this;
        if (n === void 0) { n = 0; }
        if (n == 0) {
            this._log("_startInitialize: stopped: " + stopped);
        }
        // wait at most 500ms for receiving the break on entry event
        // (since in attach mode we cannot enforce that node is started with --debug-brk, we cannot assume that we receive this event)
        if (!this._gotEntryEvent && n < 10) {
            setTimeout(function () {
                // recurse
                _this._startInitialize(stopped, n + 1);
            }, 50);
            return;
        }
        if (this._gotEntryEvent) {
            this._log("_startInitialize: got break on entry event after " + n + " retries");
            if (this._nodeProcessId <= 0) {
                // if we haven't gotten a process pid so far, we try it again
                this._node.command('evaluate', { expression: 'process.pid', global: true }, function (resp) {
                    if (resp.success) {
                        _this._nodeProcessId = parseInt(resp.body.value);
                        _this._log("_initialize: got process id " + _this._nodeProcessId + " from node (2nd try)");
                    }
                    _this._middleInitialize(stopped);
                });
            }
            else {
                this._middleInitialize(stopped);
            }
        }
        else {
            this._log("_startInitialize: no entry event after " + n + " retries; giving up");
            this._gotEntryEvent = true; // we pretend to got one so that no ENTRY_REASON event will show up later...
            this._node.command('frame', null, function (resp) {
                if (resp.success) {
                    _this._cacheRefs(resp);
                    var s = _this._getValueFromCache(resp.body.script);
                    _this._rememberEntryLocation(s.name, resp.body.line, resp.body.column);
                }
                _this._middleInitialize(stopped);
            });
        }
    };
    NodeDebugSession.prototype._middleInitialize = function (stopped) {
        // request UI to send breakpoints
        this._log('_middleInitialize: fire initialized event');
        this.sendEvent(new vscode_debugadapter_1.InitializedEvent());
        // in attach-mode we don't know whether the debuggee has been launched in 'stop on entry' mode
        // so we use the stopped state of the VM
        if (this._attachMode) {
            this._log("_middleInitialize: in attach mode we guess stopOnEntry flag to be \"" + stopped + "\"");
            this._stopOnEntry = stopped;
        }
        if (this._stopOnEntry) {
            // user has requested 'stop on entry' so send out a stop-on-entry
            this._log('_middleInitialize: fire stop-on-entry event');
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent(NodeDebugSession.ENTRY_REASON, NodeDebugSession.DUMMY_THREAD_ID));
        }
        else {
            // since we are stopped but UI doesn't know about this, remember that we continue later in finishInitialize()
            this._log('_middleInitialize: remember to do a "Continue" later');
            this._needContinue = true;
        }
    };
    //---- disconnect request -------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.disconnectRequest = function (response, args) {
        // special code for 'extensionHost' debugging
        if (this._adapterID === 'extensionHost') {
            // detect whether this disconnect request is part of a restart session
            if (this._nodeProcessId > 0 && args && typeof args.restart === 'boolean' && args.restart) {
                // do not kill extensionHost (since vscode will do this for us in a nicer way without killing the window)
                this._nodeProcessId = 0;
            }
        }
        _super.prototype.disconnectRequest.call(this, response, args);
    };
    /**
     * we rely on the generic implementation from DebugSession but we override 'Protocol.shutdown'
     * to disconnect from node and kill node & subprocesses
     */
    NodeDebugSession.prototype.shutdown = function () {
        var _this = this;
        if (!this._inShutdown) {
            this._inShutdown = true;
            if (this._attachMode) {
                // disconnect only in attach mode since otherwise node continues to run until it is killed
                this._node.command('disconnect'); // we don't wait for reponse
            }
            this._node.stop(); // stop socket connection (otherwise node.js dies with ECONNRESET on Windows)
            if (!this._attachMode) {
                // kill the whole process tree either starting with the terminal or with the node process
                var pid = this._terminalProcess ? this._terminalProcess.pid : this._nodeProcessId;
                if (pid > 0) {
                    this._log('shutdown: kill debugee and sub-processes');
                    terminal_1.Terminal.killTree(pid).then(function () {
                        _this._terminalProcess = null;
                        _this._nodeProcessId = -1;
                        _super.prototype.shutdown.call(_this);
                    }).catch(function (error) {
                        _this._terminalProcess = null;
                        _this._nodeProcessId = -1;
                        _super.prototype.shutdown.call(_this);
                    });
                    return;
                }
            }
            _super.prototype.shutdown.call(this);
        }
    };
    //--- set breakpoints request ---------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.setBreakPointsRequest = function (response, args) {
        var _this = this;
        this._log("setBreakPointsRequest");
        // normalize the two types of input arguments into an internal datastructure
        var lbs = new Array();
        if (args.breakpoints) {
            // prefer the new API: array of breakpoints
            for (var _i = 0, _a = args.breakpoints; _i < _a.length; _i++) {
                var b = _a[_i];
                lbs.push({
                    line: this.convertClientLineToDebugger(b.line),
                    column: typeof b.column === 'number' ? this.convertClientColumnToDebugger(b.column) : 0,
                    expression: b.condition,
                    actualLine: b.line,
                    actualColumn: typeof b.column === 'number' ? b.column : this.convertDebuggerColumnToClient(1),
                    verified: false,
                    ignore: false
                });
            }
        }
        else {
            // deprecated API: convert line number array
            for (var _b = 0, _c = args.lines; _b < _c.length; _b++) {
                var l = _c[_b];
                lbs.push({
                    line: this.convertClientLineToDebugger(l),
                    column: 0,
                    expression: undefined,
                    actualLine: l,
                    actualColumn: this.convertDebuggerColumnToClient(1),
                    verified: false,
                    ignore: false
                });
            }
        }
        var source = args.source;
        if (source.adapterData) {
            if (source.adapterData.inlinePath) {
                // a breakpoint in inlined source: we need to source map
                this._mapSourceAndUpdateBreakpoints(response, source.adapterData.inlinePath, lbs);
                return;
            }
            if (source.adapterData.remotePath) {
                // a breakpoint in a remote file: don't try to source map
                this._updateBreakpoints(response, source.adapterData.remotePath, -1, lbs);
                return;
            }
        }
        if (source.sourceReference > 0) {
            var srcSource = this._sourceHandles.get(source.sourceReference);
            if (srcSource && srcSource.scriptId) {
                this._updateBreakpoints(response, null, srcSource.scriptId, lbs);
                return;
            }
        }
        if (source.path) {
            var path = this.convertClientPathToDebugger(source.path);
            this._mapSourceAndUpdateBreakpoints(response, path, lbs);
            return;
        }
        if (source.name) {
            // a core module
            this._findModule(source.name, function (scriptId) {
                if (scriptId >= 0) {
                    _this._updateBreakpoints(response, null, scriptId, lbs);
                }
                else {
                    _this.sendErrorResponse(response, 2019, "internal module {_module} not found", { _module: source.name });
                }
                return;
            });
            return;
        }
        this.sendErrorResponse(response, 2012, "no valid source specified", null, vscode_debugadapter_1.ErrorDestination.Telemetry);
    };
    NodeDebugSession.prototype._mapSourceAndUpdateBreakpoints = function (response, path, lbs) {
        var sourcemap = false;
        var p = null;
        if (this._sourceMaps) {
            p = this._sourceMaps.MapPathFromSource(path);
        }
        if (p) {
            sourcemap = true;
            // source map line numbers
            for (var _i = 0; _i < lbs.length; _i++) {
                var lb = lbs[_i];
                var mapresult = this._sourceMaps.MapFromSource(path, lb.line, lb.column);
                if (mapresult) {
                    if (mapresult.path !== p) {
                    }
                    lb.line = mapresult.line;
                    lb.column = mapresult.column;
                }
                else {
                    // we couldn't map this breakpoint -> ignore it
                    lb.ignore = true;
                }
            }
            path = p;
        }
        else if (!NodeDebugSession.isJavaScript(path)) {
            // ignore all breakpoints for this source
            for (var _a = 0; _a < lbs.length; _a++) {
                var lb = lbs[_a];
                lb.ignore = true;
            }
        }
        // try to convert local path to remote path
        path = this._localToRemote(path);
        this._updateBreakpoints(response, path, -1, lbs, sourcemap);
    };
    /*
     * Phase 2 of setBreakpointsRequest: clear and set all breakpoints of a given source
     */
    NodeDebugSession.prototype._updateBreakpoints = function (response, path, scriptId, lbs, sourcemap) {
        var _this = this;
        if (sourcemap === void 0) { sourcemap = false; }
        // clear all existing breakpoints for the given path or script ID
        this._node.command('listbreakpoints', null, function (nodeResponse) {
            if (nodeResponse.success) {
                var toClear = new Array();
                var path_regexp = _this._pathToRegexp(path);
                // try to match breakpoints
                for (var _i = 0, _a = nodeResponse.body.breakpoints; _i < _a.length; _i++) {
                    var breakpoint = _a[_i];
                    switch (breakpoint.type) {
                        case 'scriptId':
                            if (scriptId === breakpoint.script_id) {
                                toClear.push(breakpoint.number);
                            }
                            break;
                        case 'scriptRegExp':
                            if (path_regexp === breakpoint.script_regexp) {
                                toClear.push(breakpoint.number);
                            }
                            break;
                    }
                }
                _this._clearBreakpoints(toClear, 0, function () {
                    _this._finishSetBreakpoints(response, path, scriptId, lbs, sourcemap);
                });
            }
            else {
                _this._sendNodeResponse(response, nodeResponse);
            }
        });
    };
    /**
     * Recursive function for deleting node breakpoints.
     */
    NodeDebugSession.prototype._clearBreakpoints = function (ids, ix, done) {
        var _this = this;
        if (ids.length == 0) {
            done();
            return;
        }
        this._node.command('clearbreakpoint', { breakpoint: ids[ix] }, function (nodeResponse) {
            if (!nodeResponse.success) {
            }
            if (ix + 1 < ids.length) {
                setImmediate(function () {
                    // recurse
                    _this._clearBreakpoints(ids, ix + 1, done);
                });
            }
            else {
                done();
            }
        });
    };
    /*
     * Finish the setBreakpointsRequest: set the breakpooints and send the verification response back to client
     */
    NodeDebugSession.prototype._finishSetBreakpoints = function (response, path, scriptId, lbs, sourcemap) {
        var _this = this;
        this._setBreakpoints(0, path, scriptId, lbs, sourcemap, function () {
            var breakpoints = new Array();
            for (var _i = 0; _i < lbs.length; _i++) {
                var lb = lbs[_i];
                breakpoints.push(new vscode_debugadapter_1.Breakpoint(lb.verified, lb.actualLine, lb.actualColumn));
            }
            response.body = {
                breakpoints: breakpoints
            };
            _this.sendResponse(response);
            _this._log("_finishSetBreakpoints: sent response");
        });
    };
    /**
     * Recursive function for setting node breakpoints.
     */
    NodeDebugSession.prototype._setBreakpoints = function (ix, path, scriptId, lbs, sourcemap, done) {
        var _this = this;
        if (lbs.length == 0) {
            done();
            return;
        }
        this._setBreakpoint(scriptId, path, lbs[ix], function (success, actualLine, actualColumn) {
            if (success) {
                // breakpoint successfully set and we've got an actual location
                if (sourcemap) {
                    // this source uses a sourcemap so we have to map js locations back to source locations
                    if (path && _this._sourceMaps) {
                        var mapresult = _this._sourceMaps.MapToSource(path, actualLine, actualColumn);
                        if (mapresult) {
                            actualLine = mapresult.line;
                            actualColumn = mapresult.column;
                        }
                    }
                }
                lbs[ix].verified = true;
                lbs[ix].actualLine = _this.convertDebuggerLineToClient(actualLine);
                lbs[ix].actualColumn = _this.convertDebuggerColumnToClient(actualColumn);
            }
            // nasty corner case: since we ignore the break-on-entry event we have to make sure that we
            // stop in the entry point line if the user has an explicit breakpoint there.
            // For this we check here whether a breakpoint is at the same location as the "break-on-entry" location.
            // If yes, then we plan for hitting the breakpoint instead of "continue" over it!
            if (!_this._stopOnEntry && _this._entryPath === path) {
                if (_this._entryLine === lbs[ix].line && _this._entryColumn === lbs[ix].column) {
                    // we do not have to "continue" but we have to generate a stopped event instead
                    _this._needContinue = false;
                    _this._needBreakpointEvent = true;
                    _this._log('_setBreakpoints: remember to fire a breakpoint event later');
                }
            }
            if (ix + 1 < lbs.length) {
                setImmediate(function () {
                    // recurse
                    _this._setBreakpoints(ix + 1, path, scriptId, lbs, sourcemap, done);
                });
            }
            else {
                done();
            }
        });
    };
    /*
     * register a single breakpoint with node.
     */
    NodeDebugSession.prototype._setBreakpoint = function (scriptId, path, lb, done) {
        var _this = this;
        if (lb.ignore) {
            // ignore this breakpoint because it couldn't be source mapped successfully
            done(false);
            return;
        }
        var line = lb.line;
        var column = lb.column;
        if (line === 0) {
            column += NodeDebugSession.FIRST_LINE_OFFSET;
        }
        var info = path;
        var a = {
            line: line,
            column: column
        };
        if (lb.expression) {
            a.condition = lb.expression;
        }
        if (scriptId > 0) {
            a.type = 'scriptId';
            a.target = scriptId;
            info = '' + scriptId;
        }
        else {
            a.type = 'scriptRegExp';
            a.target = this._pathToRegexp(path);
        }
        this._node.command('setbreakpoint', a, function (resp) {
            _this._log("_setBreakpoint: " + info + ": " + resp.success);
            if (resp.success) {
                var actualLine = lb.line;
                var actualColumn = lb.column;
                var al = resp.body.actual_locations;
                if (al.length > 0) {
                    actualLine = al[0].line;
                    actualColumn = _this._adjustColumn(actualLine, al[0].column);
                    if (actualLine !== lb.line) {
                    }
                }
                done(true, actualLine, actualColumn);
                return;
            }
            done(false);
            return;
        });
    };
    /**
     * converts a path into a regular expression for use in the setbreakpoint request
     */
    NodeDebugSession.prototype._pathToRegexp = function (path) {
        if (!path)
            return path;
        var escPath = path.replace(/([/\\.?*()^${}|[\]])/g, '\\$1');
        // check for drive letter
        if (/^[a-zA-Z]:\\/.test(path)) {
            var u = escPath.substring(0, 1).toUpperCase();
            var l = u.toLowerCase();
            escPath = '[' + l + u + ']' + escPath.substring(1);
        }
        /*
        // support case-insensitive breakpoint paths
        const escPathUpper = escPath.toUpperCase();
        const escPathLower = escPath.toLowerCase();

        escPath = '';
        for (var i = 0; i < escPathUpper.length; i++) {
            const u = escPathUpper[i];
            const l = escPathLower[i];
            if (u === l) {
                escPath += u;
            } else {
                escPath += '[' + l + u + ']';
            }
        }
        */
        var pathRegex = '^(.*[\\/\\\\])?' + escPath + '$'; // skips drive letters
        return pathRegex;
    };
    //--- set exception request -----------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.setExceptionBreakPointsRequest = function (response, args) {
        var _this = this;
        this._log("setExceptionBreakPointsRequest");
        var f;
        var filters = args.filters;
        if (filters) {
            if (filters.indexOf('all') >= 0) {
                f = 'all';
            }
            else if (filters.indexOf('uncaught') >= 0) {
                f = 'uncaught';
            }
        }
        // we need to simplify this...
        this._node.command('setexceptionbreak', { type: 'all', enabled: false }, function (nodeResponse1) {
            if (nodeResponse1.success) {
                _this._node.command('setexceptionbreak', { type: 'uncaught', enabled: false }, function (nodeResponse2) {
                    if (nodeResponse2.success) {
                        if (f) {
                            _this._node.command('setexceptionbreak', { type: f, enabled: true }, function (nodeResponse3) {
                                if (nodeResponse3.success) {
                                    _this.sendResponse(response); // send response for setexceptionbreak
                                }
                                else {
                                    _this._sendNodeResponse(response, nodeResponse3);
                                }
                            });
                        }
                        else {
                            _this.sendResponse(response); // send response for setexceptionbreak
                        }
                    }
                    else {
                        _this._sendNodeResponse(response, nodeResponse2);
                    }
                });
            }
            else {
                _this._sendNodeResponse(response, nodeResponse1);
            }
        });
    };
    //--- set exception request -----------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.configurationDoneRequest = function (response, args) {
        // all breakpoints are configured now -> start debugging
        var info = 'nothing to do';
        if (this._needContinue) {
            this._needContinue = false;
            info = 'do a "Continue"';
            this._node.command('continue', null, function (nodeResponse) { });
        }
        if (this._needBreakpointEvent) {
            this._needBreakpointEvent = false;
            info = 'fire breakpoint event';
            this.sendEvent(new vscode_debugadapter_1.StoppedEvent(NodeDebugSession.BREAKPOINT_REASON, NodeDebugSession.DUMMY_THREAD_ID));
        }
        this._log("configurationDoneRequest: " + info);
        this.sendResponse(response);
    };
    //--- threads request -----------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.threadsRequest = function (response) {
        var _this = this;
        this._node.command('threads', null, function (nodeResponse) {
            var threads = new Array();
            if (nodeResponse.success) {
                var ths = nodeResponse.body.threads;
                if (ths) {
                    for (var _i = 0; _i < ths.length; _i++) {
                        var thread = ths[_i];
                        var id = thread.id;
                        if (id >= 0) {
                            threads.push(new vscode_debugadapter_1.Thread(id, NodeDebugSession.DUMMY_THREAD_NAME));
                        }
                    }
                }
            }
            if (threads.length === 0) {
                threads.push(new vscode_debugadapter_1.Thread(NodeDebugSession.DUMMY_THREAD_ID, NodeDebugSession.DUMMY_THREAD_NAME));
            }
            response.body = {
                threads: threads
            };
            _this.sendResponse(response);
        });
    };
    //--- stacktrace request --------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.stackTraceRequest = function (response, args) {
        var _this = this;
        var threadReference = args.threadId;
        var maxLevels = args.levels;
        if (threadReference !== NodeDebugSession.DUMMY_THREAD_ID) {
            this.sendErrorResponse(response, 2014, "unexpected thread reference {_thread}", { _thread: threadReference }, vscode_debugadapter_1.ErrorDestination.Telemetry);
            return;
        }
        var stackframes = new Array();
        this._getStackFrames(stackframes, 0, maxLevels, function () {
            response.body = {
                stackFrames: stackframes
            };
            _this.sendResponse(response);
        });
    };
    /**
     * Recursive function for retrieving stackframes and their scopes in top to bottom order.
     */
    NodeDebugSession.prototype._getStackFrames = function (stackframes, frameIx, maxLevels, done) {
        var _this = this;
        this._node.command('backtrace', { fromFrame: frameIx, toFrame: frameIx + 1 }, function (backtraceResponse) {
            if (backtraceResponse.success) {
                _this._cacheRefs(backtraceResponse);
                var totalFrames = backtraceResponse.body.totalFrames;
                if (maxLevels > 0 && totalFrames > maxLevels) {
                    totalFrames = maxLevels;
                }
                if (totalFrames === 0) {
                    // no stack frames (probably because a 'pause' stops node in non-javascript code)
                    done();
                    return;
                }
                var frame = backtraceResponse.body.frames[0];
                // resolve some refs
                _this._getValues([frame.script, frame.func, frame.receiver], function () {
                    var line = frame.line;
                    var column = _this._adjustColumn(line, frame.column);
                    var src = null;
                    var origin = "content streamed from node";
                    var adapterData;
                    var script_val = _this._getValueFromCache(frame.script);
                    if (script_val) {
                        var name_1 = script_val.name;
                        if (name_1 && PathUtils.isAbsolutePath(name_1)) {
                            var remotePath = name_1; // with remote debugging path might come from a different OS
                            // if launch.json defines localRoot and remoteRoot try to convert remote path back to a local path
                            var localPath = _this._remoteToLocal(remotePath);
                            if (localPath !== remotePath && _this._attachMode) {
                                // assume attached to remote node process
                                origin = "content streamed from remote node";
                            }
                            name_1 = Path.basename(localPath);
                            // source mapping
                            if (_this._sourceMaps) {
                                // try to map
                                var mapresult = _this._sourceMaps.MapToSource(localPath, line, column);
                                if (mapresult) {
                                    // verify that a file exists at path
                                    if (FS.existsSync(mapresult.path)) {
                                        // use this mapping
                                        localPath = mapresult.path;
                                        name_1 = Path.basename(localPath);
                                        line = mapresult.line;
                                        column = mapresult.column;
                                    }
                                    else {
                                        // file doesn't exist at path
                                        // if source map has inlined source,
                                        var content = mapresult.content;
                                        if (content) {
                                            name_1 = Path.basename(mapresult.path);
                                            var sourceHandle = _this._sourceHandles.create(new SourceSource(0, content));
                                            var adapterData_1 = {
                                                inlinePath: mapresult.path
                                            };
                                            src = new vscode_debugadapter_1.Source(name_1, null, sourceHandle, "inlined content from source map", adapterData_1);
                                            line = mapresult.line;
                                            column = mapresult.column;
                                        }
                                    }
                                }
                            }
                            if (src === null) {
                                if (FS.existsSync(localPath)) {
                                    src = new vscode_debugadapter_1.Source(name_1, _this.convertDebuggerPathToClient(localPath));
                                }
                                else {
                                    // source doesn't exist locally
                                    adapterData = {
                                        remotePath: remotePath // assume it is a remote path
                                    };
                                }
                            }
                        }
                        else {
                            origin = "core module";
                        }
                        if (src === null) {
                            // fall back: source not found locally -> prepare to stream source content from node backend.
                            var script_id = script_val.id;
                            if (script_id >= 0) {
                                var sourceHandle = _this._sourceHandles.create(new SourceSource(script_id));
                                src = new vscode_debugadapter_1.Source(name_1, null, sourceHandle, origin, adapterData);
                            }
                        }
                    }
                    var func_name;
                    var func_val = _this._getValueFromCache(frame.func);
                    if (func_val) {
                        func_name = func_val.inferredName;
                        if (!func_name || func_name.length === 0) {
                            func_name = func_val.name;
                        }
                    }
                    if (!func_name || func_name.length === 0) {
                        func_name = NodeDebugSession.ANON_FUNCTION;
                    }
                    var frameReference = _this._frameHandles.create(frame);
                    var sf = new vscode_debugadapter_1.StackFrame(frameReference, func_name, src, _this.convertDebuggerLineToClient(line), _this.convertDebuggerColumnToClient(column));
                    stackframes.push(sf);
                    if (frameIx + 1 < totalFrames) {
                        // recurse
                        setImmediate(function () {
                            _this._getStackFrames(stackframes, frameIx + 1, maxLevels, done);
                        });
                    }
                    else {
                        // we are done
                        done();
                    }
                });
            }
            else {
                // error backtrace request
                // stackframes.push(new StackFrame(frameIx, NodeDebugSession.LARGE_DATASTRUCTURE_TIMEOUT, null, 0, 0, []));
                done();
            }
        });
    };
    //--- scopes request ------------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.scopesRequest = function (response, args) {
        var _this = this;
        var frame = this._frameHandles.get(args.frameId);
        if (!frame) {
            this.sendErrorResponse(response, 2020, "stack frame not valid");
            return;
        }
        var frameIx = frame.index;
        var frameThis = this._getValueFromCache(frame.receiver);
        this._node.command('scopes', { frame_index: frameIx, frameNumber: frameIx }, function (scopesResponse) {
            if (scopesResponse.success) {
                _this._cacheRefs(scopesResponse);
                var scopes = new Array();
                // exception scope
                if (frameIx === 0 && _this._exception) {
                    scopes.push(new vscode_debugadapter_1.Scope("Exception", _this._variableHandles.create(new PropertyExpander(_this._exception))));
                }
                _this._getScope(scopes, 0, scopesResponse.body.scopes, frameThis, function () {
                    response.body = {
                        scopes: scopes
                    };
                    _this.sendResponse(response);
                });
            }
            else {
                response.body = {
                    scopes: []
                };
                _this.sendResponse(response);
            }
        });
    };
    /**
     * Recursive function for creating scopes in top to bottom order.
     */
    NodeDebugSession.prototype._getScope = function (scopesResult, scopeIx, scopes, this_val, done) {
        var _this = this;
        var scope = scopes[scopeIx];
        var type = scope.type;
        var scopeName = (type >= 0 && type < NodeDebugSession.SCOPE_NAMES.length) ? NodeDebugSession.SCOPE_NAMES[type] : ("Unknown Scope:" + type);
        var extra = type === 1 ? this_val : null;
        var expensive = type === 0;
        this._getValue(scope.object, function (scopeObject) {
            if (scopeObject) {
                scopesResult.push(new vscode_debugadapter_1.Scope(scopeName, _this._variableHandles.create(new PropertyExpander(scopeObject, extra)), expensive));
            }
            if (scopeIx + 1 < scopes.length) {
                setImmediate(function () {
                    // recurse
                    _this._getScope(scopesResult, scopeIx + 1, scopes, this_val, done);
                });
            }
            else {
                done();
            }
        });
    };
    //--- variables request ---------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.variablesRequest = function (response, args) {
        var _this = this;
        var reference = args.variablesReference;
        var expander = this._variableHandles.get(reference);
        if (expander) {
            var variables = new Array();
            expander.Expand(this, variables, function () {
                variables.sort(NodeDebugSession.compareVariableNames);
                response.body = {
                    variables: variables
                };
                _this.sendResponse(response);
            });
        }
        else {
            response.body = {
                variables: []
            };
            this.sendResponse(response);
        }
    };
    /*
     * there are three modes:
     * "all": add all properties (indexed and named)
     * "range": add only the indexed properties between 'start' and 'end' (inclusive)
     * "named": add only the named properties.
     */
    NodeDebugSession.prototype._addProperties = function (variables, obj, mode, start, end, done) {
        var _this = this;
        var type = obj.type;
        if (type === 'object' || type === 'function' || type === 'error' || type === 'regexp' || type === 'map' || type === 'set') {
            var properties = obj.properties;
            if (!properties) {
                switch (mode) {
                    case "range":
                    case "all":
                        var size = obj.size;
                        if (size >= 0) {
                            var handle = obj.handle;
                            if (typeof handle === 'number' && handle != 0) {
                                this._addArrayElements(variables, handle, start, end, done);
                                return;
                            }
                        }
                        done("array size not found");
                        return;
                    case "named":
                        // can't add named properties because we don't have access to them yet.
                        break;
                }
                done();
                return;
            }
            var selectedProperties = new Array();
            // first pass: determine properties
            var found_proto = false;
            for (var _i = 0; _i < properties.length; _i++) {
                var property = properties[_i];
                if ('name' in property) {
                    var name_2 = property.name;
                    if (name_2 === NodeDebugSession.PROTO) {
                        found_proto = true;
                    }
                    switch (mode) {
                        case "all":
                            selectedProperties.push(property);
                            break;
                        case "named":
                            if (typeof name_2 == 'string') {
                                selectedProperties.push(property);
                            }
                            break;
                        case "range":
                            if (typeof name_2 == 'number' && name_2 >= start && name_2 <= end) {
                                selectedProperties.push(property);
                            }
                            break;
                    }
                }
            }
            // do we have to add the protoObject to the list of properties?
            if (!found_proto && (mode === 'all' || mode === 'named')) {
                var h = obj.handle;
                if (h > 0) {
                    obj.protoObject.name = NodeDebugSession.PROTO;
                    selectedProperties.push(obj.protoObject);
                }
            }
            // second pass: find properties where additional value lookup is required
            var needLookup = new Array();
            for (var _a = 0; _a < selectedProperties.length; _a++) {
                var property = selectedProperties[_a];
                if (!property.value && property.ref) {
                    if (needLookup.indexOf(property.ref) < 0) {
                        needLookup.push(property.ref);
                    }
                }
            }
            if (selectedProperties.length > 0) {
                // third pass: now lookup all refs at once
                this._resolveToCache(needLookup, function () {
                    // build variables
                    _this._addVariables(variables, selectedProperties, 0, done);
                });
                return;
            }
        }
        done();
    };
    /**
     * Recursive function for creating variables for the properties.
     */
    NodeDebugSession.prototype._addVariables = function (variables, properties, ix, done) {
        var _this = this;
        var property = properties[ix];
        var val = this._getValueFromCache(property);
        var name = property.name;
        if (typeof name == 'number') {
            name = "[" + name + "]";
        }
        this._addVariable(variables, name, val, function () {
            if (ix + 1 < properties.length) {
                setImmediate(function () {
                    // recurse
                    _this._addVariables(variables, properties, ix + 1, done);
                });
            }
            else {
                done();
            }
        });
    };
    NodeDebugSession.prototype._addArrayElements = function (variables, array_ref, start, end, done) {
        var _this = this;
        this._node.command('vscode_range', { handle: array_ref, from: start, to: end }, function (resp) {
            if (resp.success) {
                _this._addArrayElement(variables, start, resp.body.result, 0, done);
            }
            else {
                done(resp.message);
            }
        });
    };
    /**
     * Recursive function for creating variables for the given array items.
     */
    NodeDebugSession.prototype._addArrayElement = function (variables, start, items, ix, done) {
        var _this = this;
        var name = "[" + (start + ix) + "]";
        this._createVariable(name, items[ix], function (v) {
            variables.push(v);
            if (ix + 1 < items.length) {
                setImmediate(function () {
                    // recurse
                    _this._addArrayElement(variables, start, items, ix + 1, done);
                });
            }
            else {
                done();
            }
        });
    };
    NodeDebugSession.prototype._addVariable = function (variables, name, val, done) {
        this._createVariable(name, val, function (result) {
            if (result) {
                variables.push(result);
            }
            done();
        });
    };
    NodeDebugSession.prototype._createVariable = function (name, val, done) {
        var _this = this;
        if (!val) {
            done(null);
            return;
        }
        var str_val = val.value;
        var type = val.type;
        switch (type) {
            case 'object':
            case 'function':
            case 'regexp':
            case 'error':
                // indirect value
                var value = val.className;
                var text = val.text;
                switch (value) {
                    case 'Array':
                    case 'Buffer':
                    case 'Int8Array':
                    case 'Uint8Array':
                    case 'Uint8ClampedArray':
                    case 'Int16Array':
                    case 'Uint16Array':
                    case 'Int32Array':
                    case 'Uint32Array':
                    case 'Float32Array':
                    case 'Float64Array':
                        if (val.ref) {
                        }
                        var size = val.size; // probe for our own "size"
                        if (size) {
                            done(this._createArrayVariable(name, val, value, size));
                        }
                        else {
                            var l = val.properties[0];
                            if (l) {
                                size = l.value;
                                if (size) {
                                    done(this._createArrayVariable(name, val, value, size));
                                }
                                else {
                                    // the first property of arrays is the length
                                    this._getValue(l, function (length_val) {
                                        var size = -1;
                                        if (length_val) {
                                            size = length_val.value;
                                        }
                                        done(_this._createArrayVariable(name, val, value, size));
                                    });
                                }
                            }
                        }
                        return;
                    case 'RegExp':
                        done(new vscode_debugadapter_1.Variable(name, text, this._variableHandles.create(new PropertyExpander(val))));
                        return;
                    case 'Object':
                        this._getValue(val.constructorFunction, function (constructor_val) {
                            if (constructor_val) {
                                var constructor_name = constructor_val.name;
                                if (constructor_name) {
                                    value = constructor_name;
                                }
                            }
                            done(new vscode_debugadapter_1.Variable(name, value, _this._variableHandles.create(new PropertyExpander(val))));
                        });
                        return;
                    case 'Function':
                    case 'Error':
                    default:
                        if (text) {
                            if (text.indexOf('\n') >= 0) {
                                // replace body of function with '...'
                                var pos = text.indexOf('{');
                                if (pos > 0) {
                                    text = text.substring(0, pos) + '{ … }';
                                }
                            }
                            value = text;
                        }
                        break;
                }
                done(new vscode_debugadapter_1.Variable(name, value, this._variableHandles.create(new PropertyExpander(val))));
                return;
            case 'string':
                if (str_val) {
                    str_val = str_val.replace('\n', '\\n').replace('\r', '\\r');
                }
                done(new vscode_debugadapter_1.Variable(name, "\"" + str_val + "\""));
                return;
            case 'boolean':
                done(new vscode_debugadapter_1.Variable(name, str_val.toString().toLowerCase())); // node returns these boolean values capitalized
                return;
            case 'map':
            case 'set':
            case 'undefined':
            case 'null':
                // type is only info we have
                done(new vscode_debugadapter_1.Variable(name, type));
                return;
            case 'number':
                done(new vscode_debugadapter_1.Variable(name, '' + val.value));
                return;
            case 'frame':
            default:
                done(new vscode_debugadapter_1.Variable(name, str_val ? str_val.toString() : 'undefined'));
                return;
        }
    };
    NodeDebugSession.prototype._createArrayVariable = function (name, val, value, size) {
        value += (size >= 0) ? "[" + size + "]" : '[]';
        var expander = (size > RANGESIZE) ? new ArrayExpander(val, size) : new PropertyExpander(val); // new PropertyRangeExpander(val, 0, size-1);
        return new vscode_debugadapter_1.Variable(name, value, this._variableHandles.create(expander));
    };
    //--- pause request -------------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.pauseRequest = function (response, args) {
        var _this = this;
        this._node.command('suspend', null, function (nodeResponse) {
            if (nodeResponse.success) {
                _this._stopped('pause');
                _this._lastStoppedEvent = new vscode_debugadapter_1.StoppedEvent(NodeDebugSession.USER_REQUEST_REASON, NodeDebugSession.DUMMY_THREAD_ID);
                _this.sendResponse(response);
                _this.sendEvent(_this._lastStoppedEvent);
            }
            else {
                _this._sendNodeResponse(response, nodeResponse);
            }
        });
    };
    //--- continue request ----------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.continueRequest = function (response, args) {
        var _this = this;
        this._node.command('continue', null, function (nodeResponse) {
            _this._sendNodeResponse(response, nodeResponse);
        });
    };
    //--- step request --------------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.stepInRequest = function (response, args) {
        var _this = this;
        this._node.command('continue', { stepaction: 'in' }, function (nodeResponse) {
            _this._sendNodeResponse(response, nodeResponse);
        });
    };
    NodeDebugSession.prototype.stepOutRequest = function (response, args) {
        var _this = this;
        this._node.command('continue', { stepaction: 'out' }, function (nodeResponse) {
            _this._sendNodeResponse(response, nodeResponse);
        });
    };
    NodeDebugSession.prototype.nextRequest = function (response, args) {
        var _this = this;
        this._node.command('continue', { stepaction: 'next' }, function (nodeResponse) {
            _this._sendNodeResponse(response, nodeResponse);
        });
    };
    //--- evaluate request ----------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.evaluateRequest = function (response, args) {
        var _this = this;
        var expression = args.expression;
        var evalArgs = {
            expression: expression,
            disable_break: true,
            maxStringLength: 10000
        };
        if (args.frameId > 0) {
            var frame = this._frameHandles.get(args.frameId);
            if (!frame) {
                this.sendErrorResponse(response, 2020, "stack frame not valid");
                return;
            }
            var frameIx = frame.index;
            evalArgs.frame = frameIx;
        }
        else {
            evalArgs.global = true;
        }
        this._node.command(this._nodeExtensionsAvailable ? 'vscode_evaluate' : 'evaluate', evalArgs, function (resp) {
            if (resp.success) {
                _this._createVariable('evaluate', resp.body, function (v) {
                    if (v) {
                        response.body = {
                            result: v.value,
                            variablesReference: v.variablesReference
                        };
                    }
                    else {
                        response.success = false;
                        response.message = "not available";
                    }
                    _this.sendResponse(response);
                });
            }
            else {
                response.success = false;
                if (resp.message.indexOf('ReferenceError: ') === 0 || resp.message === 'No frames') {
                    response.message = "not available";
                }
                else if (resp.message.indexOf('SyntaxError: ') === 0) {
                    var m = resp.message.substring('SyntaxError: '.length).toLowerCase();
                    response.message = "invalid expression: " + m;
                }
                else {
                    response.message = resp.message;
                }
                _this.sendResponse(response);
            }
        });
    };
    //--- source request ------------------------------------------------------------------------------------------------------
    NodeDebugSession.prototype.sourceRequest = function (response, args) {
        var _this = this;
        var sourceHandle = args.sourceReference;
        var srcSource = this._sourceHandles.get(sourceHandle);
        if (srcSource.source) {
            response.body = {
                content: srcSource.source
            };
            this.sendResponse(response);
            return;
        }
        if (srcSource.scriptId) {
            this._node.command('scripts', { types: 1 + 2 + 4, includeSource: true, ids: [srcSource.scriptId] }, function (nodeResponse) {
                if (nodeResponse.success) {
                    srcSource.source = nodeResponse.body[0].source;
                }
                else {
                    srcSource.source = "<source not found>";
                }
                response.body = {
                    content: srcSource.source
                };
                _this.sendResponse(response);
            });
        }
        else {
            this.sendErrorResponse(response, 9999, "sourceRequest error");
        }
    };
    //---- private helpers ----------------------------------------------------------------------------------------------------
    /**
     * Tries to map a (local) VSCode path to a corresponding path on a remote host (where node is running).
     * The remote host might use a different OS so we have to make sure to create correct file pathes.
     */
    NodeDebugSession.prototype._localToRemote = function (path) {
        if (this._remoteRoot && this._localRoot) {
            var relPath = PathUtils.makeRelative2(this._localRoot, path);
            path = PathUtils.join(this._remoteRoot, relPath);
            if (/^[a-zA-Z]:[\/\\]/.test(this._remoteRoot)) {
                path = PathUtils.toWindows(path);
            }
        }
        return path;
    };
    /**
     * Tries to map a path from the remote host (where node is running) to a corresponding local path.
     * The remote host might use a different OS so we have to make sure to create correct file pathes.
     */
    NodeDebugSession.prototype._remoteToLocal = function (path) {
        if (this._remoteRoot && this._localRoot) {
            var relPath = PathUtils.makeRelative2(this._remoteRoot, path);
            path = PathUtils.join(this._localRoot, relPath);
            if (process.platform === 'win32') {
                relPath = PathUtils.toWindows(path);
            }
        }
        return path;
    };
    NodeDebugSession.prototype._sendNodeResponse = function (response, nodeResponse) {
        if (nodeResponse.success) {
            this.sendResponse(response);
        }
        else {
            var errmsg = nodeResponse.message;
            if (errmsg.indexOf('unresponsive') >= 0) {
                this.sendErrorResponse(response, 2015, "request '{_request}' was cancelled because node is unresponsive", { _request: nodeResponse.command });
            }
            else if (errmsg.indexOf('timeout') >= 0) {
                this.sendErrorResponse(response, 2016, "node did not repond to request '{_request}' in a reasonable amount of time", { _request: nodeResponse.command });
            }
            else {
                this.sendErrorResponse(response, 2013, "node request '{_request}' failed (reason: {_error})", { _request: nodeResponse.command, _error: errmsg }, vscode_debugadapter_1.ErrorDestination.Telemetry);
            }
        }
    };
    NodeDebugSession.prototype._repeater = function (n, done, asyncwork) {
        var _this = this;
        if (n > 0) {
            asyncwork(function (again) {
                if (again) {
                    setTimeout(function () {
                        // recurse
                        _this._repeater(n - 1, done, asyncwork);
                    }, 100); // retry after 100 ms
                }
                else {
                    done(true);
                }
            });
        }
        else {
            done(false);
        }
    };
    NodeDebugSession.prototype._cacheRefs = function (response) {
        var refs = response.refs;
        for (var _i = 0; _i < refs.length; _i++) {
            var r = refs[_i];
            this._cache(r.handle, r);
        }
    };
    NodeDebugSession.prototype._cache = function (handle, o) {
        this._refCache[handle] = o;
    };
    NodeDebugSession.prototype._getValues = function (containers, done) {
        var handles = [];
        for (var _i = 0; _i < containers.length; _i++) {
            var container = containers[_i];
            handles.push(container.ref);
        }
        this._resolveToCache(handles, function () {
            done();
        });
    };
    NodeDebugSession.prototype._getValue = function (container, done) {
        var _this = this;
        if (container) {
            var handle = container.ref;
            this._resolveToCache([handle], function () {
                var value = _this._refCache[handle];
                done(value);
            });
        }
        else {
            done(null);
        }
    };
    NodeDebugSession.prototype._getValueFromCache = function (container) {
        var handle = container.ref;
        var value = this._refCache[handle];
        if (value)
            return value;
        // console.error("ref not found cache");
        return null;
    };
    NodeDebugSession.prototype._resolveToCache = function (handles, done) {
        var _this = this;
        var lookup = new Array();
        for (var _i = 0; _i < handles.length; _i++) {
            var handle = handles[_i];
            var val = this._refCache[handle];
            if (!val) {
                if (handle >= 0) {
                    lookup.push(handle);
                }
                else {
                }
            }
        }
        if (lookup.length > 0) {
            this._node.command(this._nodeExtensionsAvailable ? 'vscode_lookup' : 'lookup', { handles: lookup }, function (resp) {
                if (resp.success) {
                    _this._cacheRefs(resp);
                    for (var key in resp.body) {
                        var obj = resp.body[key];
                        var handle = obj.handle;
                        _this._cache(handle, obj);
                    }
                }
                else {
                    var val;
                    if (resp.message.indexOf('timeout') >= 0) {
                        val = { type: 'number', value: NodeDebugSession.LARGE_DATASTRUCTURE_TIMEOUT };
                    }
                    else {
                        val = { type: 'number', value: "<data error: " + resp.message + ">" };
                    }
                    // store error value in cache
                    for (var i = 0; i < handles.length; i++) {
                        var handle = handles[i];
                        var r = _this._refCache[handle];
                        if (!r) {
                            _this._cache(handle, val);
                        }
                    }
                }
                done();
            });
        }
        else {
            done();
        }
    };
    NodeDebugSession.prototype._createStoppedEvent = function (body) {
        // workaround: load sourcemap for this location to populate cache
        if (this._sourceMaps) {
            var path = body.script.name;
            if (path && PathUtils.isAbsolutePath(path)) {
                path = this._remoteToLocal(path);
                this._sourceMaps.MapToSource(path, 0, 0);
            }
        }
        var reason;
        var exception_text;
        // is exception?
        if (body.exception) {
            this._exception = body.exception;
            exception_text = body.exception.text;
            reason = NodeDebugSession.EXCEPTION_REASON;
        }
        // is breakpoint?
        if (!reason) {
            var breakpoints = body.breakpoints;
            if (isArray(breakpoints) && breakpoints.length > 0) {
                var id = breakpoints[0];
                if (!this._gotEntryEvent && id === 1) {
                    reason = NodeDebugSession.ENTRY_REASON;
                    this._rememberEntryLocation(body.script.name, body.sourceLine, body.sourceColumn);
                }
                else {
                    reason = NodeDebugSession.BREAKPOINT_REASON;
                }
            }
        }
        // is debugger statement?
        if (!reason) {
            var sourceLine = body.sourceLineText;
            if (sourceLine && sourceLine.indexOf('debugger') >= 0) {
                reason = NodeDebugSession.DEBUGGER_REASON;
            }
        }
        // must be "step"!
        if (!reason) {
            reason = NodeDebugSession.STEP_REASON;
        }
        return new vscode_debugadapter_1.StoppedEvent(reason, NodeDebugSession.DUMMY_THREAD_ID, exception_text);
    };
    NodeDebugSession.prototype._rememberEntryLocation = function (path, line, column) {
        if (path) {
            this._entryPath = path;
            this._entryLine = line;
            this._entryColumn = this._adjustColumn(line, column);
            this._gotEntryEvent = true;
        }
    };
    /**
     * workaround for column being off in the first line (because of a wrapped anonymous function)
     */
    NodeDebugSession.prototype._adjustColumn = function (line, column) {
        if (line === 0) {
            column -= NodeDebugSession.FIRST_LINE_OFFSET;
            if (column < 0) {
                column = 0;
            }
        }
        return column;
    };
    NodeDebugSession.prototype._findModule = function (name, done) {
        this._node.command('scripts', { types: 1 + 2 + 4, filter: name }, function (resp) {
            if (resp.success) {
                for (var _i = 0, _a = resp.body; _i < _a.length; _i++) {
                    var result = _a[_i];
                    if (result.name === name) {
                        done(result.id);
                        return;
                    }
                }
            }
            done(-1); // not found
        });
    };
    NodeDebugSession.prototype._log = function (message) {
        if (NodeDebugSession.TRACE) {
            var s = process.pid + ": " + message + '\r\n';
            //console.error(s);
            this.sendEvent(new vscode_debugadapter_1.OutputEvent(s, 'stderr'));
        }
    };
    //---- private static ---------------------------------------------------------------
    NodeDebugSession.isJavaScript = function (path) {
        var name = Path.basename(path).toLowerCase();
        if (endsWith(name, '.js')) {
            return true;
        }
        try {
            var buffer = new Buffer(30);
            var fd = FS.openSync(path, 'r');
            FS.readSync(fd, buffer, 0, buffer.length, 0);
            FS.closeSync(fd);
            var line = buffer.toString();
            if (NodeDebugSession.NODE_SHEBANG_MATCHER.test(line)) {
                return true;
            }
        }
        catch (e) {
        }
        return false;
    };
    NodeDebugSession.compareVariableNames = function (v1, v2) {
        var n1 = v1.name;
        var n2 = v2.name;
        if (n1 === NodeDebugSession.PROTO) {
            return 1;
        }
        if (n2 === NodeDebugSession.PROTO) {
            return -1;
        }
        // convert [n], [n..m] -> n
        n1 = NodeDebugSession.extractNumber(n1);
        n2 = NodeDebugSession.extractNumber(n2);
        var i1 = parseInt(n1);
        var i2 = parseInt(n2);
        var isNum1 = !isNaN(i1);
        var isNum2 = !isNaN(i2);
        if (isNum1 && !isNum2) {
            return 1; // numbers after names
        }
        if (!isNum1 && isNum2) {
            return -1; // names before numbers
        }
        if (isNum1 && isNum2) {
            return i1 - i2;
        }
        return n1.localeCompare(n2);
    };
    NodeDebugSession.extractNumber = function (s) {
        if (s[0] === '[' && s[s.length - 1] === ']') {
            s = s.substring(1, s.length - 1);
            var p = s.indexOf('..');
            if (p >= 0) {
                s = s.substring(0, p);
            }
        }
        return s;
    };
    NodeDebugSession.TRACE = false;
    NodeDebugSession.NODE = 'node';
    NodeDebugSession.DUMMY_THREAD_ID = 1;
    NodeDebugSession.DUMMY_THREAD_NAME = 'Node';
    NodeDebugSession.FIRST_LINE_OFFSET = 62;
    NodeDebugSession.PROTO = '__proto__';
    NodeDebugSession.DEBUG_EXTENSION = 'debugExtension.js';
    NodeDebugSession.NODE_TERMINATION_POLL_INTERVAL = 3000;
    NodeDebugSession.ATTACH_TIMEOUT = 10000;
    NodeDebugSession.NODE_SHEBANG_MATCHER = new RegExp('#! */usr/bin/env +node');
    // stop reasons
    NodeDebugSession.ENTRY_REASON = "entry";
    NodeDebugSession.STEP_REASON = "step";
    NodeDebugSession.BREAKPOINT_REASON = "breakpoint";
    NodeDebugSession.EXCEPTION_REASON = "exception";
    NodeDebugSession.DEBUGGER_REASON = "debugger statement";
    NodeDebugSession.USER_REQUEST_REASON = "user request";
    NodeDebugSession.ANON_FUNCTION = "(anonymous function)";
    NodeDebugSession.SCOPE_NAMES = ["Global", "Local", "With", "Closure", "Catch", "Block", "Script"];
    NodeDebugSession.LARGE_DATASTRUCTURE_TIMEOUT = "<...>"; // "<large data structure timeout>";
    return NodeDebugSession;
})(vscode_debugadapter_1.DebugSession);
exports.NodeDebugSession = NodeDebugSession;
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}
function random(low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}
function isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
}
function extendObject(objectCopy, object) {
    for (var key in object) {
        if (object.hasOwnProperty(key)) {
            objectCopy[key] = object[key];
        }
    }
    return objectCopy;
}
vscode_debugadapter_1.DebugSession.run(NodeDebugSession);
//# sourceMappingURL=nodeDebug.js.map