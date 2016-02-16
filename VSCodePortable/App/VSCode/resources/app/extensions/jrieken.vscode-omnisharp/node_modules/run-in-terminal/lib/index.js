/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
var child_process_1 = require('child_process');
var path_1 = require('path');
var util_1 = require('util');
function runInTerminal(command, args, options) {
    return _terminalSpawn(command, args || [], options).then(function (value) {
        var result = value;
        result.kill2 = function () { return _terminate(value); };
        return result;
    });
}
exports.runInTerminal = runInTerminal;
var _terminalSpawn = /^win/.test(process.platform)
    ? runInTerminalWin
    : process.platform === 'darwin'
        ? runInTerminalMac
        : runInTerminalLinux;
var _terminate = /^win/.test(process.platform)
    ? terminateWin
    : terminateMacLinux;
function promiseSpawn(command, args, options) {
    return new Promise(function (resolve, reject) {
        var childProcess = child_process_1.spawn(command, args, options);
        childProcess.on('error', reject);
        // give process a change to emit 
        // an error
        setTimeout(function (_) { return resolve(childProcess); }, 0);
    });
}
function runInTerminalWin(file, args, options) {
    // we use `start` to get another cmd.exe where `& pause` can be handled
    args = [
        '/c',
        'start',
        '/wait',
        'cmd.exe',
        '/c',
        ("\"" + file + " " + args.join(' ') + " & pause\"")
    ];
    options = options || {};
    options.windowsVerbatimArguments = true;
    return promiseSpawn('cmd.exe', args, options);
}
function runInTerminalMac(file, args, options) {
    args = [
        path_1.join(__dirname, 'launcher.scpt'),
        'cd', util_1.format("'%s'", options.cwd), ';',
        file
    ].concat(args);
    return promiseSpawn('/usr/bin/osascript', args, options);
}
function runInTerminalLinux(file, args, options) {
    var LINUX_TERM = '/usr/bin/gnome-terminal'; // '/usr/bin/x-terminal-emulator'
    var flattenedArgs = '';
    if (args.length > 0) {
        flattenedArgs = '"' + args.join('" "') + '"';
    }
    var cdCommand = '';
    if (options.cwd) {
        cdCommand = util_1.format('cd "%s"', options.cwd);
    }
    var bashCommand = util_1.format('%s; "%s" %s ; echo; read -p "%s" -n1;', cdCommand, file, flattenedArgs, "Press any key to continue...");
    args = [
        '-x',
        'bash',
        '-c',
        // wrapping argument in two sets of ' because node is so "friendly" that it removes one set...
        util_1.format('\'\'%s\'\'', bashCommand)
    ];
    return promiseSpawn(LINUX_TERM, args, options);
}
function terminateWin(process) {
    if (process) {
        return new Promise(function (resolve, reject) {
            process.once('exit', function (code, signal) {
                resolve(code);
            });
            child_process_1.exec("taskkill /F /T /PID " + process.pid, function (err, stdout, stderr) {
                if (err) {
                    reject(err);
                }
            });
        });
    }
}
function terminateMacLinux(process) {
    if (process) {
        return new Promise(function (resolve, reject) {
            process.once('exit', function (code, signal) {
                resolve(code);
            });
            process.once('error', function (err) {
                reject(err);
            });
            process.kill('SIGTERM');
        });
    }
}
