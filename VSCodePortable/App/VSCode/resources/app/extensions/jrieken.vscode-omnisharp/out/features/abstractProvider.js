/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var AbstractProvider = (function () {
    function AbstractProvider(server) {
        this._server = server;
        this._disposables = [];
    }
    AbstractProvider.prototype.dispose = function () {
        while (this._disposables.length) {
            this._disposables.pop().dispose();
        }
    };
    return AbstractProvider;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AbstractProvider;
//# sourceMappingURL=abstractProvider.js.map