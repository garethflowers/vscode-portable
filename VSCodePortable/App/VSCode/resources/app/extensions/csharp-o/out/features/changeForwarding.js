/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var vscode_1 = require('vscode');
var proto = require('../protocol');
function forwardDocumentChanges(server) {
    return vscode_1.workspace.onDidChangeTextDocument(function (event) {
        var document = event.document;
        if (document.isUntitled || document.languageId !== 'csharp') {
            return;
        }
        if (!server.isRunning()) {
            return;
        }
        server.makeRequest(proto.UpdateBuffer, {
            Buffer: document.getText(),
            Filename: document.fileName
        }).catch(function (err) {
            console.error(err);
            return err;
        });
    });
}
function forwardFileChanges(server) {
    function onFileSystemEvent(uri) {
        if (!server.isRunning()) {
            return;
        }
        var req = { Filename: uri.fsPath };
        server.makeRequest(proto.FilesChanged, [req]).catch(function (err) {
            console.warn('[o] failed to forward file change event for ' + uri.fsPath, err);
            return err;
        });
    }
    var watcher = vscode_1.workspace.createFileSystemWatcher('**/*.*');
    var d1 = watcher.onDidCreate(onFileSystemEvent);
    var d2 = watcher.onDidChange(onFileSystemEvent);
    var d3 = watcher.onDidDelete(onFileSystemEvent);
    return vscode_1.Disposable.from(watcher, d1, d2, d3);
}
function forwardChanges(server) {
    // combine file watching and text document watching
    return vscode_1.Disposable.from(forwardDocumentChanges(server), forwardFileChanges(server));
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = forwardChanges;
//# sourceMappingURL=changeForwarding.js.map