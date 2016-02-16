/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var definitionProvider_1 = require('./features/definitionProvider');
var codeLensProvider_1 = require('./features/codeLensProvider');
var documentHighlightProvider_1 = require('./features/documentHighlightProvider');
var documentSymbolProvider_1 = require('./features/documentSymbolProvider');
var codeActionProvider_1 = require('./features/codeActionProvider');
var referenceProvider_1 = require('./features/referenceProvider');
var hoverProvider_1 = require('./features/hoverProvider');
var renameProvider_1 = require('./features/renameProvider');
var formattingEditProvider_1 = require('./features/formattingEditProvider');
var completionItemProvider_1 = require('./features/completionItemProvider');
var workspaceSymbolProvider_1 = require('./features/workspaceSymbolProvider');
var diagnosticsProvider_1 = require('./features/diagnosticsProvider');
var signatureHelpProvider_1 = require('./features/signatureHelpProvider');
var commands_1 = require('./features/commands');
var omnisharpServer_1 = require('./omnisharpServer');
var changeForwarding_1 = require('./features/changeForwarding');
var omnisharpStatus_1 = require('./features/omnisharpStatus');
var vscode_1 = require('vscode');
function activate(context) {
    var _selector = {
        language: 'csharp',
        scheme: 'file' // only files from disk
    };
    var server = new omnisharpServer_1.StdioOmnisharpServer();
    var advisor = new diagnosticsProvider_1.Advisor(server); // create before server is started
    var disposables = [];
    var localDisposables = [];
    disposables.push(server.onServerStart(function () {
        // register language feature provider on start
        localDisposables.push(vscode_1.languages.registerDefinitionProvider(_selector, new definitionProvider_1.default(server)));
        localDisposables.push(vscode_1.languages.registerCodeLensProvider(_selector, new codeLensProvider_1.default(server)));
        localDisposables.push(vscode_1.languages.registerDocumentHighlightProvider(_selector, new documentHighlightProvider_1.default(server)));
        localDisposables.push(vscode_1.languages.registerDocumentSymbolProvider(_selector, new documentSymbolProvider_1.default(server)));
        localDisposables.push(vscode_1.languages.registerReferenceProvider(_selector, new referenceProvider_1.default(server)));
        localDisposables.push(vscode_1.languages.registerHoverProvider(_selector, new hoverProvider_1.default(server)));
        localDisposables.push(vscode_1.languages.registerRenameProvider(_selector, new renameProvider_1.default(server)));
        localDisposables.push(vscode_1.languages.registerDocumentRangeFormattingEditProvider(_selector, new formattingEditProvider_1.default(server)));
        localDisposables.push(vscode_1.languages.registerOnTypeFormattingEditProvider(_selector, new formattingEditProvider_1.default(server), '}', ';'));
        localDisposables.push(vscode_1.languages.registerCompletionItemProvider(_selector, new completionItemProvider_1.default(server), '.', '<'));
        localDisposables.push(vscode_1.languages.registerWorkspaceSymbolProvider(new workspaceSymbolProvider_1.default(server)));
        localDisposables.push(vscode_1.languages.registerSignatureHelpProvider(_selector, new signatureHelpProvider_1.default(server), '(', ','));
        var codeActionProvider = new codeActionProvider_1.default(server);
        localDisposables.push(codeActionProvider);
        localDisposables.push(vscode_1.languages.registerCodeActionsProvider(_selector, codeActionProvider));
        localDisposables.push(diagnosticsProvider_1.default(server, advisor));
        localDisposables.push(changeForwarding_1.default(server));
    }));
    disposables.push(server.onServerStop(function () {
        // remove language feature providers on stop
        vscode_1.Disposable.from.apply(vscode_1.Disposable, localDisposables).dispose();
    }));
    disposables.push(commands_1.default(server));
    disposables.push(omnisharpStatus_1.default(server));
    // read and store last solution or folder path
    disposables.push(server.onBeforeServerStart(function (path) { return context.workspaceState.update('lastSolutionPathOrFolder', path); }));
    server.autoStart(context.workspaceState.get('lastSolutionPathOrFolder'));
    // stop server on deactivate
    disposables.push(new vscode_1.Disposable(function () {
        advisor.dispose();
        server.stop();
    }));
    (_a = context.subscriptions).push.apply(_a, disposables);
    var _a;
}
exports.activate = activate;
//# sourceMappingURL=omnisharpMain.js.map