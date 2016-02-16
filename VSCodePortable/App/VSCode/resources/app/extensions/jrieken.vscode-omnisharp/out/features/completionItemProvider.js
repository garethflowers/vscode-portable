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
var proto = require('../protocol');
var typeConvertion_1 = require('../typeConvertion');
var vscode_1 = require('vscode');
var OmniSharpCompletionItemProvider = (function (_super) {
    __extends(OmniSharpCompletionItemProvider, _super);
    function OmniSharpCompletionItemProvider() {
        _super.apply(this, arguments);
    }
    OmniSharpCompletionItemProvider.prototype.provideCompletionItems = function (document, position, token) {
        var wordToComplete = '';
        var range = document.getWordRangeAtPosition(position);
        if (range) {
            wordToComplete = document.getText(new vscode_1.Range(range.start, position));
        }
        var req = typeConvertion_1.createRequest(document, position);
        req.WordToComplete = wordToComplete;
        req.WantDocumentationForEveryCompletionResult = true;
        req.WantKind = true;
        return this._server.makeRequest(proto.AutoComplete, req).then(function (values) {
            if (!values) {
                return;
            }
            var result = [];
            var completions = Object.create(null);
            // transform AutoCompleteResponse to CompletionItem and
            // group by code snippet
            for (var _i = 0; _i < values.length; _i++) {
                var value = values[_i];
                var completion = new vscode_1.CompletionItem(value.CompletionText.replace(/\(|\)|<|>/g, ''));
                completion.detail = value.DisplayText;
                completion.documentation = documentation_1.plain(value.Description);
                completion.kind = _kinds[value.Kind] || vscode_1.CompletionItemKind.Property;
                var array = completions[completion.label];
                if (!array) {
                    completions[completion.label] = [completion];
                }
                else {
                    array.push(completion);
                }
            }
            // per suggestion group, select on and indicate overloads
            for (var key in completions) {
                var suggestion = completions[key][0], overloadCount = completions[key].length - 1;
                if (overloadCount === 0) {
                    // remove non overloaded items
                    delete completions[key];
                }
                else {
                    // indicate that there is more
                    suggestion.detail = suggestion.detail + " (+ " + overloadCount + " overload(s))";
                }
                result.push(suggestion);
            }
            return result;
        });
    };
    return OmniSharpCompletionItemProvider;
})(abstractProvider_1.default);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OmniSharpCompletionItemProvider;
var _kinds = Object.create(null);
_kinds['Variable'] = vscode_1.CompletionItemKind.Variable;
_kinds['Struct'] = vscode_1.CompletionItemKind.Interface;
_kinds['Interface'] = vscode_1.CompletionItemKind.Interface;
_kinds['Enum'] = vscode_1.CompletionItemKind.Enum;
_kinds['EnumMember'] = vscode_1.CompletionItemKind.Property;
_kinds['Property'] = vscode_1.CompletionItemKind.Property;
_kinds['Class'] = vscode_1.CompletionItemKind.Class;
_kinds['Field'] = vscode_1.CompletionItemKind.Field;
_kinds['EventField'] = vscode_1.CompletionItemKind.File;
_kinds['Method'] = vscode_1.CompletionItemKind.Method;
//# sourceMappingURL=completionItemProvider.js.map