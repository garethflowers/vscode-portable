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
var vscode_1 = require('vscode');
var FormattingSupport = (function (_super) {
    __extends(FormattingSupport, _super);
    function FormattingSupport() {
        _super.apply(this, arguments);
    }
    FormattingSupport.prototype.provideDocumentRangeFormattingEdits = function (document, range, options, token) {
        var request = {
            Filename: document.fileName,
            Line: range.start.line + 1,
            Column: range.start.character + 1,
            EndLine: range.end.line + 1,
            EndColumn: range.end.character + 1
        };
        return this._server.makeRequest(proto.FormatRange, request, token).then(function (res) {
            if (res && Array.isArray(res.Changes)) {
                return res.Changes.map(FormattingSupport._asEditOptionation);
            }
        });
    };
    FormattingSupport.prototype.provideOnTypeFormattingEdits = function (document, position, ch, options, token) {
        var request = {
            Filename: document.fileName,
            Line: position.line + 1,
            Column: position.character + 1,
            Character: ch
        };
        return this._server.makeRequest(proto.FormatAfterKeystroke, request, token).then(function (res) {
            if (res && Array.isArray(res.Changes)) {
                return res.Changes.map(FormattingSupport._asEditOptionation);
            }
        });
    };
    FormattingSupport._asEditOptionation = function (change) {
        return new vscode_1.TextEdit(new vscode_1.Range(change.StartLine - 1, change.StartColumn - 1, change.EndLine - 1, change.EndColumn - 1), change.NewText);
    };
    return FormattingSupport;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FormattingSupport;
//# sourceMappingURL=formattingEditProvider.js.map