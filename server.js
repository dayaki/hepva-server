var mongo = require('mongodb').MongoClient,
    client = require('socket.io').listen(8080).sockets;

mongo.connect('mongodb://127.0.0.1/hepva', function(err, db) {
  if (err) throw err;

  client.on('connection', function(socket) {
  	console.log(socket.id);
  	var col = db.collection('messages');

  	// Emit all messages
  	col.find().limit(50).sort({_id: 1}).toArray(function(err, res) {
  		if (err) throw err;
  		socket.emit('all', res);
  	});

    // wait for input
    socket.on('new message', function(data) {
    	var name = data.name,
    			message = data.message;

    	col.insert(data, function() {
    		console.log('Inserted');
    	})
    })
  });

});

