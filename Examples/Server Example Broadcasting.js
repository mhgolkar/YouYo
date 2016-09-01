/*
// YouYo! Example
// Broadcasting Server
// To test this script, plz take a look at 'Browser Test Client.htm' file. 
// + NOTE: Don't choose 'Protocol' for this example. Play with `server [path]` try(x) in 'ws://localhost/serverX'.
*/

const YouYo = require('../YouYo.js');
// Init...
var yoo = new YouYo(80);
yoo.cpip = 10; // Connections per ip
yoo.freePath = true; // client can connect to any path

// Broadcasting Handler
var onAir = function(yo, message, flags){
    if( yo.id == undefined){
        if( !flags.binary && message.length <= 20){
            do {
                yo.id = message;
                if(!yo.id) { message += parseInt(Math.random()*100); };
            } while (!yo.id);
            yoo.broadcastAll("New User: "+ yo.id);
            yo.send("Now You are on-Air " + yo.id);
            yo.send("Broadcasting Instruction: target|message. targets: 'server', 'path', user_id.");
        } else yo.send("Invalid Name.");
    } else {
        if( !flags.binary ) {
            if(message.indexOf("|") != -1){
                // direct message:
                var sending = message.split("|");
                switch( sending[0].trim() ){
                        // targets
                    case 'server':
                        yo.broadcast("<strong>" + yo.id + "<strong> said: " + sending[1]);
                        break;
                    case 'path':
                        yo.broadcastPath("<strong>" + yo.id + "<strong> said: " + sending[1]);
                        break;
                    default:
                        var sent = yo.sendTo(sending[0].trim(), "<strong>" + yo.id + "<strong> said: " + sending[1]);
                        if (sent === false) yo.send("invalid target: "+ sending[0].trim());
                        break;
                };
            } else yo.send("Target Please")
        } else yo.send("Server Recived " + message.length/1000 + " KB Binary Message. Not Suitable to Broadcast.");
    };   
};
yoo.on('message', onAir);

// The Others
yoo.on('established', function(yo) {
    yo.send("Welcome Dude! Whats your name? [Max 20 Chars]");
} );
yoo.on('closed', function(wss, id, code, message){
    var the_id = id ? id : "Anonymous";
    wss.broadcast("someone leaved this server: "+the_id) // to related server
});
yoo.go();