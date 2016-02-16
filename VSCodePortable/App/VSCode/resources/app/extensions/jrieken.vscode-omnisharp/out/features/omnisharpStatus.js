/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var commands_1 = require('./commands');
var path_1 = require('path');
var proto = require('../protocol');
function reportStatus(server) {
    return vscode.Disposable.from(reportServerStatus(server), forwardOutput(server), reportDocumentStatus(server));
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = reportStatus;
// --- document status
var defaultSelector = [
    'csharp',
    { pattern: '**/project.json' },
    { pattern: '**/*.sln' },
    { pattern: '**/*.csproj' } // an csproj file
];
var Status = (function () {
    function Status(selector) {
        this.selector = selector;
    }
    return Status;
})();
function reportDocumentStatus(server) {
    var disposables = [];
    var entry = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
    var defaultStatus = new Status(defaultSelector);
    var projectStatus;
    function render() {
        if (!vscode.window.activeTextEditor) {
            entry.hide();
            return;
        }
        var document = vscode.window.activeTextEditor.document;
        var status;
        if (projectStatus && vscode.languages.match(projectStatus.selector, document)) {
            status = projectStatus;
        }
        else if (defaultStatus.text && vscode.languages.match(defaultStatus.selector, document)) {
            status = defaultStatus;
        }
        if (status) {
            entry.text = status.text;
            entry.command = status.command;
            entry.color = status.color;
            entry.show();
            return;
        }
        entry.hide();
    }
    disposables.push(vscode.window.onDidChangeActiveTextEditor(render));
    disposables.push(server.onServerError(function (err) {
        defaultStatus.text = '$(flame) Error starting OmniSharp';
        defaultStatus.command = 'o.showOutput';
        defaultStatus.color = '';
        render();
    }));
    disposables.push(server.onMultipleLaunchTargets(function (targets) {
        defaultStatus.text = '$(flame) Select project';
        defaultStatus.command = 'o.pickProjectAndStart';
        defaultStatus.color = 'rgb(90, 218, 90)';
        render();
    }));
    disposables.push(server.onBeforeServerStart(function (path) {
        defaultStatus.text = '$(flame) Starting...';
        defaultStatus.command = 'o.showOutput';
        defaultStatus.color = '';
        render();
    }));
    disposables.push(server.onServerStop(function () {
        projectStatus = undefined;
        defaultStatus.text = undefined;
    }));
    disposables.push(server.onServerStart(function (path) {
        defaultStatus.text = '$(flame) Running';
        defaultStatus.command = 'o.pickProjectAndStart';
        defaultStatus.color = '';
        render();
        function updateProjectInfo() {
            server.makeRequest(proto.Projects).then(function (info) {
                var fileNames = [];
                var label;
                // show sln-file if applicable
                if (info.MsBuild.SolutionPath) {
                    label = path_1.basename(info.MsBuild.SolutionPath); //workspace.getRelativePath(info.MsBuild.SolutionPath);
                    fileNames.push({ pattern: info.MsBuild.SolutionPath });
                    for (var _i = 0, _a = info.MsBuild.Projects; _i < _a.length; _i++) {
                        var project = _a[_i];
                        fileNames.push({ pattern: project.Path });
                        if (project.SourceFiles) {
                            for (var _b = 0, _c = project.SourceFiles; _b < _c.length; _b++) {
                                var sourceFile = _c[_b];
                                fileNames.push({ pattern: sourceFile });
                            }
                        }
                    }
                }
                // show dnx projects if applicable
                var count = 0;
                for (var _d = 0, _e = info.Dnx.Projects; _d < _e.length; _d++) {
                    var project = _e[_d];
                    count += 1;
                    fileNames.push({ pattern: project.Path });
                    if (project.SourceFiles) {
                        for (var _f = 0, _g = project.SourceFiles; _f < _g.length; _f++) {
                            var sourceFile = _g[_f];
                            fileNames.push({ pattern: sourceFile });
                        }
                    }
                }
                if (label) {
                }
                else if (count === 1) {
                    label = path_1.basename(info.Dnx.Projects[0].Path); //workspace.getRelativePath(info.Dnx.Projects[0].Path);
                }
                else {
                    label = count + " projects";
                }
                // set project info
                projectStatus = new Status(fileNames);
                projectStatus.text = '$(flame) ' + label;
                projectStatus.command = 'o.pickProjectAndStart';
                // default is to change project
                defaultStatus.text = '$(flame) Switch projects';
                defaultStatus.command = 'o.pickProjectAndStart';
                render();
            });
        }
        disposables.push(server.onProjectAdded(updateProjectInfo));
        disposables.push(server.onProjectChange(updateProjectInfo));
        disposables.push(server.onProjectRemoved(updateProjectInfo));
    }));
    return (_a = vscode.Disposable).from.apply(_a, disposables);
    var _a;
}
exports.reportDocumentStatus = reportDocumentStatus;
// ---- server status
function reportServerStatus(server) {
    function appendLine(value) {
        if (value === void 0) { value = ''; }
        server.getChannel().appendLine(value);
    }
    var d0 = server.onServerError(function (err) {
        appendLine('[ERROR] ' + err);
    });
    var d1 = server.onError(function (message) {
        if (message.FileName) {
            appendLine(message.FileName + "(" + message.Line + "," + message.Column + ")");
        }
        appendLine(message.Text);
        appendLine();
        showMessageSoon();
    });
    var d2 = server.onMsBuildProjectDiagnostics(function (message) {
        function asErrorMessage(message) {
            var value = message.FileName + "(" + message.StartLine + "," + message.StartColumn + "): Error: " + message.Text;
            appendLine(value);
        }
        function asWarningMessage(message) {
            var value = message.FileName + "(" + message.StartLine + "," + message.StartColumn + "): Warning: " + message.Text;
            appendLine(value);
        }
        if (message.Errors.length > 0 || message.Warnings.length > 0) {
            appendLine(message.FileName);
            message.Errors.forEach(function (error) { return asErrorMessage; });
            message.Warnings.forEach(function (warning) { return asWarningMessage; });
            appendLine();
            showMessageSoon();
        }
    });
    var d3 = server.onUnresolvedDependencies(function (message) {
        var info = "There are unresolved dependencies from '" + vscode.workspace.asRelativePath(message.FileName) + "'. Please execute the restore command to continue.";
        return vscode.window.showInformationMessage(info, 'Restore').then(function (value) {
            if (value) {
                commands_1.dnxRestoreForProject(server, message.FileName);
            }
        });
    });
    return vscode.Disposable.from(d0, d1, d2, d3);
}
exports.reportServerStatus = reportServerStatus;
// show user message
var _messageHandle;
function showMessageSoon() {
    clearTimeout(_messageHandle);
    _messageHandle = setTimeout(function () {
        var message = "Some projects have trouble loading. Please review the output for more details.";
        vscode.window.showWarningMessage(message, { title: "Show Output", command: 'o.showOutput' }).then(function (value) {
            if (value) {
                vscode.commands.executeCommand(value.command);
            }
        });
    }, 1500);
}
// --- mirror output in channel
function forwardOutput(server) {
    var logChannel = server.getChannel();
    var timing200Pattern = /^\[INFORMATION:OmniSharp.Middleware.LoggingMiddleware\] \/\w+: 200 \d+ms/;
    function forward(message) {
        // strip stuff like: /codecheck: 200 339ms
        if (!timing200Pattern.test(message)) {
            logChannel.append(message);
        }
    }
    return vscode.Disposable.from(server.onStdout(forward), server.onStderr(forward));
}
//# sourceMappingURL=omnisharpStatus.js.map