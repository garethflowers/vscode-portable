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
var vscode_1 = require('vscode');
var abstractProvider_1 = require('./abstractProvider');
var protocol_1 = require('../protocol');
var typeConvertion_1 = require('../typeConvertion');
var OmnisharpCodeActionProvider = (function (_super) {
    __extends(OmnisharpCodeActionProvider, _super);
    function OmnisharpCodeActionProvider(server) {
        _super.call(this, server);
        this._commandId = 'omnisharp.runCodeAction';
        this._updateEnablement();
        var d1 = vscode_1.workspace.onDidChangeConfiguration(this._updateEnablement, this);
        var d2 = vscode_1.commands.registerCommand(this._commandId, this._runCodeAction, this);
        this._disposables.push(d1, d2);
    }
    OmnisharpCodeActionProvider.prototype._updateEnablement = function () {
        var value = vscode_1.workspace.getConfiguration().get('csharp.disableCodeActions', false);
        this._disabled = value;
    };
    OmnisharpCodeActionProvider.prototype.provideCodeActions = function (document, range, context, token) {
        var _this = this;
        if (this._disabled) {
            return;
        }
        var req = {
            Filename: document.fileName,
            Selection: OmnisharpCodeActionProvider._asRange(range)
        };
        return this._server.makeRequest(protocol_1.V2.GetCodeActions, req, token).then(function (response) {
            return response.CodeActions.map(function (ca) {
                return {
                    title: ca.Name,
                    command: _this._commandId,
                    arguments: [{
                            Filename: document.fileName,
                            Selection: OmnisharpCodeActionProvider._asRange(range),
                            Identifier: ca.Identifier,
                            WantsTextChanges: true
                        }]
                };
            });
        }, function (error) {
            return Promise.reject('Problem invoking \'GetCodeActions\' on OmniSharp server: ' + error);
        });
    };
    OmnisharpCodeActionProvider.prototype._runCodeAction = function (req) {
        return this._server.makeRequest(protocol_1.V2.RunCodeAction, req).then(function (response) {
            if (response && Array.isArray(response.Changes)) {
                var edit = new vscode_1.WorkspaceEdit();
                for (var _i = 0, _a = response.Changes; _i < _a.length; _i++) {
                    var change = _a[_i];
                    var uri = vscode_1.Uri.file(change.FileName);
                    var edits = [];
                    for (var _b = 0, _c = change.Changes; _b < _c.length; _b++) {
                        var textChange = _c[_b];
                        edits.push(vscode_1.TextEdit.replace(typeConvertion_1.toRange2(textChange), textChange.NewText));
                    }
                    edit.set(uri, edits);
                }
                return vscode_1.workspace.applyEdit(edit);
            }
        }, function (error) {
            return Promise.reject('Problem invoking \'RunCodeAction\' on OmniSharp server: ' + error);
        });
    };
    OmnisharpCodeActionProvider._asRange = function (range) {
        var start = range.start, end = range.end;
        return {
            Start: { Line: start.line + 1, Column: start.character + 1 },
            End: { Line: end.line + 1, Column: end.character + 1 }
        };
    };
    return OmnisharpCodeActionProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmnisharpCodeActionProvider;
//# sourceMappingURL=codeActionProvider.js.map