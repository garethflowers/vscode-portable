/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var vscode_languageserver_1 = require('vscode-languageserver');
var Strings = require('../utils/strings');
var nls = require('../utils/nls');
var globProperties = [
    { kind: vscode_languageserver_1.CompletionItemKind.Value, label: nls.localize('fileLabel', "Files by Extension"), insertText: '"**/*.{{extension}}": true', documentation: nls.localize('fileDescription', "Match all files of a specific file extension.") },
    { kind: vscode_languageserver_1.CompletionItemKind.Value, label: nls.localize('filesLabel', "Files with Multiple Extensions"), insertText: '"**/*.{ext1,ext2,ext3}": true', documentation: nls.localize('filesDescription', "Match all files with any of the file extensions.") },
    { kind: vscode_languageserver_1.CompletionItemKind.Value, label: nls.localize('derivedLabel', "Files with Siblings by Name"), insertText: '"**/*.{{source-extension}}": { "when": "$(basename).{{target-extension}}" }', documentation: nls.localize('derivedDescription', "Match files that have siblings with the same name but a different extension.") },
    { kind: vscode_languageserver_1.CompletionItemKind.Value, label: nls.localize('topFolderLabel', "Folder by Name (Top Level)"), insertText: '"{{name}}": true', documentation: nls.localize('topFolderDescription', "Match a top level folder with a specific name.") },
    { kind: vscode_languageserver_1.CompletionItemKind.Value, label: nls.localize('topFoldersLabel', "Folders with Multiple Names (Top Level)"), insertText: '"{folder1,folder2,folder3}": true', documentation: nls.localize('topFoldersDescription', "Match multiple top level folders.") },
    { kind: vscode_languageserver_1.CompletionItemKind.Value, label: nls.localize('folderLabel', "Folder by Name (Any Location)"), insertText: '"**/{{name}}": true', documentation: nls.localize('folderDescription', "Match a folder with a specific name in any location.") },
];
var globValues = [
    { kind: vscode_languageserver_1.CompletionItemKind.Value, label: nls.localize('trueLabel', "True"), insertText: 'true', documentation: nls.localize('trueDescription', "Enable the pattern.") },
    { kind: vscode_languageserver_1.CompletionItemKind.Value, label: nls.localize('falseLabel', "False"), insertText: 'false', documentation: nls.localize('falseDescription', "Disable the pattern.") },
    { kind: vscode_languageserver_1.CompletionItemKind.Value, label: nls.localize('derivedLabel', "Files with Siblings by Name"), insertText: '{ "when": "$(basename).{{extension}}" }', documentation: nls.localize('siblingsDescription', "Match files that have siblings with the same name but a different extension.") }
];
var GlobPatternContribution = (function () {
    function GlobPatternContribution() {
    }
    GlobPatternContribution.prototype.isSettingsFile = function (resource) {
        return Strings.endsWith(resource, '/settings.json');
    };
    GlobPatternContribution.prototype.collectDefaultSuggestions = function (resource, result) {
        return null;
    };
    GlobPatternContribution.prototype.collectPropertySuggestions = function (resource, location, currentWord, addValue, isLast, result) {
        if (this.isSettingsFile(resource) && (location.matches(['files.exclude']) || location.matches(['search.exclude']))) {
            globProperties.forEach(function (e) { return result.add(e); });
        }
        return null;
    };
    GlobPatternContribution.prototype.collectValueSuggestions = function (resource, location, currentKey, result) {
        if (this.isSettingsFile(resource) && (location.matches(['files.exclude']) || location.matches(['search.exclude']))) {
            globValues.forEach(function (e) { return result.add(e); });
        }
        return null;
    };
    GlobPatternContribution.prototype.getInfoContribution = function (resource, location) {
        return null;
    };
    return GlobPatternContribution;
}());
exports.GlobPatternContribution = GlobPatternContribution;
//# sourceMappingURL=globPatternContribution.js.map