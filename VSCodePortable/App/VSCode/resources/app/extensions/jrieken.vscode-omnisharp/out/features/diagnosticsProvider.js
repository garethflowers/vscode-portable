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
var abstractProvider_1 = require('./abstractProvider');
var proto = require('../protocol');
var typeConvertion_1 = require('../typeConvertion');
var vscode_1 = require('vscode');
var Advisor = (function () {
    function Advisor(server) {
        this._packageRestoreCounter = 0;
        this._projectSourceFileCounts = Object.create(null);
        this._server = server;
        var d1 = server.onProjectChange(this._onProjectChange, this);
        var d2 = server.onBeforePackageRestore(this._onBeforePackageRestore, this);
        var d3 = server.onPackageRestore(this._onPackageRestore, this);
        this._disposable = vscode_1.Disposable.from(d1, d2, d3);
    }
    Advisor.prototype.dispose = function () {
        this._disposable.dispose();
    };
    Advisor.prototype.shouldValidateFiles = function () {
        return this._isServerStarted()
            && !this._isRestoringPackages();
    };
    Advisor.prototype.shouldValidateProject = function () {
        return this._isServerStarted()
            && !this._isRestoringPackages()
            && !this._isHugeProject();
    };
    Advisor.prototype._onProjectChange = function (info) {
        if (info.DnxProject && info.DnxProject.SourceFiles) {
            this._projectSourceFileCounts[info.DnxProject.Path] = info.DnxProject.SourceFiles.length;
        }
        if (info.MsBuildProject && info.MsBuildProject.SourceFiles) {
            this._projectSourceFileCounts[info.MsBuildProject.Path] = info.MsBuildProject.SourceFiles.length;
        }
    };
    Advisor.prototype._onBeforePackageRestore = function () {
        this._packageRestoreCounter += 1;
    };
    Advisor.prototype._onPackageRestore = function () {
        this._packageRestoreCounter -= 1;
    };
    Advisor.prototype._isServerStarted = function () {
        return this._server.isRunning();
    };
    Advisor.prototype._isRestoringPackages = function () {
        return this._packageRestoreCounter > 0;
    };
    Advisor.prototype._isHugeProject = function () {
        var sourceFileCount = 0;
        for (var key in this._projectSourceFileCounts) {
            sourceFileCount += this._projectSourceFileCounts[key];
            if (sourceFileCount > 1000) {
                return true;
            }
        }
        return false;
    };
    return Advisor;
})();
exports.Advisor = Advisor;
function reportDiagnostics(server, advisor) {
    return new DiagnosticsProvider(server, advisor);
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = reportDiagnostics;
var DiagnosticsProvider = (function (_super) {
    __extends(DiagnosticsProvider, _super);
    function DiagnosticsProvider(server, validationAdvisor) {
        var _this = this;
        _super.call(this, server);
        this._documentValidations = Object.create(null);
        this._validationAdvisor = validationAdvisor;
        this._diagnostics = vscode_1.languages.createDiagnosticCollection('omnisharp');
        var d1 = this._server.onPackageRestore(this._validateProject, this);
        var d2 = this._server.onProjectChange(this._validateProject, this);
        var d4 = vscode_1.workspace.onDidOpenTextDocument(function (event) { return _this._onDocumentAddOrChange(event); }, this);
        var d3 = vscode_1.workspace.onDidChangeTextDocument(function (event) { return _this._onDocumentAddOrChange(event.document); }, this);
        var d5 = vscode_1.workspace.onDidCloseTextDocument(this._onDocumentRemove, this);
        this._disposable = vscode_1.Disposable.from(this._diagnostics, d1, d2, d3, d4, d5);
    }
    DiagnosticsProvider.prototype.dispose = function () {
        if (this._projectValidation) {
            this._projectValidation.dispose();
        }
        for (var key in this._documentValidations) {
            this._documentValidations[key].dispose();
        }
        this._disposable.dispose();
    };
    DiagnosticsProvider.prototype._onDocumentAddOrChange = function (document) {
        if (document.languageId === 'csharp' && document.uri.scheme === 'file') {
            this._validateDocument(document);
            this._validateProject();
        }
    };
    DiagnosticsProvider.prototype._onDocumentRemove = function (document) {
        var key = document.uri.toString();
        var didChange = false;
        if (this._diagnostics[key]) {
            didChange = true;
            this._diagnostics[key].dispose();
            delete this._diagnostics[key];
        }
        if (this._documentValidations[key]) {
            didChange = true;
            this._documentValidations[key].cancel();
            delete this._documentValidations[key];
        }
        if (didChange) {
            this._validateProject();
        }
    };
    DiagnosticsProvider.prototype._validateDocument = function (document) {
        var _this = this;
        if (!this._validationAdvisor.shouldValidateFiles()) {
            return;
        }
        var key = document.uri.toString();
        if (this._documentValidations[key]) {
            this._documentValidations[key].cancel();
        }
        var source = new vscode_1.CancellationTokenSource();
        var handle = setTimeout(function () {
            var req = { Filename: document.fileName };
            _this._server.makeRequest(proto.CodeCheck, req, source.token).then(function (value) {
                // (re)set new diagnostics for this document
                var diagnostics = value.QuickFixes.map(DiagnosticsProvider._asDiagnostic);
                _this._diagnostics.set(document.uri, diagnostics);
            });
        }, 750);
        source.token.onCancellationRequested(function () { return clearTimeout(handle); });
        this._documentValidations[key] = source;
    };
    DiagnosticsProvider.prototype._validateProject = function () {
        var _this = this;
        if (!this._validationAdvisor.shouldValidateProject()) {
            return;
        }
        if (this._projectValidation) {
            this._projectValidation.cancel();
        }
        this._projectValidation = new vscode_1.CancellationTokenSource();
        var handle = setTimeout(function () {
            _this._server.makeRequest(proto.CodeCheck, {}, _this._projectValidation.token).then(function (value) {
                var quickFixes = value.QuickFixes.sort(function (a, b) { return a.FileName.localeCompare(b.FileName); });
                var entries = [];
                var lastEntry;
                for (var _i = 0; _i < quickFixes.length; _i++) {
                    var quickFix = quickFixes[_i];
                    var diag = DiagnosticsProvider._asDiagnostic(quickFix);
                    var uri = vscode_1.Uri.file(quickFix.FileName);
                    if (lastEntry && lastEntry[0].toString() === uri.toString()) {
                        lastEntry[1].push(diag);
                    }
                    else {
                        lastEntry = [uri, [diag]];
                        entries.push(lastEntry);
                    }
                }
                // replace all entries
                _this._diagnostics.set(entries);
            });
        }, 3000);
        // clear timeout on cancellation
        this._projectValidation.token.onCancellationRequested(function () {
            clearTimeout(handle);
        });
    };
    // --- data converter
    DiagnosticsProvider._asDiagnostic = function (quickFix) {
        var severity = DiagnosticsProvider._asDiagnosticSeverity(quickFix.LogLevel);
        var message = quickFix.Text + " [" + quickFix.Projects.map(function (n) { return DiagnosticsProvider._asProjectLabel(n); }).join(', ') + "]";
        return new vscode_1.Diagnostic(typeConvertion_1.toRange(quickFix), message, severity);
    };
    DiagnosticsProvider._asDiagnosticSeverity = function (logLevel) {
        switch (logLevel.toLowerCase()) {
            case 'hidden':
            case 'warning':
            case 'warn':
                return vscode_1.DiagnosticSeverity.Warning;
            default:
                return vscode_1.DiagnosticSeverity.Error;
        }
    };
    DiagnosticsProvider._asProjectLabel = function (projectName) {
        var idx = projectName.indexOf('+');
        return projectName.substr(idx + 1);
    };
    return DiagnosticsProvider;
})(abstractProvider_1.default);
//# sourceMappingURL=diagnosticsProvider.js.map