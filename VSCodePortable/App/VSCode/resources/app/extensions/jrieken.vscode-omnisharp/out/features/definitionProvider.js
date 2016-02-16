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
var CSharpDefinitionProvider = (function (_super) {
    __extends(CSharpDefinitionProvider, _super);
    function CSharpDefinitionProvider() {
        _super.apply(this, arguments);
    }
    CSharpDefinitionProvider.prototype.provideDefinition = function (document, position, token) {
        var req = typeConvertion_1.createRequest(document, position);
        return this._server.makeRequest(Protocol.GoToDefinition, req, token).then(function (value) {
            if (value && value.FileName) {
                return typeConvertion_1.toLocation(value);
            }
        });
    };
    return CSharpDefinitionProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CSharpDefinitionProvider;
//# sourceMappingURL=definitionProvider.js.map