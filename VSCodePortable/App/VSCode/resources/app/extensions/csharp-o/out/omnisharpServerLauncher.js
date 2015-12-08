/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var fs_1 = require('fs');
var child_process_1 = require('child_process');
var vscode_1 = require('vscode');
var semver_1 = require('semver');
var path_1 = require('path');
var omnisharpEnv = 'OMNISHARP';
var isWindows = /^win/.test(process.platform);
function launch(cwd, args) {
    return new Promise(function (resolve, reject) {
        try {
            (isWindows ? launchWindows(cwd, args) : launchNix(cwd, args)).then(function (value) {
                // async error - when target not not ENEOT
                value.process.on('error', reject);
                // success after a short freeing event loop
                setTimeout(function () {
                    resolve(value);
                }, 0);
            }, function (err) {
                reject(err);
            });
        }
        catch (err) {
            reject(err);
        }
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = launch;
function launchWindows(cwd, args) {
    return getOmnisharpPath().then(function (command) {
        args = args.slice(0);
        args.unshift(command);
        args = [[
                '/s',
                '/c',
                '"' + args.map(function (arg) { return /^[^"].* .*[^"]/.test(arg) ? "\"" + arg + "\"" : arg; }).join(' ') + '"'
            ].join(' ')];
        var process = child_process_1.spawn('cmd', args, {
            windowsVerbatimArguments: true,
            detached: false,
            // env: details.env,
            cwd: cwd
        });
        return {
            process: process,
            command: command
        };
    });
}
function launchNix(cwd, args) {
    return new Promise(function (resolve, reject) {
        hasMono('>=4.0.1').then(function (hasIt) {
            if (!hasIt) {
                reject(new Error('Cannot start Omnisharp because Mono version >=4.0.1 is required. See http://go.microsoft.com/fwlink/?linkID=534832#_20001'));
            }
            else {
                resolve();
            }
        });
    }).then(function (_) {
        return getOmnisharpPath();
    }).then(function (command) {
        var process = child_process_1.spawn(command, args, {
            detached: false,
            // env: details.env,
            cwd: cwd
        });
        return {
            process: process,
            command: command
        };
    });
}
function getOmnisharpPath() {
    var pathCandidate;
    var config = vscode_1.workspace.getConfiguration();
    if (config.has('csharp.omnisharp')) {
        // form config
        pathCandidate = config.get('csharp.omnisharp');
    }
    else if (typeof process.env[omnisharpEnv] === 'string') {
        // form enviroment variable
        console.warn('[deprecated] use workspace or user settings with "csharp.omnisharp":"/path/to/omnisharp"');
        pathCandidate = process.env[omnisharpEnv];
    }
    else {
        // bundled version of Omnisharp
        pathCandidate = path_1.join(__dirname, '../bin/omnisharp');
        if (isWindows) {
            pathCandidate += '.cmd';
        }
    }
    return new Promise(function (resolve, reject) {
        fs_1.exists(pathCandidate, function (localExists) {
            if (localExists) {
                resolve(pathCandidate);
            }
            else {
                reject('OmniSharp does not exist at location: ' + pathCandidate);
            }
        });
    });
}
var versionRegexp = /(\d+\.\d+\.\d+)/;
function hasMono(range) {
    return new Promise(function (resolve, reject) {
        var childprocess;
        try {
            childprocess = child_process_1.spawn('mono', ['--version']);
        }
        catch (e) {
            return resolve(false);
        }
        childprocess.on('error', function (err) {
            resolve(false);
        });
        var stdout = '';
        childprocess.stdout.on('data', function (data) {
            stdout += data.toString();
        });
        childprocess.stdout.on('close', function () {
            var match = versionRegexp.exec(stdout), ret;
            if (!match) {
                ret = false;
            }
            else if (!range) {
                ret = true;
            }
            else {
                ret = semver_1.satisfies(match[1], range);
            }
            resolve(ret);
        });
    });
}
exports.hasMono = hasMono;
//# sourceMappingURL=omnisharpServerLauncher.js.map