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
routes.post('/chaincode/transact', controller.invokeTransaction);
routes.post('/chaincode/query', controller.queryFromChaincode);

module.exports = routes;
