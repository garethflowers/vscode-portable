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
var OmnisharpDocumentHighlightProvider = (function (_super) {
    __extends(OmnisharpDocumentHighlightProvider, _super);
    function OmnisharpDocumentHighlightProvider() {
        _super.apply(this, arguments);
    }
    OmnisharpDocumentHighlightProvider.prototype.provideDocumentHighlights = function (resource, position, token) {
        var req = typeConvertion_1.createRequest(resource, position);
        req.OnlyThisFile = true;
        req.ExcludeDefinition = false;
        return this._server.makeRequest(proto.FindUsages, req, token).then(function (res) {
            if (res && Array.isArray(res.QuickFixes)) {
                return res.QuickFixes.map(OmnisharpDocumentHighlightProvider._asDocumentHighlight);
            }
        });
    };
    OmnisharpDocumentHighlightProvider._asDocumentHighlight = function (quickFix) {
        return new vscode_1.DocumentHighlight(typeConvertion_1.toRange(quickFix), vscode_1.DocumentHighlightKind.Read);
    };
    return OmnisharpDocumentHighlightProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmnisharpDocumentHighlightProvider;
//# sourceMappingURL=documentHighlightProvider.js.map