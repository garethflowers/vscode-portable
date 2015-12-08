/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var Path = require('path');
var FS = require('fs');
var source_map_1 = require('source-map');
var PathUtils = require('./pathUtilities');
var SourceMaps = (function () {
    function SourceMaps(generatedCodeDirectory) {
        this._generatedToSourceMaps = {}; // generated -> source file
        this._sourceToGeneratedMaps = {}; // source file -> generated
        this._generatedCodeDirectory = generatedCodeDirectory;
    }
    SourceMaps.prototype.MapPathFromSource = function (pathToSource) {
        var map = this._findSourceToGeneratedMapping(pathToSource);
        if (map)
            return map.generatedPath();
        return null;
        ;
    };
    SourceMaps.prototype.MapFromSource = function (pathToSource, line, column) {
        var map = this._findSourceToGeneratedMapping(pathToSource);
        if (map) {
            line += 1; // source map impl is 1 based
            var mr = map.generatedPositionFor(pathToSource, line, column);
            if (typeof mr.line === 'number') {
                if (SourceMaps.TRACE)
                    console.error(Path.basename(pathToSource) + " " + line + ":" + column + " -> " + mr.line + ":" + mr.column);
                return { path: map.generatedPath(), line: mr.line - 1, column: mr.column };
            }
        }
        return null;
    };
    SourceMaps.prototype.MapToSource = function (pathToGenerated, line, column) {
        var map = this._findGeneratedToSourceMapping(pathToGenerated);
        if (map) {
            line += 1; // source map impl is 1 based
            var mr = map.originalPositionFor(line, column);
            if (mr.source) {
                if (SourceMaps.TRACE)
                    console.error(Path.basename(pathToGenerated) + " " + line + ":" + column + " -> " + mr.line + ":" + mr.column);
                return { path: mr.source, line: mr.line - 1, column: mr.column };
            }
        }
        return null;
    };
    //---- private -----------------------------------------------------------------------
    SourceMaps.prototype._findSourceToGeneratedMapping = function (pathToSource) {
        if (pathToSource) {
            if (pathToSource in this._sourceToGeneratedMaps) {
                return this._sourceToGeneratedMaps[pathToSource];
            }
            for (var key in this._generatedToSourceMaps) {
                var m = this._generatedToSourceMaps[key];
                if (m.doesOriginateFrom(pathToSource)) {
                    this._sourceToGeneratedMaps[pathToSource] = m;
                    return m;
                }
            }
            // not found in existing maps
            // use heuristic: change extension to ".js" and find a map for it
            var pathToGenerated = pathToSource;
            var pos = pathToSource.lastIndexOf('.');
            if (pos >= 0) {
                pathToGenerated = pathToSource.substr(0, pos) + '.js';
            }
            var map = null;
            // first look into the generated code directory
            if (this._generatedCodeDirectory) {
                var rest = PathUtils.makeRelative(this._generatedCodeDirectory, pathToGenerated);
                while (rest) {
                    var path = Path.join(this._generatedCodeDirectory, rest);
                    map = this._findGeneratedToSourceMapping(path);
                    if (map) {
                        break;
                    }
                    rest = PathUtils.removeFirstSegment(rest);
                }
            }
            // VSCode extension host support:
            // we know that the plugin has an "out" directory next to the "src" directory
            if (map === null) {
                var srcSegment = Path.sep + 'src' + Path.sep;
                if (pathToGenerated.indexOf(srcSegment) >= 0) {
                    var outSegment = Path.sep + 'out' + Path.sep;
                    pathToGenerated = pathToGenerated.replace(srcSegment, outSegment);
                    map = this._findGeneratedToSourceMapping(pathToGenerated);
                }
            }
            // if not found look in the same directory as the source
            if (map === null && pathToGenerated !== pathToSource) {
                map = this._findGeneratedToSourceMapping(pathToGenerated);
            }
            if (map) {
                this._sourceToGeneratedMaps[pathToSource] = map;
                return map;
            }
        }
        return null;
    };
    SourceMaps.prototype._findGeneratedToSourceMapping = function (pathToGenerated) {
        if (pathToGenerated) {
            if (pathToGenerated in this._generatedToSourceMaps) {
                return this._generatedToSourceMaps[pathToGenerated];
            }
            var map = null;
            // try to find a source map URL in the generated source
            var map_path = null;
            var uri = this._findSourceMapInGeneratedSource(pathToGenerated);
            if (uri) {
                if (uri.indexOf("data:application/json;base64,") >= 0) {
                    var pos = uri.indexOf(',');
                    if (pos > 0) {
                        var data = uri.substr(pos + 1);
                        try {
                            var buffer = new Buffer(data, 'base64');
                            var json = buffer.toString();
                            if (json) {
                                map = new SourceMap(pathToGenerated, json);
                                this._generatedToSourceMaps[pathToGenerated] = map;
                                return map;
                            }
                        }
                        catch (e) {
                            console.error("FindGeneratedToSourceMapping: exception while processing data url (" + e + ")");
                        }
                    }
                }
                else {
                    map_path = uri;
                }
            }
            // if path is relative make it absolute
            if (map_path && !Path.isAbsolute(map_path)) {
                map_path = PathUtils.makePathAbsolute(pathToGenerated, map_path);
            }
            if (map_path === null || !FS.existsSync(map_path)) {
                // try to find map file next to the generated source
                map_path = pathToGenerated + ".map";
            }
            if (FS.existsSync(map_path)) {
                map = this._createSourceMap(map_path, pathToGenerated);
                if (map) {
                    this._generatedToSourceMaps[pathToGenerated] = map;
                    return map;
                }
            }
        }
        return null;
    };
    SourceMaps.prototype._createSourceMap = function (map_path, path) {
        try {
            var contents = FS.readFileSync(Path.join(map_path)).toString();
            return new SourceMap(path, contents);
        }
        catch (e) {
            console.error("CreateSourceMap: {e}");
        }
        return null;
    };
    //  find "//# sourceMappingURL=<url>"
    SourceMaps.prototype._findSourceMapInGeneratedSource = function (pathToGenerated) {
        try {
            var contents = FS.readFileSync(pathToGenerated).toString();
            var lines = contents.split('\n');
            for (var _i = 0; _i < lines.length; _i++) {
                var line = lines[_i];
                var matches = SourceMaps.SOURCE_MAPPING_MATCHER.exec(line);
                if (matches && matches.length === 2) {
                    var uri = matches[1].trim();
                    return uri;
                }
            }
        }
        catch (e) {
        }
        return null;
    };
    SourceMaps.TRACE = false;
    SourceMaps.SOURCE_MAPPING_MATCHER = new RegExp("//[#@] ?sourceMappingURL=(.+)$");
    return SourceMaps;
})();
exports.SourceMaps = SourceMaps;
var Bias;
(function (Bias) {
    Bias[Bias["GREATEST_LOWER_BOUND"] = 1] = "GREATEST_LOWER_BOUND";
    Bias[Bias["LEAST_UPPER_BOUND"] = 2] = "LEAST_UPPER_BOUND";
})(Bias || (Bias = {}));
var SourceMap = (function () {
    function SourceMap(generatedPath, json) {
        this._generatedFile = generatedPath;
        var sm = JSON.parse(json);
        this._sources = sm.sources;
        var sr = sm.sourceRoot;
        if (sr) {
            sr = PathUtils.canonicalizeUrl(sr);
            this._sourceRoot = PathUtils.makePathAbsolute(generatedPath, sr);
        }
        else {
            this._sourceRoot = Path.dirname(generatedPath);
        }
        if (this._sourceRoot[this._sourceRoot.length - 1] !== Path.sep) {
            this._sourceRoot += Path.sep;
        }
        this._smc = new source_map_1.SourceMapConsumer(sm);
    }
    /*
     * the generated file of this source map.
     */
    SourceMap.prototype.generatedPath = function () {
        return this._generatedFile;
    };
    /*
     * returns true if this source map originates from the given source.
     */
    SourceMap.prototype.doesOriginateFrom = function (absPath) {
        for (var _i = 0, _a = this._sources; _i < _a.length; _i++) {
            var name_1 = _a[_i];
            var p = Path.join(this._sourceRoot, name_1);
            if (p === absPath) {
                return true;
            }
        }
        return false;
    };
    /*
     * finds the nearest source location for the given location in the generated file.
     */
    SourceMap.prototype.originalPositionFor = function (line, column, bias) {
        if (bias === void 0) { bias = Bias.GREATEST_LOWER_BOUND; }
        var mp = this._smc.originalPositionFor({
            line: line,
            column: column,
            bias: bias
        });
        if (mp.source) {
            mp.source = PathUtils.canonicalizeUrl(mp.source);
            mp.source = PathUtils.makePathAbsolute(this._generatedFile, mp.source);
        }
        return mp;
    };
    /*
     * finds the nearest location in the generated file for the given source location.
     */
    SourceMap.prototype.generatedPositionFor = function (src, line, column, bias) {
        if (bias === void 0) { bias = Bias.GREATEST_LOWER_BOUND; }
        // make input path relative to sourceRoot
        if (this._sourceRoot) {
            src = Path.relative(this._sourceRoot, src);
        }
        // source-maps always use forward slashes
        if (process.platform === 'win32') {
            src = src.replace(/\\/g, '/');
        }
        var needle = {
            source: src,
            line: line,
            column: column,
            bias: bias
        };
        return this._smc.generatedPositionFor(needle);
    };
    return SourceMap;
})();
//# sourceMappingURL=sourceMaps.js.map