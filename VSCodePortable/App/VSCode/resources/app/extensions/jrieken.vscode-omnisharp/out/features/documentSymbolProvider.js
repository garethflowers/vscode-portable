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
var OmnisharpDocumentSymbolProvider = (function (_super) {
    __extends(OmnisharpDocumentSymbolProvider, _super);
    function OmnisharpDocumentSymbolProvider() {
        _super.apply(this, arguments);
    }
    OmnisharpDocumentSymbolProvider.prototype.provideDocumentSymbols = function (document, token) {
        return this._server.makeRequest(Protocol.CurrentFileMembersAsTree, { Filename: document.fileName }, token).then(function (tree) {
            var ret = [];
            for (var _i = 0, _a = tree.TopLevelTypeDefinitions; _i < _a.length; _i++) {
                var node = _a[_i];
                typeConvertion_1.toDocumentSymbol(ret, node);
            }
            return ret;
        });
    };
    return OmnisharpDocumentSymbolProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmnisharpDocumentSymbolProvider;
//# sourceMappingURL=documentSymbolProvider.js.map