/*
// YouYo! Example
// Chatroom & Echo Server
// To test this script, plz take a look at 'Browser Test Client.htm' file.
*/

const YouYo = require('../YouYo.js');
var ydo = {
    // origins: ['appX','appY','file://'],
    // port : { pathX: { protocolY: function(message, flags){ var yo = this; } } },
    80 : {
        '/': {
            chatroom: function(message, flags){
                var socket = this;
                if( socket.id == undefined){
                    if( !flags.binary && message.length <= 20){
                        do {
                            socket.id = message;
                            if(!socket.id) { message += parseInt(Math.random()*100); };
                        } while (!socket.id);
                        return "You are On-Air. We call you: `" + socket.id + "`. Send direct messages: `user_id|message`" ;
                    } else return "Invalid Name.";
                } else {
                    if( !flags.binary ) {
                        if(message.indexOf("|") != -1){
                            // direct message:
                            var sending = message.split("|");
                            socket.emit(sending[0].trim(), "<strong>" + socket.id + "<strong> said: " + sending[1]);
                            // else broadcast message:
                        } else socket.broadcast("<strong>" + socket.id + "</strong>said: " + message);
                    } else return ("Server Recived " + message.length/1000 + " KB Binary Message. Not Suitable to Broadcast.");
                };
            },
            echo: function(message, flags){
                if( !flags.binary ) return ("Echo Server said: <strong>" + message + "</strong>");
                    else return ("Server Recived " + message.length/1000 + " KB Binary Message. Not Suitable to Broadcast.");
            } // etc...
        }
    }
};

var yoo = new YouYo(ydo);
yoo.cpip = 10; // x connections per ip
yoo.on('established', function(yo){
    yo.send("Hello Dear. We have "+ yo.wss.clients.length +" active members in this server [different sub-protocols].");
    if(yo.protocol == 'chatroom') yo.send("What's Your Name? [Max 20 chars plz]"); 
    if(yo.protocol == 'echo') yo.send("This is an Echo Server."); 
});
yoo.on('signed', function(id, yo){ yo.broadcast("We have New Member: `" + id + "`"); });
yoo.on('closed', function(wss, id, code, message){ if(id) wss.broadcast("`" + id + "` Leaved."); });
// yoo.on('message', console.log.bind(null, "message: ") );

var yoServer = yoo.go(); // returns Server(s)
console.log("Going YouYo!");