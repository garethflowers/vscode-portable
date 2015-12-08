/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var assert = require('assert');
var vscode_1 = require('vscode');
var path_1 = require('path');
suite('workspace-namespace', function () {
    test('textDocuments', function () {
        assert.ok(Array.isArray(vscode_1.workspace.textDocuments));
        assert.throws(function () { return vscode_1.workspace.textDocuments = null; });
    });
    test('rootPath', function () {
        assert.equal(vscode_1.workspace.rootPath, path_1.join(__dirname, '../testWorkspace'));
        assert.throws(function () { return vscode_1.workspace.rootPath = 'farboo'; });
    });
    test('openTextDocument', function (done) {
        vscode_1.workspace.openTextDocument(path_1.join(vscode_1.workspace.rootPath, './far.js')).then(function (doc) {
            assert.ok(doc);
            done();
        }, function (err) {
            done(err);
        });
    });
    test('openTextDocument, illegal path', function (done) {
        vscode_1.workspace.openTextDocument('funkydonky.txt').then(function (doc) {
            done(new Error('missing error'));
        }, function (err) {
            done();
        });
    });
    // test('createTextDocument', done => {
    // 	let text = 'Das Pferd isst keinen Reis.'
    // 	workspace.createTextDocument(text).then(doc => {
    // 		assert.equal(doc.getText(), text);
    // 		assert.equal(doc.uri.scheme, 'untitled');
    // 		assert.equal(doc.languageId, 'plaintext');
    // 		done();
    // 	}, err => {
    // 		done(err);
    // 	});
    // });
});
//# sourceMappingURL=workspace.test.js.map