var mongo = require('mongodb').MongoClient,
    restify = require('restify'),
    mongojs = require('mongojs'),
    server = restify.createServer();

server.post('/users', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});
 
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

var io = require('socket.io').listen(5000);

// var db = mongojs('mongodb://admin:happy2day@ds059661.mongolab.com:59661/hepva-test', ['users', 'messages']);
// var db = mongojs('mongodb://127.0.0.1:27017/hepva');
// var db_messages = db.collection('messages');
// var db_users = db.collection('users');
var db = mongojs('mongodb://127.0.0.1:27017/hepva', ['users', 'messages', 'rooms']);

// API for GET/POST to /users
server.listen(8080, function () {
  console.log("Server started @8080");
});

server.get("/", function (req, res, next) {
  res.send('Thank you for showing up here');
    return next();
});

server.get("/users", function (req, res, next) {
  db.users.find(function (err, users) {
      res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8'
      });
      res.end(JSON.stringify(users));
  });
  return next();
});

server.post('/users', function (req, res, next) {
  var user = req.params;
  db.users.save(user, function (err, data) {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify(data));
    res.end('User Added');
  });
  return next();
}); 

var myRoom, myName; 

// Socket.io connection
io.on('connection', function(socket) {
  console.log('user connected....');

  // User joins room
  socket.on('join room', function(data) {

    myRoom = data.user.userId + "_hepva";
    socket.name = data.user.name;
    socket.myRoom = data.user.userId + "_hepva";
    myName = data.user.name;

    db.users.save({userid: data.user.userId, name: socket.name, photo: data.user.photo, socket: socket.id})
    // person = data.user;
    // person.room = data.room;
    // people[data.room] = person;

    //Check if user has been to this room before
    db.rooms.find({room: myRoom}, function(err, doc) {
      if (doc.length > 0) {
        console.log('I have been here before');

        db.messages.find({room: myRoom}, function(err, doc) {
          socket.join(myRoom);
          io.to(myRoom).emit('old messages', doc);
        })

      } else {
        console.log('I have NEVER been here before');
        // set active = true on the room the user is joining
        db.rooms.save({room: myRoom });
        socket.join(myRoom)
      }

    });

    socket.broadcast.to(myRoom).emit('joined room', {user: data.user.name});

  }); 
  //END join room

  // Broadcast new message to room
  socket.on('new message', function(data) {
    var newData = data;
    newData.room = socket.myRoom;
    console.log("Users room : " + myRoom + ": " + socket.myRoom);

    db.messages.save(newData, function(err, data) {
      socket.broadcast.to(socket.myRoom).emit('latest', data);
    });

  }); 
  // END new message


  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function (data) {
    if (data) {
      socket.broadcast.to(myRoom).emit('typing', {
        user: data.user
      });
    } else {
      socket.broadcast.to(myRoom).emit('typing', {
        user: data.user
      });
    }
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.to(myRoom).emit('stop typing');
  });

  // User leaves a room
  socket.on('leave room', function() {
    console.log('leaving room...: ' + myRoom);

    // remove users from the online users collection
    db.users.remove({name: socket.name}, true, function() {
      socket.leave(myRoom);
      socket.broadcast.to(myRoom).emit('d', {name: socket.name});
      myRoom = '';
    })

  });
  // END leave room

  // Question for slack: how to a remember a user that just disconnected from the server, so i can update my online users lisy
  socket.on('disconnect', function () {
    console.log('user disconnected');
    db.users.remove({socket: socket.id}, true, function() {
      // echo globally that this client has left
      socket.broadcast.emit('user disconnected');
      myRoom = '';
    })
  });
  // END disconnect


//////
/////******** HEPVA BACKEND  **********//
////

  // check for online users
  socket.on('get users', function() {
    db.users.find(function(err, docs) {
      if (docs.length > 0) {
        io.emit('online users', docs);
      }
    })
  });

  // constantly check the online status
  socket.on('online', function(data) {
    db.users.find({company: data.company, active: true}, {active: 1, room: 1, _id: 0}, function(err, docs) {
      if (docs.length > 0) {
        db.messages.find({name: { $ne: data.name}}, function(err, msgs) {
          // if (msgs.length > 0) {
          //   io.emit('availabe chats', msgs);
          // }
          //console.log(msgs);
          io.emit('availabe chats', people);
        });

      }
    })
  });

  //Admin joins a user's room to talk to the user
  socket.on('join chat', function(data) {
    roomm = data.userid + "_hepva";
    // Retrieve old messages
    db.messages.find({room: roomm}, function(err, doc) {
      socket.join(roomm);
      socket.broadcast.to(roomm).emit('joined room', {user: data.user });
      io.to(roomm).emit('old messages', doc);
    })
    
  });

  // Broadcast admin message to room
  socket.on('admin message', function(data) {
    var newData = data;
    newData.room = roomm;
    console.log("Admin room: " + roomm);

    db.messages.save(newData, function(err, data) {
      socket.broadcast.to(roomm).emit('latest', data);
    });

  }); 
  // END new message




});

