/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var vscode = require('vscode');
function toLocation(location) {
    var FileName = location.FileName, Line = location.Line, Column = location.Column;
    return new vscode.Location(vscode.Uri.file(FileName), new vscode.Position(Line - 1, Column - 1));
}
exports.toLocation = toLocation;
function toRange(rangeLike) {
    var Line = rangeLike.Line, Column = rangeLike.Column, EndLine = rangeLike.EndLine, EndColumn = rangeLike.EndColumn;
    return new vscode.Range(Line - 1, Column - 1, EndLine - 1, EndColumn - 1);
}
exports.toRange = toRange;
function toRange2(rangeLike) {
    var StartLine = rangeLike.StartLine, StartColumn = rangeLike.StartColumn, EndLine = rangeLike.EndLine, EndColumn = rangeLike.EndColumn;
    return new vscode.Range(StartLine - 1, StartColumn - 1, EndLine - 1, EndColumn - 1);
}
exports.toRange2 = toRange2;
function createRequest(document, where, includeBuffer) {
    if (includeBuffer === void 0) { includeBuffer = false; }
    var Line, Column;
    if (where instanceof vscode.Position) {
        Line = where.line + 1;
        Column = where.character + 1;
    }
    else if (where instanceof vscode.Range) {
        Line = where.start.line + 1;
        Column = where.start.character + 1;
    }
    var request = {
        Filename: document.fileName,
        Buffer: includeBuffer ? document.getText() : undefined,
        Line: Line,
        Column: Column
    };
    return request;
}
exports.createRequest = createRequest;
function toDocumentSymbol(bucket, node, containerLabel) {
    var ret = new vscode.SymbolInformation(node.Location.Text, kinds[node.Kind], toRange(node.Location), undefined, containerLabel);
    if (node.ChildNodes) {
        for (var _i = 0, _a = node.ChildNodes; _i < _a.length; _i++) {
            var child = _a[_i];
            toDocumentSymbol(bucket, child, ret.name);
        }
    }
    bucket.push(ret);
}
exports.toDocumentSymbol = toDocumentSymbol;
var kinds = Object.create(null);
kinds['NamespaceDeclaration'] = vscode.SymbolKind.Namespace;
kinds['ClassDeclaration'] = vscode.SymbolKind.Class;
kinds['FieldDeclaration'] = vscode.SymbolKind.Field;
kinds['PropertyDeclaration'] = vscode.SymbolKind.Property;
kinds['EventFieldDeclaration'] = vscode.SymbolKind.Property;
kinds['MethodDeclaration'] = vscode.SymbolKind.Method;
kinds['EnumDeclaration'] = vscode.SymbolKind.Enum;
kinds['StructDeclaration'] = vscode.SymbolKind.Enum;
kinds['EnumMemberDeclaration'] = vscode.SymbolKind.Property;
kinds['InterfaceDeclaration'] = vscode.SymbolKind.Interface;
kinds['VariableDeclaration'] = vscode.SymbolKind.Variable;
//# sourceMappingURL=typeConvertion.js.map