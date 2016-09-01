/*
//
//   ██╗   ██╗ ██████╗ ██╗   ██╗██╗   ██╗ ██████╗ ██╗
//   ╚██╗ ██╔╝██╔═══██╗██║   ██║╚██╗ ██╔╝██╔═══██╗██║
//    ╚████╔╝ ██║   ██║██║   ██║ ╚████╔╝ ██║   ██║██║
//     ╚██╔╝  ██║   ██║██║   ██║  ╚██╔╝  ██║   ██║╚═╝
//      ██║   ╚██████╔╝╚██████╔╝   ██║   ╚██████╔╝██╗
//      ╚═╝    ╚═════╝  ╚═════╝    ╚═╝    ╚═════╝ ╚═╝
//     ,____________________________________________,
//     |      WebSocket Wrapper for WS library      |
//     '--------------------------------------------'
//
//  YouYo
//  1.0.0
//  Morteza H. Golkar
//  License: MIT
*/

'use strict';
// Requirements
const WS = require('ws');

// YouYo! .................
var YouYo = function (_yes){
    const self = this;
    // Mastering Yes:
    if(!_yes || typeof _yes != 'object'){
        var po =  ((typeof _yes == 'number') && (0 < _yes < 65536)) ? _yes : 80;
        this.yes = {}; this.yes[po] = { '/':{} };
    } else this.yes = _yes;
    this.servers = [];
    this.timeout = 5*60*1000; // Socket Timeout - Milliseconds (Default 5 Minutes)
    this.mask = false; // mask data frames
    this.compress = false; // compressing data frames
    this.cpip = 3; // Connections per Ip
    this.ppi = 60*1000; // Ping/Pong interval - Default: 1 minutes
    this.pol = 60*1000; // max pong after x Milliseconds - Default 1 Minutes
    this.pil = 2; // X Missed Pings Limit
    this.bpl = 5; // Max Bad Pings Limit (client sends too much pings related to last pong and `this.pol`)
    this.dosLimit = 3; // n wrong attempts >> possibly attack
    this.dosTimer = 1*60*1000; // delay between each handshake (after n wrong attempts) - Milliseconds (Default 1 Minutes)
    var dosIndex = { /* ip : {times: 10, last:timestamp} */ };
    this.origins = []; // accepted origins (empty array == any)
    this.freePath = false; // accept connection to any path?
    if(this.yes && 'origins' in this.yes){
        if(Array.isArray(this.yes.origins)) this.origins = this.yes.origins;
            else if(typeof this.yes.origins == 'string') this.origins.push( this.yes.origins );
        delete this.yes.origins;  
    }; // Mastering accepted origins
    // Ws[s] Options:
    this.disableHixie = true;
    this.clientTracking = true;
    this.perMessageDeflate = true;
    this.maxPayload = 1000*1000; // Bytes - Default: 1MB
    // Global Functions (keep it DRY)
    const sendTo = function(id, data, option, cb){
        if('wss' in this) var server = this.wss; else var server = this;
        if(id in server.sockindex.idi){
            var ws = server.sockindex.idi[id].ws;
            if(ws && ws.readyState === WS.OPEN) ws.send(data, option, cb);
        } else return false;
    };
    const broadcast =  function (data, options) {
        if('wss' in this){
            var server = this.wss;
            var self_key = this.ws.upgradeReq.headers['sec-websocket-key'];
        } else var server = this;
        server.clients.forEach(function each(client) {
            if ( client.readyState === WS.OPEN && (!self_key || client.upgradeReq.headers['sec-websocket-key'] != self_key) )
                client.send(data, options);
        });
    }; 
    const broadcastX =  function (type, data, options) {
        var server = this.wss;
        var self_key = this.ws.upgradeReq.headers['sec-websocket-key'];
        var acpt_url = this.ws.upgradeReq.url;
        var acpt_prtcl = this.ws.protocol;
        switch(type){
            case 'protocol':
                server.clients.forEach(function each(client) {
                if ( client.readyState === WS.OPEN 
                    && (!self_key || client.upgradeReq.headers['sec-websocket-key'] != self_key)
                    && (!acpt_url || client.upgradeReq.url == acpt_url)
                    && (!acpt_prtcl || client.protocol == acpt_prtcl)
                   )
                    client.send(data, options);
                });
                break;
            case 'path':
                server.clients.forEach(function each(client) {
                if ( client.readyState === WS.OPEN 
                    && (!self_key || client.upgradeReq.headers['sec-websocket-key'] != self_key)
                    && (!acpt_url || client.upgradeReq.url == acpt_url)
                   )
                    client.send(data, options);
                });  
                break;
        };
    };
    const antiDosing = function (wsip, boo) {
        var now = (new Date()).getTime();
        if(arguments.length>1 && boo === true){
            // Asks: is Attacker? -1 = atacker
            if( wsip in dosIndex ){
                var duration = now - dosIndex[wsip].last;
                if(dosIndex[wsip].times > self.dosLimit && duration < self.dosTimer) return -1; // Attacker
                else delete dosIndex[wsip];
            } else return 0; // ok fine
        } else {
            // Register as possible attacker
            if( !(wsip in dosIndex) ) dosIndex[wsip] = {times: 0, last:0};
            dosIndex[wsip].times++;
            dosIndex[wsip].last = now;
        };
    };
    // Upgrading Handlers
    this.secure = false;
    const verifyClient = function(info, rcb){
        // info.origin .req(http.ClientRequest) .secure (Boolean)
        var server = self.servers[this];
        var wsip = info.req.headers['x-forwarded-for'] || info.req.connection.remoteAddress;
        // Check for 'connection per ip' and 'path' validation:
        if( ((wsip in server.sockindex.ipi) && (server.sockindex.ipi[wsip].length >= self.cpip))
           || (!self.freePath && !(info.req.url in self.yes[server.options.port]))
          ){
            if(rcb && typeof rcb == 'function') rcb(false, 403, "Forbidden");
            antiDosing(wsip);
            return false;
        };
        var httpStatusCode, name, result = false; // is handshake accepted?
        if(self.secure === true && info.secure === false) {
            result = false;
            httpStatusCode = 401;
            name = 'Unauthorized'; // Bad origin
        } else if( !self.origins || (Array.isArray(self.origins) && self.origins.length < 1) || self.origins == "" || self.origins == " ") {
            result = true;
        } else if ( self.origins.includes(info.origin) ) {
            result = true;
        } else {
            result = false;
            httpStatusCode = 403;
            name = 'Forbidden'; // Bad origin
        };
        if( !result ) { antiDosing(wsip) } else {
            if( antiDosing(wsip, true) === -1 ){
                // Looks like DOS attacker
                result = false;
                httpStatusCode = 403;
                name = 'Forbidden';
            };
        };
        if(rcb && typeof rcb == 'function') rcb(result, httpStatusCode, name);
        return result;
    };    
    const protocolsHandler = function(protocols, rcb){
        // protocols [Array]: The list of WebSocket sub-protocols indicated by the client
        var accepted_protocol, avilable_protocols = [];
        var port = this; // This function is bind using 'port' as 'this'
        // Which Protocol?
        for (var path in self.yes[port]){
            var protocols_in_path = Object.keys(self.yes[port][path]);
            protocols.forEach(function(pl){
                if(!accepted_protocol && protocols_in_path.includes(pl)){
                    accepted_protocol = pl;
                };
            });
            if (accepted_protocol) break;
        };
        // is protocol accepted?
        var result = (accepted_protocol || (protocols.length == 1 && protocols[0].length == 0)) ? true : false;
        if(rcb && typeof rcb == 'function') rcb(result, accepted_protocol);
    };
    // Socket Handlers
    const wsMessage = function(data, flags){
        var socket = this; // This function is binded using 'ws' as 'this'
        var port = socket.wss.options.port;
        if (socket.protocol != undefined) var funny = self.yes[port][socket.path][socket.protocol];
        if (funny && (typeof funny == 'function')){
            var result = funny.call(socket, data, flags);
            if( !Buffer.isBuffer(result) ){
                var proceed;
                switch(typeof result){
                    case 'object': // Stringify >> Send
                        proceed = JSON.stringify(result);
                        break;
                    case 'boolean':
                        proceed = result ? 'true' : 'false';
                        break;
                    case 'string':
                        proceed = result;
                        break;
                };
                if(proceed) socket.send(proceed, {mask: self.mask, compress: self.compress, binary:false}); 
            } else if (result) socket.send(result, {mask: self.mask, compress: self.compress, binary:true});
        };
        self.emit("message", socket, data, flags);
    };
    const wsClose   = function(code, message){
        var socket = this; // This function is binded using 'ws' as 'this'
        try{
            socket.ws.removeAllListeners();
            socket.ws.terminate();
            delete socket.ws;
        } catch(x){};
        clearInterval(socket.ws.pingsi); // clear ping/pong interval
        // Delete from sock index
        if (socket.id && (socket.id in socket.wss.sockindex.idi) ) delete socket.wss.sockindex.idi[socket.id];
        if (socket.ip && (socket.ip in socket.wss.sockindex.ipi) ) {
            for(var i = 0; i < socket.wss.sockindex.ipi[socket.ip].length; i++){
                var tempSockKey = socket.wss.sockindex.ipi[socket.ip][i].ws.upgradeReq.headers['sec-websocket-key'];
                if(socket.ws.upgradeReq.headers['sec-websocket-key'] == tempSockKey){
                    socket.wss.sockindex.ipi[socket.ip].splice(i, 1);
                    if(socket.wss.sockindex.ipi[socket.ip].length == 0) delete socket.wss.sockindex.ipi[socket.ip];
                    break;
                };
            };
        };
        self.emit("closed", socket.wss, socket.id, code, message);
    };
    const wsError   = function(error){ self.emit('socket-error', error, this); };
    // Server Handlers
    const connectionHandler = function(ws){
        var server = this; // This function is bind using 'server' as 'this'
        ws._socket.setTimeout(self.timeout);
        // Establishing Connection
        var socket = {};
        Object.defineProperty( socket, "id", {
            enumerable: true,
            configurable:false,
            set: function(name){
                if( (typeof name == 'string') && !(name in socket.wss.sockindex.idi) ){
                    this._id = name;
                    socket.wss.sockindex.idi[name] = this;
                    self.emit('signed', name, this);
                    return name;
                } else return false;
            },
            get: function(){ return this._id; }
        });
        var pathObj = self.yes[server.options.port];
        var forcePrtcl = (ws.upgradeReq.url in pathObj) ? Object.keys(pathObj[ws.upgradeReq.url])[0] : null;
        Object.defineProperties( socket, {
            _id: { enumerable: false, writable: true, configurable:false, value: null },
            ip: { enumerable: true, writable: false, value: ws.upgradeReq.headers['x-forwarded-for'] || ws.upgradeReq.connection.remoteAddress },
            protocol: { enumerable: true, writable: false, value: ws.protocol || forcePrtcl},
            path: { enumerable: true, writable: false, value: ws.upgradeReq.url },
            origin: { enumerable: true, writable: false, value: ws.upgradeReq.headers.origin },
            sendTo: { enumerable: false, writable: false, value: sendTo.bind(socket) },
            broadcast: { enumerable: false, writable: false, value: broadcast.bind(socket) },
            broadcastPath: { enumerable: false, writable: false, value: broadcastX.bind(socket, 'path') },
            broadcastPrtcl: { enumerable: false, writable: false, value: broadcastX.bind(socket, 'protocol') },
            ws: { enumerable: false, writable: false, value: ws },
            wss: { enumerable: false, writable: false, value: server },
            send: { enumerable: false, writable: false, value: ws.send.bind(ws) }
        });
        // Register Sock in Server Sockindex by ip
        if( !(socket.ip in socket.wss.sockindex.ipi) ){ socket.wss.sockindex.ipi[socket.ip] = []; };
        socket.wss.sockindex.ipi[socket.ip].push(socket);
        // Handling
        ws.on('message', wsMessage.bind(socket) );
        ws.on('close'  , wsClose.bind(socket)   );
        ws.on('error'  , wsError.bind(socket)   );
            // Ping/pong Handling
        ws.pingss = 0;
        ws.lastPong = 0;
        ws.badPings = 0;
        ws.pingsi = setInterval(function() {
            if (ws.pingss >= self.pil) { // out of limits: connection's broken
                ws.close();
            } else {
                ws.ping();
                ws.pingss++;
            };
        }, self.ppi);
        ws.on("pong", function() { if(ws.readyState === WS.OPEN) ws.pingss = 0; });
        ws.on('ping'   , function(){
            var now = (new Date()).getTime();
            var passed = now - ws.lastPong;
            if(!ws.lastPong || passed >= self.pol){
                if(ws.readyState === WS.OPEN) {
                    ws.pong();
                    ws.lastPong = now;
                };
            } else {
                if( ws.badPings >= self.bpl) ws.close(1008, "TOO_MUCH_PINGS");
                else ws.badPings++;
            };
        });
        // OK
        self.emit("established", socket);
    };
    const errorHandler = function(error){ self.emit('server-error', error, this); };
    // OK Ready to GO?
    this.go = function () {
        // Analyse Yes and create Server(s)
        for (var _port in this.yes){
            _port = parseInt(_port) || null;
            var port =  ((typeof _port == 'number') && (0 < _port < 65536)) ? _port : 80;
            var server = new WS.Server({
                port: port,
                disableHixie: self.disableHixie,
                clientTracking: self.clientTracking,
                perMessageDeflate: self.perMessageDeflate,
                maxPayload: self.maxPayload,
                handleProtocols: protocolsHandler.bind(port),
                verifyClient: verifyClient.bind(self.servers.length)
            }, function(){
                console.log('YouYo! listening to ' + server.options.host + ' on ' + server.options.port);
                server.sockindex = {idi:{}, ipi:{}}; // Sockets by Id by Ip;
                server.broadcast = broadcast.bind(server);
                server.sendTo = sendTo.bind(server);
                server.on('connection', connectionHandler.bind(server) );
                server.on('error', errorHandler.bind(server) );
                self.servers.push(server);
            });
        };
        if(this.servers.length == 1) return this.servers[0];
            else return this.servers;
    };
    this.broadcastAll =  function (data, options) {
        var servers = self.servers;
        servers.forEach(function(server){
            server.clients.forEach(function each(client) {
                if (client.readyState === WS.OPEN)
                    client.send(data, options);
            });
        });
    };
};

// + We need to Emit!
YouYo.prototype = (require('events')).EventEmitter.prototype;
// Going Module
module.exports = YouYo; // YO!