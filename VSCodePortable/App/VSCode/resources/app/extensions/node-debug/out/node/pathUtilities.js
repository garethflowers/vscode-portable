/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var Path = require('path');
var URL = require('url');
function getPathRoot(p) {
    if (p) {
        if (p.length >= 3 && p[1] === ':' && p[2] === '\\' && ((p[0] >= 'a' && p[0] <= 'z') || (p[0] >= 'A' && p[0] <= 'Z'))) {
            return p.substr(0, 3);
        }
        if (p.length > 0 && p[0] === '/') {
            return '/';
        }
    }
    return null;
}
exports.getPathRoot = getPathRoot;
function makePathAbsolute(absPath, relPath) {
    return Path.resolve(Path.dirname(absPath), relPath);
}
exports.makePathAbsolute = makePathAbsolute;
function removeFirstSegment(path) {
    var segments = path.split(Path.sep);
    segments.shift();
    if (segments.length > 0) {
        return segments.join(Path.sep);
    }
    return null;
}
exports.removeFirstSegment = removeFirstSegment;
function makeRelative(target, path) {
    var t = target.split(Path.sep);
    var p = path.split(Path.sep);
    var i = 0;
    for (; i < Math.min(t.length, p.length) && t[i] === p[i]; i++) {
    }
    var result = '';
    for (; i < p.length; i++) {
        result = Path.join(result, p[i]);
    }
    return result;
}
exports.makeRelative = makeRelative;
function canonicalizeUrl(url) {
    var u = URL.parse(url);
    var p = u.pathname;
    if (p.length >= 4 && p[0] === '/' && p[2] === ':' && p[3] === '/' && ((p[1] >= 'a' && p[1] <= 'z') || (p[1] >= 'A' && p[1] <= 'Z'))) {
        return p.substr(1);
    }
    return p;
}
exports.canonicalizeUrl = canonicalizeUrl;
//# sourceMappingURL=pathUtilities.js.map