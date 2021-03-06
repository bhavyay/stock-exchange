const express = require('express');
const controller = require('./app/controller');
const routes = express.Router();

routes.get('/', function (req, res) {
  res.send({ status: 200, message: 'success' });
});

routes.post('/user', controller.createUser);

routes.post('/channel', controller.createChannel);
routes.post('/channel/join', controller.joinChannel);
routes.get('/channel', controller.getChannels);

routes.post('/chaincode/install', controller.installChaincode);
routes.post('/chaincode/instantiate', controller.instantiateChaincode);

routes.post('/trader/create', controller.createRecord('Trader'));
routes.post('/trader/fetch', controller.fetchRecord('Trader'));

routes.post('/company/create', controller.createRecord('Company'));
routes.post('/company/fetch', controller.fetchRecord('Company'));

routes.post('/share/create', controller.createRecord('Share'));
routes.post('/share/fetch', controller.fetchRecord('Share'));

routes.post('/proposal/create', controller.createRecord('Proposal'));
routes.post('/proposal/fetch', controller.fetchRecord('Proposal'));

routes.post('/transaction/create', controller.createRecord('Trade'));
routes.post('/transaction/fetch', controller.fetchRecord('Trade'));

module.exports = routes;
