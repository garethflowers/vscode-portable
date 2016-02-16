/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var vscode_languageserver_1 = require('vscode-languageserver');
var JSONHover = (function () {
    function JSONHover(schemaService, contributions) {
        if (contributions === void 0) { contributions = []; }
        this.schemaService = schemaService;
        this.contributions = contributions;
    }
    JSONHover.prototype.doHover = function (document, textDocumentPosition, doc) {
        var _this = this;
        var offset = document.offsetAt(textDocumentPosition.position);
        var node = doc.getNodeFromOffset(offset);
        var originalNode = node;
        // use the property description when hovering over an object key
        if (node && node.type === 'string') {
            var stringNode = node;
            if (stringNode.isKey) {
                var propertyNode = node.parent;
                node = propertyNode.value;
            }
        }
        if (!node) {
            return Promise.resolve(void 0);
        }
        return this.schemaService.getSchemaForResource(textDocumentPosition.uri, doc).then(function (schema) {
            if (schema) {
                var matchingSchemas = [];
                doc.validate(schema.schema, matchingSchemas, node.start);
                var description = null;
                var contributonId = null;
                matchingSchemas.every(function (s) {
                    if (s.node === node && !s.inverted && s.schema) {
                        description = description || s.schema.description;
                        contributonId = contributonId || s.schema.id;
                    }
                    return true;
                });
                var createHover = function (contents) {
                    var range = vscode_languageserver_1.Range.create(document.positionAt(node.start), document.positionAt(node.end));
                    var result = {
                        contents: contents,
                        range: range
                    };
                    return result;
                };
                var location_1 = node.getNodeLocation();
                for (var i = _this.contributions.length - 1; i >= 0; i--) {
                    var contribution = _this.contributions[i];
                    var promise = contribution.getInfoContribution(textDocumentPosition.uri, location_1);
                    if (promise) {
                        return promise.then(function (htmlContent) { return createHover(htmlContent); });
                    }
                }
                if (description) {
                    return createHover([description]);
                }
            }
            return void 0;
        });
    };
    return JSONHover;
})();
exports.JSONHover = JSONHover;
//# sourceMappingURL=jsonHover.js.map