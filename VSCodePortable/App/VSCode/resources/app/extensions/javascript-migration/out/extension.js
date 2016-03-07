/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var cp = require('child_process');
function activate(context) {
    var releaseNotesShown = 'javascript.releasenotesshown';
    if (!context.globalState.get(releaseNotesShown)) {
        // cheating with nls, this is a temporary extenion only, that doesn't need be localized
        vscode.window.showInformationMessage('Our JavaScript support has been enhanced, would you like to view the Release Notes?', 'No', 'Yes').then(function (selection) {
            switch (selection) {
                case 'Yes':
                    open('http://go.microsoft.com/fwlink/?LinkId=733559');
                case 'No':
                    context.globalState.update(releaseNotesShown, true);
                    break;
            }
        });
    }
}
exports.activate = activate;
function open(url) {
    var cmd;
    switch (process.platform) {
        case 'darwin':
            cmd = 'open';
            break;
        case 'win32':
            cmd = 'start';
            break;
        default:
            cmd = 'xdg-open';
    }
    return cp.exec(cmd + ' ' + url);
}
function deactivate() {
}
exports.deactivate = deactivate;
