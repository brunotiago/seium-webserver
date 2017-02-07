var express  = require('express');
var mongoose = require('mongoose');
var app      = express();
var server   = require('http').Server(app);
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var io       = require('socket.io')(server);

mongoose.connect("mongodb://127.0.0.1:27017/seium");

// create a schema for event
var EventSchema = mongoose.Schema({
  eventId: Number,
  competition: String,
  homeTeamName: String,
  awayTeamName: String,
  homeTeamScore: Number,
  awayTeamScore: Number,
  startTime: String,
  isInplay: Boolean,
  markets: Array
});

// create a model from the event schema
var Event = mongoose.model('Event', EventSchema);

// allow CORS
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});


//This route is simply run only on first launch just to generate some chat history
app.get('/setup', function(req, res) {
  //Array of chat data. Each object properties must match the schema object properties
  var eventData = [{
    eventId: 123234,
    competition: 'Primeira Liga',
    homeTeamName: 'FC Porto',
    awayTeamName: 'Sporting CP',
    homeTeamScore: 0,
    awayTeamScore: 0,
    startTime: '19:00',
    isInplay: false,
    markets: [{
          marketTitle: "Win-Draw-Win",
          outcomes: [{
            outcomeTitle: "",
            oddDecimal: 1.20
          },
          {
            outcomeTitle: "",
            oddDecimal: 2.00
          },
          {
            outcomeTitle: "",
            oddDecimal: 1.80
          }]
        },
        {
              marketTitle: "Both Teams To Score",
              outcomes: [{
                outcomeTitle: "Yes",
                oddDecimal: 1.67
              },
              {
                outcomeTitle: "No",
                oddDecimal: 2.10
              }]
            },
            {
                  marketTitle: "Result & Both To Score",
                  outcomes: [{
                    outcomeTitle: "FC Porto",
                    oddDecimal: 4.50
                  },
                  {
                    outcomeTitle: "Draw",
                    oddDecimal: 4.20
                  },
                  {
                    outcomeTitle: "Sporting CP",
                    oddDecimal: 5
                  }]
                }
      ]
  }];

  for (var c = 0; c < eventData.length; c++) {
    //Create an instance of the event model
    var newEvent = new Event(eventData[c]);
    //Call save to insert the event
    newEvent.save(function(err, savedEvent) {
      console.log(savedEvent);
    });
  }
  //Send a resoponse so the serve would not get stuck
  res.send('created');
});


app.get('/delete', function(req, res) {
    Event.remove( {}, function(err, savedChat) {
      console.log(savedChat);
    });

  res.send('deleted');
});


app.get('/events', function(req, res) {
  Event.find().exec(function(err, events) {
    res.json(events);
  });
});

app.get('/events/:eventId', function(req, res) {
  Event.findOne({
    'eventId': req.params.eventId
  }).exec(function(err, events) {
    res.json(events);
  });
});

app.put('/events/:eventId', jsonParser, function(req, res) {
  console.log(req.body);
  Event.update({'eventId': req.params.eventId}, req.body, function() {
  Event.findOne({
    'eventId': req.params.eventId
  }).exec(function(err, data) {
    io.in(req.params.eventId).emit('EVENT_UPDATE', data);
  });
});

  res.status(200).end();
});

io.sockets.on('connection', function(socket) {
  socket.on('SUBSCRIBE_EVENT', function(data) {
    var eventId = data.eventId;
    socket.join(eventId);

    Event.findOne({
      'eventId': data.eventId
    }).exec(function(err, data) {
      io.in(eventId).emit('EVENT_UPDATE', data);
    });
  });
});

server.listen(2015);
console.log('It\'s going down in 2015');
