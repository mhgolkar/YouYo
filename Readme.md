# YouYo!
WebSocket Wrapper for [WS](https://github.com/websockets/ws) library
* Minimalist
* Dynamic Sub-Protocols
* Communication with Clients by 'Id'
* Some Security Options (Connections per ip, ...)
* Configurable Automatic Ping/Pong Handling

### Getting Started
#### Installation
YouYo! is released on npm and can be installed using:
```
npm install youyo --save
```
YouYo is dependent on [ws](https://www.npmjs.com/package/ws) package.
#### Usage (Practice A)
1. Require: `const YouYo = require('YouYo')`.
2. Createing a YouYo Definer Object:
```
var ydo = {
	// Definer Pattern:
	origins: ['appX','appY','file://'], // Optional
	portN : {
    	pathX: { 
    		protocolY: function(message, flags){
            	var yo = this; // YouYo Socket
                return xyz; // object, string, buffer
            }
    	}
    }
}
```
3. Initialize: `var yoo = new YouYo(ydo);`.
4. Ignite: `yoo.go(); // Returns server(s) for each port`
##### Sample: Broadcast Server
```
const YouYo = require('YouYo');
var yoo = new YouYo({
    80:{
        '/':{
            broadcast: function(message, flags){
                if( !flags.binary ) this.broadcast(message);
                var onlines = this.wss.clients.length;
                return 'Your Message Broadcasted to '+ onlines +' Users' ;
            }
        }
    }
});
yoo.cpip = 10; // connection per ip;
yoo.go();
```

#### Usage (Practice B)
1. Require: `const YouYo = require('YouYo')`.
2. Createing a YouYo Server on port 'x' : ` var yoo = new YouYo(x); yoo.go();`
##### Sample: Echo Server
```
const YouYo = require('YouYo');
var yoo = new YouYo(80);
yoo.on('message', function(yo, message, flags){
	if( !flags.binary ) yo.send(message);
    else yo.send(message.length + ' Bytes Binary Message Received.');
});
yoo.go();
```  

**For more detailed examples, please take a look at:** [[git-repo]/Examples](https://github.com/mhgolkar/YouYo/tree/master/Examples)

### Api
Instance of `YouYo` (yoo):  
* `.go()`: Ignition. Passes WS Server(s array) for each port. + each server has `.broadcast()` & `.sendTo()`.
* `.broadcastAll(data, options)`: to all clients of all servers (ports).
* `.servers`: Array of WS Servers.
* `.timeout`: Socket Timeout - Milliseconds (Default 5 Minutes)
* `.mask`: Mask data frames? (False)
* `.compress`: Compressing data frames? (False)
* `.cpip`: Connections per ip (3)
* `.ppi`: Automatic Ping/Pong intervals (Default: 1 minutes)
* `.pol`: At Least x Milliseconds Before Next Pong (Default: 1 Minutes)
* `.pil`: x Missed Pings Toleration Limit (2)
* `.bpl`: Max Bad Pings Limit >> client sends too much pings related to last pong and `.pol` (5)
* `.dosLimit`: After n Wrong Attempts >> Possibly attacker (3)
* `.dosTimer`: Delay for Next Handshake (after n wrong attempts) - Milliseconds (Default 1 Minutes)
* `.freePath`: Accept connection to any path? [Boolean]
* `.origins` = []; // accepted origins (Empty Array == Any)   
* `.secure` [Boolean] true if `req.connection.authorized` or `req.connection.encrypted` should be set to verify client.
* Ws[s] Options:
  * `.disableHixie` // true;
  * `.clientTracking` // true;
  * `.perMessageDeflate` // true;
  * `.maxPayload` // Bytes - Default: 1MB

Instance of `yo` (YouYo socket):  
* `.send(data, options, cb)` // options{mask, binary, compress [All Boolean] }
* `.id`  Unique id in related server [setter/getter]
* `.sendTo(user_id_in_server, data, option, cb)`
* `.broadcast(data, options)` // to All Other Clients [of related server(port)]
* `.broadcastPath(data, options)` // to All Other Clients [of related path]
* `.broadcastPrtcl(data, options)` // to All Other Clients [of related path & protocol]
* `.ws`  [this websocket]
* `.wss` [related server]
* `.wss.broadcast(data, options)` // to All Clients of server (port)
* `.wss.sendTo(user_id_in_server, data, option, cb)`

### Events
Instance of `YouYo` is Event Emitter:
* `established`: Socket Connection Established. Passes socket `yo`.  
* `signed`: Socket id had been set. Passes id and socket `yo`.  
* `message`: Recived data is ready to use. passes socket `yo`, data & flags (binary[boolean], masked[boolean], buffer).  
* `closed`: Socket's completely closed; Destroyed. passes related server, socket id, status code & message.  
* `server-error`: passes error and websocket-server (istance of wss).  
* `socket-error`: passes error and socket `yo`.  