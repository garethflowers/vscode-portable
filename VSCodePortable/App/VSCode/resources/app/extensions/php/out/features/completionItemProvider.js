/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
define(["require", "exports", 'vscode', './phpGlobals'], function (require, exports, vscode_1, phpGlobals) {
    var PHPCompletionItemProvider = (function () {
        function PHPCompletionItemProvider() {
            this.triggerCharacters = ['.', ':', '$'];
        }
        PHPCompletionItemProvider.prototype.provideCompletionItems = function (document, position, token) {
            var result = [];
            var added = {};
            var createNewProposal = function (kind, name, entry) {
                var proposal = new vscode_1.CompletionItem(name);
                proposal.kind = kind;
                if (entry) {
                    if (entry.description) {
                        proposal.documentation = entry.description;
                    }
                    if (entry.signature) {
                        proposal.detail = entry.signature;
                    }
                }
                return proposal;
            };
            for (var name in phpGlobals.globalvariables) {
                if (phpGlobals.globalvariables.hasOwnProperty(name)) {
                    added[name] = true;
                    result.push(createNewProposal(vscode_1.CompletionItemKind.Variable, name, phpGlobals.globalvariables[name]));
                }
            }
            for (var name in phpGlobals.globalfunctions) {
                if (phpGlobals.globalfunctions.hasOwnProperty(name)) {
                    added[name] = true;
                    result.push(createNewProposal(vscode_1.CompletionItemKind.Function, name, phpGlobals.globalfunctions[name]));
                }
            }
            for (var name in phpGlobals.compiletimeconstants) {
                if (phpGlobals.compiletimeconstants.hasOwnProperty(name)) {
                    added[name] = true;
                    result.push(createNewProposal(vscode_1.CompletionItemKind.Field, name, phpGlobals.compiletimeconstants[name]));
                }
            }
            for (var name in phpGlobals.keywords) {
                if (phpGlobals.keywords.hasOwnProperty(name)) {
                    added[name] = true;
                    result.push(createNewProposal(vscode_1.CompletionItemKind.Keyword, name, phpGlobals.keywords[name]));
                }
            }
            var text = document.getText();
            var variableMatch = /\$([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)/g;
            var match = null;
            while (match = variableMatch.exec(text)) {
                var word = match[0];
                if (!added[word]) {
                    result.push(createNewProposal(vscode_1.CompletionItemKind.Variable, name, null));
                }
            }
            return Promise.resolve(result);
        };
        return PHPCompletionItemProvider;
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = PHPCompletionItemProvider;
});
//# sourceMappingURL=completionItemProvider.js.map