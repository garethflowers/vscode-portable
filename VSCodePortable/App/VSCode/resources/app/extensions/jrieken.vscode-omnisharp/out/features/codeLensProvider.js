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
var typeConvertion_1 = require('../typeConvertion');
var abstractProvider_1 = require('./abstractProvider');
var proto = require('../protocol');
var OmniSharpCodeLens = (function (_super) {
    __extends(OmniSharpCodeLens, _super);
    function OmniSharpCodeLens(fileName, range) {
        _super.call(this, range);
        this.fileName = fileName;
    }
    return OmniSharpCodeLens;
})(vscode_1.CodeLens);
var OmniSharpCodeLensProvider = (function (_super) {
    __extends(OmniSharpCodeLensProvider, _super);
    function OmniSharpCodeLensProvider() {
        _super.apply(this, arguments);
    }
    OmniSharpCodeLensProvider.prototype.provideCodeLenses = function (document, token) {
        return this._server.makeRequest(proto.CurrentFileMembersAsTree, {
            Filename: document.fileName
        }, token).then(function (tree) {
            var ret = [];
            tree.TopLevelTypeDefinitions.forEach(function (node) { return OmniSharpCodeLensProvider._convertQuickFix(ret, document.fileName, node); });
            return ret;
        });
    };
    OmniSharpCodeLensProvider._convertQuickFix = function (bucket, fileName, node) {
        if (node.Kind === 'MethodDeclaration' && OmniSharpCodeLensProvider.filteredSymbolNames[node.Location.Text]) {
            return;
        }
        var lens = new OmniSharpCodeLens(fileName, typeConvertion_1.toRange(node.Location));
        bucket.push(lens);
        for (var _i = 0, _a = node.ChildNodes; _i < _a.length; _i++) {
            var child = _a[_i];
            OmniSharpCodeLensProvider._convertQuickFix(bucket, fileName, child);
        }
    };
    OmniSharpCodeLensProvider.prototype.resolveCodeLens = function (codeLens, token) {
        if (codeLens instanceof OmniSharpCodeLens) {
            var req = {
                Filename: codeLens.fileName,
                Line: codeLens.range.start.line + 1,
                Column: codeLens.range.start.character + 1,
                OnlyThisFile: false,
                ExcludeDefinition: true
            };
            return this._server.makeRequest(proto.FindUsages, req, token).then(function (res) {
                if (!res || !Array.isArray(res.QuickFixes)) {
                    return;
                }
                var len = res.QuickFixes.length;
                codeLens.command = {
                    title: len === 1 ? '1 reference' : len + " references",
                    command: 'editor.action.showReferences',
                    arguments: [vscode_1.Uri.file(req.Filename), codeLens.range.start, res.QuickFixes.map(typeConvertion_1.toLocation)]
                };
                return codeLens;
            });
        }
    };
    OmniSharpCodeLensProvider.filteredSymbolNames = {
        'Equals': true,
        'Finalize': true,
        'GetHashCode': true,
        'ToString': true
    };
    return OmniSharpCodeLensProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmniSharpCodeLensProvider;
//# sourceMappingURL=codeLensProvider.js.map