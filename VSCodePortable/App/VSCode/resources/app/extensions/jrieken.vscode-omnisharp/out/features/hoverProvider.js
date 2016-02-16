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
var documentation_1 = require('./documentation');
var abstractProvider_1 = require('./abstractProvider');
var Protocol = require('../protocol');
var typeConvertion_1 = require('../typeConvertion');
var vscode_1 = require('vscode');
var OmniSharpHoverProvider = (function (_super) {
    __extends(OmniSharpHoverProvider, _super);
    function OmniSharpHoverProvider() {
        _super.apply(this, arguments);
    }
    OmniSharpHoverProvider.prototype.provideHover = function (document, position, token) {
        var req = typeConvertion_1.createRequest(document, position);
        req.IncludeDocumentation = true;
        return this._server.makeRequest(Protocol.TypeLookup, req, token).then(function (value) {
            if (value && value.Type) {
                var contents = [documentation_1.plain(value.Documentation), { language: 'csharp', value: value.Type }];
                return new vscode_1.Hover(contents);
            }
        });
    };
    return OmniSharpHoverProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmniSharpHoverProvider;
//# sourceMappingURL=hoverProvider.js.map