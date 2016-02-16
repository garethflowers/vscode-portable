/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
define(["require", "exports", './features/completionItemProvider', './features/hoverProvider', './features/signatureHelpProvider', './features/validationProvider', 'vscode'], function (require, exports, completionItemProvider_1, hoverProvider_1, signatureHelpProvider_1, validationProvider_1, vscode_1) {
    function activate(context) {
        // add providers
        context.subscriptions.push(vscode_1.languages.registerCompletionItemProvider('php', new completionItemProvider_1.default(), '.', ':', '$'));
        context.subscriptions.push(vscode_1.languages.registerHoverProvider('php', new hoverProvider_1.default()));
        context.subscriptions.push(vscode_1.languages.registerSignatureHelpProvider('php', new signatureHelpProvider_1.default(), '(', ','));
        var validator = new validationProvider_1.default();
        validator.activate(context.subscriptions);
        // need to set in the plugin host as well as the completion provider uses it.
        vscode_1.languages.setLanguageConfiguration('php', {
            wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
        });
    }
    exports.activate = activate;
});
//# sourceMappingURL=phpMain.js.map