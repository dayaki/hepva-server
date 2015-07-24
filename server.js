var mongo = require('mongodb').MongoClient,
    restify = require('restify'),
    mongojs = require('mongojs'),
    port = process.env.PORT || 3000,
    io = require('socket.io').listen(port),
    server = restify.createServer();
 
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

var db = mongojs('mongodb://127.0.0.1:27017/hepva', ['users']);

server.listen(port, function () {
  console.log("Server started @  port:" +port);
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
    // res.end(JSON.stringify(data));
    res.status(202).end();
  });
  return next();
});
