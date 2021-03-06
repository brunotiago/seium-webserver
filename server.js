var cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {
	// Count the machine's CPUs
	var cpuCount = require('os').cpus().length;

	// Create a worker for each CPU
	for (var i = 0; i < cpuCount; i += 1) {
		cluster.fork();
	}
// Code to run if we're in a worker process
} else {
	var express = require('express');
	var mongoose = require('mongoose');
	var app = express();
	var server = require('http').Server(app);
	var bodyParser = require('body-parser');
	var jsonParser = bodyParser.json();
	var io = require('socket.io')(server);
	var eventSchema = require('./schemas/EventSchema');
	var mockedEventData = require('./mocks/mockedEventData');

	mongoose.connect('mongodb://127.0.0.1:27017/seium');

	//Create a schema for event
	var EventSchema = mongoose.Schema(eventSchema);

	//Create a model from the event schema
	var Event = mongoose.model('Event', EventSchema);

	//Allow CORS
	app.all('*', function (req, res, next) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
		if (req.method == 'OPTIONS') {
			res.status(200).end();
		} else {
			next();
		}
	});

	//Add some mocked events to the DB
	app.get('/setup', function (req, res) {
		mockedEventData.forEach(function (mockedEvent) {
			var newEvent = new Event(mockedEvent);
			//Call save to insert the event
			newEvent.save();
		});
		res.status(200).end();
	});

	//Delete all events from DB
	app.get('/delete', function (req, res) {
		Event.remove({}, function () {});

		res.status(200).end();
	});

	//Get all events in DB
	app.get('/events', function (req, res) {
		Event.find().exec(function (err, events) {
			if (err) {
				res.status(500).end();
			}
			res.json(events);
		});
	});

	//Get event by event ID
	app.get('/events/:eventId', function (req, res) {
		Event.findOne({
			'eventId': req.params.eventId
		}).exec(function (err, event) {
			if (event) {
				res.json(event);
			} else {
				res.status(404).end();
			}
		});
	});

	//Update an event by event ID
	app.put('/events/:eventId', jsonParser, function (req, res) {
		Event.findOneAndUpdate({'eventId': req.params.eventId}, req.body, {new: true}, function (err, updatedEvent) {
			if (err) {
				res.status(400).end();
			}
			if (updatedEvent) {
				io.in(req.params.eventId).emit('EVENT_UPDATE', updatedEvent);
				res.status(200).end();
			} else {
				res.status(404).end();
			}
		});
	});

	//Delete an event by event ID
	app.delete('/events/:eventId', function (req, res) {
		Event.remove({
			'eventId': req.params.eventId
		}).exec(function (err, cmdResult) {
			if (cmdResult.result.n !== 0) {
				res.status(200).end();
			} else {
				res.status(404).end();
			}
		});
	});

	//WS connection handler
	io.sockets.on('connection', function (socket) {
		//Handle client request to subscribe specific event updates
		socket.on('SUBSCRIBE_EVENT', function (data) {
			var eventId = data.eventId;
			socket.join(eventId);

			Event.findOne({
				'eventId': data.eventId
			}).exec(function (err, data) {
				socket.emit('EVENT_UPDATE', data);
			});
		});
	});

	//Start server at port 2015
	server.listen(2015);
	console.log('Server running at port 2015');
}




