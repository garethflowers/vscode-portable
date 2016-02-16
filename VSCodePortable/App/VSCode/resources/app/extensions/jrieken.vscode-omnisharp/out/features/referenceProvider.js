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
var OmnisharpReferenceProvider = (function (_super) {
    __extends(OmnisharpReferenceProvider, _super);
    function OmnisharpReferenceProvider() {
        _super.apply(this, arguments);
    }
    OmnisharpReferenceProvider.prototype.provideReferences = function (document, position, options, token) {
        var req = typeConvertion_1.createRequest(document, position);
        req.OnlyThisFile = false;
        req.ExcludeDefinition = false;
        return this._server.makeRequest(Protocol.FindUsages, req, token).then(function (res) {
            if (res && Array.isArray(res.QuickFixes)) {
                return res.QuickFixes.map(typeConvertion_1.toLocation);
            }
        });
    };
    return OmnisharpReferenceProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmnisharpReferenceProvider;
//# sourceMappingURL=referenceProvider.js.map