/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
function uriFromPath(e){var r=path.resolve(e).replace(/\\/g,"/");return r.length>0&&"/"!==r.charAt(0)&&(r="/"+r),encodeURI("file://"+r)}var path=require("path"),loader=require("./vs/loader"),rawNlsConfig=process.env.VSCODE_NLS_CONFIG,nlsConfig=rawNlsConfig?JSON.parse(rawNlsConfig):{availableLanguages:{}};loader.config({baseUrl:uriFromPath(path.join(__dirname)),catchError:!0,nodeRequire:require,nodeMain:__filename,"vs/nls":nlsConfig}),nlsConfig.pseudo&&loader(["vs/nls"],function(e){e.setPseudoTranslation(nlsConfig.pseudo)}),exports.bootstrap=function(e){e&&loader([e],function(){},function(e){console.error(e)})};
//# sourceMappingURL=https://ticino.blob.core.windows.net/sourcemaps/f291f4ad600767626b24a4b15816b04bee9a3049/bootstrap-amd.js.map
