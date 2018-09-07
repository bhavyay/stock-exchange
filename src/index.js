'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const api_routes = require('./api_routes');
const app = express();

require('./config.js');
const hfc = require('fabric-client');

const host = process.env.HOST || hfc.getConfigSetting('host');
const port = process.env.PORT || hfc.getConfigSetting('port');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
  res.send('Test');
});

app.use('/api/', api_routes);

const server = http.createServer(app).listen(port, function() {
  console.log(`Listening on port ${host} ${port}`)
});
server.timeout = 240000;
