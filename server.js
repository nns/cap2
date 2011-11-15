
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();
var sio = require('socket.io');
var formidable = require('formidable');
var fs = require('fs');


// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

var public_dir = '/public';
var file_dir = '/files'
var file_dir_full = __dirname + public_dir + file_dir;


// Routes


app.post('/upload', function(req, res){
  var form = new formidable.IncomingForm(),
      files = [],
      fields = [];
  form.uploadDir = file_dir_full;
  var fileName;
  form
    .on('field', function(field, value) {
    //console.log(field, value);
    fields.push([field, value]);
    })
  .on('file', function(field, file) {
    //console.log(field, file);
    //console.log(file.name);
    fileName = file.name;
    files.push([field, file]);
    })
  .on('end', function() {
    //console.log('-> upload done');
    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('ok');
    res.end();
    
    //io
    var ll = {name:fileName,path:file_dir + '/' + fileName};
    io.sockets.emit('ref',ll);
    //console.log('emit');
    
  });
  form.parse(req);
  
});

app.get('/', function(req, res){
  res.render('index');
});

app.get('/viewer', function(req, res){
  res.render('view');
});

if(process.env.PORT){
    app.listen(process.env.PORT);
} else {
    app.listen(3000);
}

var io = sio.listen(app);
io.configure(function () {
  io.set('log level', 1); 
  io.set('transports', [
    'websocket'
    //'flashsocket'
    ,'htmlfile'
    ,'xhr-polling'
    , 'jsonp-polling'
  ]);
});
var users = {};
io.sockets.on('connection', function(socket){
    console.log('connection' + socket.id);
    //console.log(socket);
    //console.log(socket.handshake.address);
    var newUser = {id:socket.id,name:socket.handshake.address.address};
    console.log(newUser);
    users[socket.id] = newUser;
    socket.on('init',function(data){
      load(socket);
    });
    
    
    socket.emit('addUser',users);
    socket.broadcast.emit('addUser',{id:newUser});
    
    socket.on('disconnect',function(){
      console.log('disconnect' + socket.id);
      delete users[socket.id];
      socket.broadcast.emit('rmUser',socket.id);
    });
});

function load(socket){
  fs.readdir(file_dir_full, function(err, files) {
      if(err){
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.write(err + '\n');
        res.end();
        return;
      }
      for(var i in files){
        //console.log(files[i]);
        var ll = {name:files[i],path:file_dir + '/' + files[i]};
        socket.emit('ref',ll);
      }
  });
}


console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

process.on('uncaughtException', function (err) {
    console.log('uncaughtException => ' + err);
});