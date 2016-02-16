/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* --------------------------------------------------------------------------------------------
 * Includes code from typescript-sublime-plugin project, obtained from
 * https://github.com/Microsoft/TypeScript-Sublime-Plugin/blob/master/TypeScript%20Indent.tmPreferences
 * ------------------------------------------------------------------------------------------ */
'use strict';
var vscode_1 = require('vscode');
var typescriptServiceClient_1 = require('./typescriptServiceClient');
var Configuration = require('./features/configuration');
var hoverProvider_1 = require('./features/hoverProvider');
var definitionProvider_1 = require('./features/definitionProvider');
var documentHighlightProvider_1 = require('./features/documentHighlightProvider');
var referenceProvider_1 = require('./features/referenceProvider');
var documentSymbolProvider_1 = require('./features/documentSymbolProvider');
var signatureHelpProvider_1 = require('./features/signatureHelpProvider');
var renameProvider_1 = require('./features/renameProvider');
var formattingProvider_1 = require('./features/formattingProvider');
var bufferSyncSupport_1 = require('./features/bufferSyncSupport');
var completionItemProvider_1 = require('./features/completionItemProvider');
var workspaceSymbolProvider_1 = require('./features/workspaceSymbolProvider');
var SalsaStatus = require('./utils/salsaStatus');
function activate(context) {
    var MODE_ID_TS = 'typescript';
    var MODE_ID_TSX = 'typescriptreact';
    var MODE_ID_JS = 'javascript';
    var MODE_ID_JSX = 'javascriptreact';
    var clientHost = new TypeScriptServiceClientHost();
    var client = clientHost.serviceClient;
    context.subscriptions.push(vscode_1.commands.registerCommand('typescript.reloadProjects', function () {
        clientHost.reloadProjects();
    }));
    vscode_1.window.onDidChangeActiveTextEditor(SalsaStatus.showHideStatus, null, context.subscriptions);
    // Register the supports for both TS and TSX so that we can have separate grammars but share the mode
    client.onReady().then(function () {
        registerSupports(MODE_ID_TS, clientHost, client);
        registerSupports(MODE_ID_TSX, clientHost, client);
        var useSalsa = !!process.env['CODE_TSJS'] || !!process.env['VSCODE_TSJS'];
        if (useSalsa) {
            registerSupports(MODE_ID_JS, clientHost, client);
            registerSupports(MODE_ID_JSX, clientHost, client);
        }
    }, function () {
        // Nothing to do here. The client did show a message;
    });
}
exports.activate = activate;
function registerSupports(modeID, host, client) {
    vscode_1.languages.registerHoverProvider(modeID, new hoverProvider_1.default(client));
    vscode_1.languages.registerDefinitionProvider(modeID, new definitionProvider_1.default(client));
    vscode_1.languages.registerDocumentHighlightProvider(modeID, new documentHighlightProvider_1.default(client));
    vscode_1.languages.registerReferenceProvider(modeID, new referenceProvider_1.default(client));
    vscode_1.languages.registerDocumentSymbolProvider(modeID, new documentSymbolProvider_1.default(client));
    vscode_1.languages.registerSignatureHelpProvider(modeID, new signatureHelpProvider_1.default(client), '(', ',');
    vscode_1.languages.registerRenameProvider(modeID, new renameProvider_1.default(client));
    vscode_1.languages.registerDocumentRangeFormattingEditProvider(modeID, new formattingProvider_1.default(client));
    vscode_1.languages.registerOnTypeFormattingEditProvider(modeID, new formattingProvider_1.default(client), ';', '}', '\n');
    vscode_1.languages.registerWorkspaceSymbolProvider(new workspaceSymbolProvider_1.default(client, modeID));
    vscode_1.languages.setLanguageConfiguration(modeID, {
        indentationRules: {
            // ^(.*\*/)?\s*\}.*$
            decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/,
            // ^.*\{[^}"']*$
            increaseIndentPattern: /^.*\{[^}"']*$/
        },
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        comments: {
            lineComment: '//',
            blockComment: ['/*', '*/']
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
        ],
        onEnterRules: [
            {
                // e.g. /** | */
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                afterText: /^\s*\*\/$/,
                action: { indentAction: vscode_1.IndentAction.IndentOutdent, appendText: ' * ' }
            },
            {
                // e.g. /** ...|
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                action: { indentAction: vscode_1.IndentAction.None, appendText: ' * ' }
            },
            {
                // e.g.  * ...|
                beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
                action: { indentAction: vscode_1.IndentAction.None, appendText: '* ' }
            },
            {
                // e.g.  */|
                beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
                action: { indentAction: vscode_1.IndentAction.None, removeText: 1 }
            }
        ],
        __electricCharacterSupport: {
            brackets: [
                { tokenType: 'delimiter.curly.' + modeID, open: '{', close: '}', isElectric: true },
                { tokenType: 'delimiter.square.' + modeID, open: '[', close: ']', isElectric: true },
                { tokenType: 'delimiter.paren.' + modeID, open: '(', close: ')', isElectric: true }
            ],
            docComment: { scope: 'comment.documentation', open: '/**', lineStart: ' * ', close: ' */' }
        },
        __characterPairSupport: {
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"', notIn: ['string'] },
                { open: '\'', close: '\'', notIn: ['string', 'comment'] },
                { open: '`', close: '`', notIn: ['string', 'comment'] }
            ]
        }
    });
    host.addBufferSyncSupport(new bufferSyncSupport_1.default(client, modeID));
    // Register suggest support as soon as possible and load configuration lazily
    var completionItemProvider = new completionItemProvider_1.default(client);
    vscode_1.languages.registerCompletionItemProvider(modeID, completionItemProvider, '.');
    var reloadConfig = function () {
        completionItemProvider.setConfiguration(Configuration.load(modeID));
    };
    vscode_1.workspace.onDidChangeConfiguration(function () {
        reloadConfig();
    });
    reloadConfig();
}
var TypeScriptServiceClientHost = (function () {
    function TypeScriptServiceClientHost() {
        var _this = this;
        this.bufferSyncSupports = [];
        this.currentDiagnostics = vscode_1.languages.createDiagnosticCollection('typescript');
        var handleProjectCreateOrDelete = function () {
            _this.client.execute('reloadProjects', null, false);
            _this.triggerAllDiagnostics();
        };
        var handleProjectChange = function () {
            setTimeout(function () {
                _this.triggerAllDiagnostics();
            }, 1500);
        };
        var watcher = vscode_1.workspace.createFileSystemWatcher('**/tsconfig.json');
        watcher.onDidCreate(handleProjectCreateOrDelete);
        watcher.onDidDelete(handleProjectCreateOrDelete);
        watcher.onDidChange(handleProjectChange);
        this.client = new typescriptServiceClient_1.default(this);
        this.syntaxDiagnostics = Object.create(null);
    }
    Object.defineProperty(TypeScriptServiceClientHost.prototype, "serviceClient", {
        get: function () {
            return this.client;
        },
        enumerable: true,
        configurable: true
    });
    TypeScriptServiceClientHost.prototype.reloadProjects = function () {
        this.client.execute('reloadProjects', null, false);
        this.triggerAllDiagnostics();
    };
    TypeScriptServiceClientHost.prototype.addBufferSyncSupport = function (support) {
        this.bufferSyncSupports.push(support);
    };
    TypeScriptServiceClientHost.prototype.triggerAllDiagnostics = function () {
        this.bufferSyncSupports.forEach(function (support) { return support.requestAllDiagnostics(); });
    };
    /* internal */ TypeScriptServiceClientHost.prototype.populateService = function () {
        var _this = this;
        this.currentDiagnostics.clear();
        this.syntaxDiagnostics = Object.create(null);
        // See https://github.com/Microsoft/TypeScript/issues/5530
        vscode_1.workspace.saveAll(false).then(function (value) {
            _this.bufferSyncSupports.forEach(function (support) {
                support.reOpenDocuments();
                support.requestAllDiagnostics();
            });
        });
    };
    /* internal */ TypeScriptServiceClientHost.prototype.syntaxDiagnosticsReceived = function (event) {
        var body = event.body;
        if (body.diagnostics) {
            var markers = this.createMarkerDatas(body.diagnostics);
            this.syntaxDiagnostics[body.file] = markers;
        }
    };
    /* internal */ TypeScriptServiceClientHost.prototype.semanticDiagnosticsReceived = function (event) {
        var body = event.body;
        if (body.diagnostics) {
            var diagnostics = this.createMarkerDatas(body.diagnostics);
            var syntaxMarkers = this.syntaxDiagnostics[body.file];
            if (syntaxMarkers) {
                delete this.syntaxDiagnostics[body.file];
                diagnostics = syntaxMarkers.concat(diagnostics);
            }
            this.currentDiagnostics.set(vscode_1.Uri.file(body.file), diagnostics);
        }
    };
    TypeScriptServiceClientHost.prototype.createMarkerDatas = function (diagnostics) {
        var result = [];
        for (var _i = 0; _i < diagnostics.length; _i++) {
            var diagnostic = diagnostics[_i];
            var start = diagnostic.start, end = diagnostic.end, text = diagnostic.text;
            var range = new vscode_1.Range(start.line - 1, start.offset - 1, end.line - 1, end.offset - 1);
            result.push(new vscode_1.Diagnostic(range, text));
        }
        return result;
    };
    return TypeScriptServiceClientHost;
})();
