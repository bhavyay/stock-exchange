const channel = require('./channel');
const chaincode = require('./chaincode');
const helper = require('./helper');
const query = require('./query');

exports.createUser = async function (req, res, next) {
  const params = req.body;
  const { orgName, userName } = params;
  await helper.getRegisteredUser(orgName, userName);
  res.send({ status: 200, success: true });
}

exports.createChannel = async function (req, res, next) {
  const { channelName, channelConfigPath, userName, orgName } = req.body;
  const message = await channel.createChannel(channelName, channelConfigPath, userName, orgName);
  res.send({ status: 200, message });
}

exports.joinChannel = async function (req, res, next) {
  const { channelName, userName, orgName, peers } = req.body;
  const message = await channel.joinChannel(channelName, peers, userName, orgName);
  res.send({ status: 200, message });
}

exports.getChannels = async function (req, res, next) {
  const { userName, orgName, peer } = req.query;
  const message = await channel.getChannels(peer, userName, orgName);
  res.send({ status: 200, message });
}

exports.installChaincode = async function (req, res, next) {
  const { peers, chaincodeName, chaincodePath, userName, orgName } = req.body;
  const message = await chaincode.installChaincode(peers, chaincodeName, chaincodePath, userName, orgName);
  res.send({ status: 200, message });
}

exports.instantiateChaincode = async function (req, res, next) {
  const { peers, chaincodeName, userName, orgName, channelName } = req.body;
  const message = await chaincode.instantiateChaincode(peers, channelName, chaincodeName, userName, orgName);
  res.send({ status: 200, message });
}

exports.invokeTransaction = async function (req, res, next) {
  try {
    const { peers, chaincodeName, userName, orgName, channelName, functionName, args } = req.body;
    const message = await query.invokeTransaction(peers, channelName, chaincodeName, functionName, args, userName, orgName);
    res.send({ status: 200, message });
  } catch(err) {
    res.send({ status: 500, message: err});
  }
}

exports.queryFromChaincode = async function (req, res, next) {
  try {
    const { peer, chaincodeName, userName, orgName, channelName, functionName, args } = req.body;
    const message = await query.queryFromChaincode(peer, channelName, chaincodeName, functionName, args, userName, orgName);
    res.send({ status: 200, message });
  } catch(err) {
    res.send({ status: 500, message: err});
  }
}