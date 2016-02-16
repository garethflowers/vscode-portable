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
var OmniSharpSignatureHelpProvider = (function (_super) {
    __extends(OmniSharpSignatureHelpProvider, _super);
    function OmniSharpSignatureHelpProvider() {
        _super.apply(this, arguments);
    }
    OmniSharpSignatureHelpProvider.prototype.provideSignatureHelp = function (document, position, token) {
        var req = typeConvertion_1.createRequest(document, position);
        return this._server.makeRequest(Protocol.SignatureHelp, req, token).then(function (res) {
            var ret = new vscode_1.SignatureHelp();
            ret.activeSignature = res.ActiveSignature;
            ret.activeParameter = res.ActiveParameter;
            for (var _i = 0, _a = res.Signatures; _i < _a.length; _i++) {
                var signature = _a[_i];
                var signatureInfo = new vscode_1.SignatureInformation(signature.Label, signature.Documentation);
                ret.signatures.push(signatureInfo);
                for (var _b = 0, _c = signature.Parameters; _b < _c.length; _b++) {
                    var parameter = _c[_b];
                    var parameterInfo = new vscode_1.ParameterInformation(parameter.Label, parameter.Documentation);
                    signatureInfo.parameters.push(parameterInfo);
                }
            }
            return ret;
        });
    };
    return OmniSharpSignatureHelpProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmniSharpSignatureHelpProvider;
//# sourceMappingURL=signatureHelpProvider.js.map