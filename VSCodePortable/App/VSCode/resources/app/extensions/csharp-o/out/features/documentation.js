/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var _regExp = /<(\S*?).*?>((.|\r|\n)*?)<\/\1>/;
/**
 * remove xml-tags from string
 */
function plain(doc) {
    if (!doc) {
        return doc;
    }
    var newDoc;
    while (true) {
        newDoc = doc.replace(_regExp, function (m, g1, g2, g3) { return g2; });
        if (newDoc === doc) {
            break;
        }
        doc = newDoc;
    }
    return newDoc;
}
exports.plain = plain;
//# sourceMappingURL=documentation.js.map