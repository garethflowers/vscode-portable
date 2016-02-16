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
var Protocol = require('../protocol');
var typeConvertion_1 = require('../typeConvertion');
var vscode_1 = require('vscode');
var OmnisharpWorkspaceSymbolProvider = (function (_super) {
    __extends(OmnisharpWorkspaceSymbolProvider, _super);
    function OmnisharpWorkspaceSymbolProvider() {
        _super.apply(this, arguments);
    }
    OmnisharpWorkspaceSymbolProvider.prototype.provideWorkspaceSymbols = function (search, token) {
        return this._server.makeRequest(Protocol.FindSymbols, {
            Filter: search,
            Filename: ''
        }, token).then(function (res) {
            if (res && Array.isArray(res.QuickFixes)) {
                return res.QuickFixes.map(OmnisharpWorkspaceSymbolProvider._asSymbolInformation);
            }
        });
    };
    OmnisharpWorkspaceSymbolProvider._asSymbolInformation = function (symbolInfo) {
        return new vscode_1.SymbolInformation(symbolInfo.Text, OmnisharpWorkspaceSymbolProvider._toKind(symbolInfo), typeConvertion_1.toRange(symbolInfo), vscode_1.Uri.file(symbolInfo.FileName));
    };
    OmnisharpWorkspaceSymbolProvider._toKind = function (symbolInfo) {
        switch (symbolInfo.Kind) {
            case 'Method':
                return vscode_1.SymbolKind.Method;
            case 'Field':
            case 'Property':
                return vscode_1.SymbolKind.Field;
        }
        return vscode_1.SymbolKind.Class;
    };
    return OmnisharpWorkspaceSymbolProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmnisharpWorkspaceSymbolProvider;
//# sourceMappingURL=workspaceSymbolProvider.js.map