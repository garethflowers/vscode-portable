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
var OmnisharpRenameProvider = (function (_super) {
    __extends(OmnisharpRenameProvider, _super);
    function OmnisharpRenameProvider() {
        _super.apply(this, arguments);
    }
    OmnisharpRenameProvider.prototype.provideRenameEdits = function (document, position, newName, token) {
        var request = typeConvertion_1.createRequest(document, position);
        request.WantsTextChanges = true,
            request.RenameTo = newName;
        return this._server.makeRequest(proto.Rename, request, token).then(function (response) {
            if (!response) {
                return;
            }
            var edit = new vscode_1.WorkspaceEdit();
            response.Changes.forEach(function (change) {
                var uri = vscode_1.Uri.file(change.FileName);
                change.Changes.forEach(function (change) {
                    edit.replace(uri, new vscode_1.Range(change.StartLine - 1, change.StartColumn - 1, change.EndLine - 1, change.EndColumn - 1), change.NewText);
                });
            });
            return edit;
        });
    };
    return OmnisharpRenameProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmnisharpRenameProvider;
//# sourceMappingURL=renameProvider.js.map