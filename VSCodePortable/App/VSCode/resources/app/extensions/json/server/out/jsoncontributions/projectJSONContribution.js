/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var vscode_languageserver_1 = require('vscode-languageserver');
var Strings = require('../utils/strings');
var nls = require('../utils/nls');
var LIMIT = 40;
var ProjectJSONContribution = (function () {
    function ProjectJSONContribution(requestService) {
        this.requestService = requestService;
    }
    ProjectJSONContribution.prototype.isProjectJSONFile = function (resource) {
        return Strings.endsWith(resource, '/project.json');
    };
    ProjectJSONContribution.prototype.collectDefaultSuggestions = function (resource, result) {
        if (this.isProjectJSONFile(resource)) {
            var defaultValue = {
                'version': '{{1.0.0-*}}',
                'dependencies': {},
                'frameworks': {
                    'dnx451': {},
                    'dnxcore50': {}
                }
            };
            result.add({ kind: vscode_languageserver_1.CompletionItemKind.Class, label: nls.localize('json.project.default', 'Default project.json'), insertText: JSON.stringify(defaultValue, null, '\t'), documentation: '' });
        }
        return null;
    };
    ProjectJSONContribution.prototype.collectPropertySuggestions = function (resource, location, currentWord, addValue, isLast, result) {
        if (this.isProjectJSONFile(resource) && (location.matches(['dependencies']) || location.matches(['frameworks', '*', 'dependencies']) || location.matches(['frameworks', '*', 'frameworkAssemblies']))) {
            var queryUrl;
            if (currentWord.length > 0) {
                queryUrl = 'https://www.nuget.org/api/v2/Packages?'
                    + '$filter=Id%20ge%20\''
                    + encodeURIComponent(currentWord)
                    + '\'%20and%20Id%20lt%20\''
                    + encodeURIComponent(currentWord + 'z')
                    + '\'%20and%20IsAbsoluteLatestVersion%20eq%20true'
                    + '&$select=Id,Version,Description&$format=json&$top=' + LIMIT;
            }
            else {
                queryUrl = 'https://www.nuget.org/api/v2/Packages?'
                    + '$filter=IsAbsoluteLatestVersion%20eq%20true'
                    + '&$orderby=DownloadCount%20desc&$top=' + LIMIT
                    + '&$select=Id,Version,DownloadCount,Description&$format=json';
            }
            return this.requestService({
                url: queryUrl
            }).then(function (success) {
                if (success.status === 200) {
                    try {
                        var obj = JSON.parse(success.responseText);
                        if (Array.isArray(obj.d)) {
                            var results = obj.d;
                            for (var i = 0; i < results.length; i++) {
                                var curr = results[i];
                                var name_1 = curr.Id;
                                var version = curr.Version;
                                if (name_1) {
                                    var documentation = curr.Description;
                                    var typeLabel = curr.Version;
                                    var insertText = JSON.stringify(name_1);
                                    if (addValue) {
                                        insertText += ': "{{' + version + '}}"';
                                        if (!isLast) {
                                            insertText += ',';
                                        }
                                    }
                                    result.add({ kind: vscode_languageserver_1.CompletionItemKind.Property, label: name_1, insertText: insertText, detail: typeLabel, documentation: documentation });
                                }
                            }
                            if (results.length === LIMIT) {
                                result.setAsIncomplete();
                            }
                        }
                    }
                    catch (e) {
                    }
                }
                else {
                    result.error(nls.localize('json.nugget.error.repoaccess', 'Request to the nuget repository failed: {0}', success.responseText));
                    return 0;
                }
            }, function (error) {
                result.error(nls.localize('json.nugget.error.repoaccess', 'Request to the nuget repository failed: {0}', error.responseText));
                return 0;
            });
        }
        return null;
    };
    ProjectJSONContribution.prototype.collectValueSuggestions = function (resource, location, currentKey, result) {
        if (this.isProjectJSONFile(resource) && (location.matches(['dependencies']) || location.matches(['frameworks', '*', 'dependencies']) || location.matches(['frameworks', '*', 'frameworkAssemblies']))) {
            var queryUrl = 'https://www.myget.org/F/aspnetrelease/api/v2/Packages?'
                + '$filter=Id%20eq%20\''
                + encodeURIComponent(currentKey)
                + '\'&$select=Version,IsAbsoluteLatestVersion&$format=json&$top=' + LIMIT;
            return this.requestService({
                url: queryUrl
            }).then(function (success) {
                try {
                    var obj = JSON.parse(success.responseText);
                    if (Array.isArray(obj.d)) {
                        var results = obj.d;
                        for (var i = 0; i < results.length; i++) {
                            var curr = results[i];
                            var version = curr.Version;
                            if (version) {
                                var name_2 = JSON.stringify(version);
                                var isLatest = curr.IsAbsoluteLatestVersion === 'true';
                                var label = name_2;
                                var documentation = '';
                                if (isLatest) {
                                    documentation = nls.localize('json.nugget.versiondescription.suggest', 'The currently latest version of the package');
                                }
                                result.add({ kind: vscode_languageserver_1.CompletionItemKind.Class, label: label, insertText: name_2, documentation: documentation });
                            }
                        }
                        if (results.length === LIMIT) {
                            result.setAsIncomplete();
                        }
                    }
                }
                catch (e) {
                }
                return 0;
            }, function (error) {
                return 0;
            });
        }
        return null;
    };
    ProjectJSONContribution.prototype.getInfoContribution = function (resource, location) {
        if (this.isProjectJSONFile(resource) && (location.matches(['dependencies', '*']) || location.matches(['frameworks', '*', 'dependencies', '*']) || location.matches(['frameworks', '*', 'frameworkAssemblies', '*']))) {
            var pack = location.getSegments()[location.getSegments().length - 1];
            var htmlContent = [];
            htmlContent.push(nls.localize('json.nugget.package.hover', '{0}', pack));
            var queryUrl = 'https://www.myget.org/F/aspnetrelease/api/v2/Packages?'
                + '$filter=Id%20eq%20\''
                + encodeURIComponent(pack)
                + '\'%20and%20IsAbsoluteLatestVersion%20eq%20true'
                + '&$select=Version,Description&$format=json&$top=5';
            return this.requestService({
                url: queryUrl
            }).then(function (success) {
                var content = success.responseText;
                if (content) {
                    try {
                        var obj = JSON.parse(content);
                        if (obj.d && obj.d[0]) {
                            var res = obj.d[0];
                            if (res.Description) {
                                htmlContent.push(res.Description);
                            }
                            if (res.Version) {
                                htmlContent.push(nls.localize('json.nugget.version.hover', 'Latest version: {0}', res.Version));
                            }
                        }
                    }
                    catch (e) {
                    }
                }
                return htmlContent;
            }, function (error) {
                return htmlContent;
            });
        }
        return null;
    };
    return ProjectJSONContribution;
})();
exports.ProjectJSONContribution = ProjectJSONContribution;
//# sourceMappingURL=projectJSONContribution.js.map