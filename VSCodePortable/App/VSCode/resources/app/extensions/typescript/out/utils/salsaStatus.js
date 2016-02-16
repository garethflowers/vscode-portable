/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
var statusBarEntry;
function showHideStatus() {
    if (!statusBarEntry) {
        return;
    }
    if (!vscode.window.activeTextEditor) {
        statusBarEntry.hide();
        return;
    }
    var doc = vscode.window.activeTextEditor.document;
    if (vscode.languages.match('javascript', doc) || vscode.languages.match('javascriptreact', doc)) {
        statusBarEntry.show();
        return;
    }
    statusBarEntry.hide();
}
exports.showHideStatus = showHideStatus;
function disposeStatus() {
    if (statusBarEntry) {
        statusBarEntry.dispose();
    }
}
exports.disposeStatus = disposeStatus;
function show(message, tooltip, error) {
    statusBarEntry = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
    statusBarEntry.text = message;
    statusBarEntry.tooltip = tooltip;
    var color = 'white';
    if (error) {
        color = 'orange';
    }
    statusBarEntry.color = color;
    statusBarEntry.show();
}
exports.show = show;
