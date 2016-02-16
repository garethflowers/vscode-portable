/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var url_1 = require('url');
var proxy_1 = require('./proxy');
var https = require('https');
var http = require('http');
var nls = require('./nls');
var proxyUrl = null;
var strictSSL = true;
function assign(destination) {
    var sources = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        sources[_i - 1] = arguments[_i];
    }
    sources.forEach(function (source) { return Object.keys(source).forEach(function (key) { return destination[key] = source[key]; }); });
    return destination;
}
function configure(_proxyUrl, _strictSSL) {
    proxyUrl = _proxyUrl;
    strictSSL = _strictSSL;
}
exports.configure = configure;
function xhr(options) {
    var agent = proxy_1.getProxyAgent(options.url, { proxyUrl: proxyUrl, strictSSL: strictSSL });
    options = assign({}, options);
    options = assign(options, { agent: agent, strictSSL: strictSSL });
    if (typeof options.followRedirects !== 'number') {
        options.followRedirects = 5;
    }
    return request(options).then(function (result) { return new Promise(function (c, e) {
        var res = result.res;
        var data = [];
        res.on('data', function (c) { return data.push(c); });
        res.on('end', function () {
            if (options.followRedirects > 0 && (res.statusCode >= 300 && res.statusCode <= 303 || res.statusCode === 307)) {
                var location_1 = res.headers['location'];
                if (location_1) {
                    var newOptions = {
                        type: options.type, url: location_1, user: options.user, password: options.password, responseType: options.responseType, headers: options.headers,
                        timeout: options.timeout, followRedirects: options.followRedirects - 1, data: options.data
                    };
                    xhr(newOptions).then(c, e);
                    return;
                }
            }
            var response = {
                responseText: data.join(''),
                status: res.statusCode
            };
            if ((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 1223) {
                c(response);
            }
            else {
                e(response);
            }
        });
    }); }, function (err) {
        var message;
        if (agent) {
            message = 'Unable to to connect to ' + options.url + ' through a proxy . Error: ' + err.message;
        }
        else {
            message = 'Unable to to connect to ' + options.url + '. Error: ' + err.message;
        }
        return Promise.reject({
            responseText: message,
            status: 404
        });
    });
}
exports.xhr = xhr;
function request(options) {
    var req;
    return new Promise(function (c, e) {
        var endpoint = url_1.parse(options.url);
        var opts = {
            hostname: endpoint.hostname,
            port: endpoint.port ? parseInt(endpoint.port) : (endpoint.protocol === 'https:' ? 443 : 80),
            path: endpoint.path,
            method: options.type || 'GET',
            headers: options.headers,
            agent: options.agent,
            rejectUnauthorized: (typeof options.strictSSL === 'boolean') ? options.strictSSL : true
        };
        if (options.user && options.password) {
            opts.auth = options.user + ':' + options.password;
        }
        var protocol = endpoint.protocol === 'https:' ? https : http;
        req = protocol.request(opts, function (res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && options.followRedirects && options.followRedirects > 0 && res.headers['location']) {
                c(request(assign({}, options, {
                    url: res.headers['location'],
                    followRedirects: options.followRedirects - 1
                })));
            }
            else {
                c({ req: req, res: res });
            }
        });
        req.on('error', e);
        if (options.timeout) {
            req.setTimeout(options.timeout);
        }
        if (options.data) {
            req.write(options.data);
        }
        req.end();
    });
}
function getErrorStatusDescription(status) {
    if (status < 400) {
        return void 0;
    }
    switch (status) {
        case 400: return nls.localize('status.400', 'Bad request. The request cannot be fulfilled due to bad syntax.');
        case 401: return nls.localize('status.401', 'Unauthorized. The server is refusing to respond.');
        case 403: return nls.localize('status.403', 'Forbidden. The server is refusing to respond.');
        case 404: return nls.localize('status.404', 'Not Found. The requested location could not be found.');
        case 405: return nls.localize('status.405', 'Method not allowed. A request was made using a request method not supported by that location.');
        case 406: return nls.localize('status.406', 'Not Acceptable. The server can only generate a response that is not accepted by the client.');
        case 407: return nls.localize('status.407', 'Proxy Authentication Required. The client must first authenticate itself with the proxy.');
        case 408: return nls.localize('status.408', 'Request Timeout. The server timed out waiting for the request.');
        case 409: return nls.localize('status.409', 'Conflict. The request could not be completed because of a conflict in the request.');
        case 410: return nls.localize('status.410', 'Gone. The requested page is no longer available.');
        case 411: return nls.localize('status.411', 'Length Required. The "Content-Length" is not defined.');
        case 412: return nls.localize('status.412', 'Precondition Failed. The precondition given in the request evaluated to false by the server.');
        case 413: return nls.localize('status.413', 'Request Entity Too Large. The server will not accept the request, because the request entity is too large.');
        case 414: return nls.localize('status.414', 'Request-URI Too Long. The server will not accept the request, because the URL is too long.');
        case 415: return nls.localize('status.415', 'Unsupported Media Type. The server will not accept the request, because the media type is not supported.');
        case 500: return nls.localize('status.500', 'Internal Server Error.');
        case 501: return nls.localize('status.501', 'Not Implemented. The server either does not recognize the request method, or it lacks the ability to fulfill the request.');
        case 503: return nls.localize('status.503', 'Service Unavailable. The server is currently unavailable (overloaded or down).');
        default: return nls.localize('status.416', 'HTTP status code {0}', status);
    }
}
exports.getErrorStatusDescription = getErrorStatusDescription;
//# sourceMappingURL=httpRequest.js.map