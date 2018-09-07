'use strict';

const path = require('path');
const util = require('util');
const hfc = require('fabric-client');

const getClientForOrg =  async function (userorg, username) {
  console.log('getClientForOrg: ***** START ' + userorg + ' ' + username);
  let config = '-connection-profile-path';
  let client = hfc.loadFromConfig(hfc.getConfigSetting('network' + config));
  client.loadFromConfig(hfc.getConfigSetting(userorg + config));
  await client.initCredentialStores();

  if (username) {
    let user = await client.getUserContext(username, true);
    if (!user) {
      // throw new Error(util.format('User was not found :', username));
    } else {
      console.log('User ' + username + ' was found to be registered and enrolled')
    }
  }
  console.log('getClientForOrg: ***** END ' + userorg, username);
  return client;
}

const getRegisteredUser = async function (userOrg, username, isJson = true) {
  try {
    const client = await getClientForOrg(userOrg, username);
    let user = await client.getUserContext(username, true);
    if (user && user.isEnrolled()) {
			console.info('Successfully loaded member from persistence');
		} else {
			// user was not enrolled, so we will need an admin user object to register
			console.info('User ' +  username + ' was not enrolled, so we will need an admin user object to register');
			var admins = hfc.getConfigSetting('admins');
			let adminUserObj = await client.setUserContext({username: admins[0].username, password: admins[0].secret});
			let caClient = client.getCertificateAuthority();
			let secret = await caClient.register({
				enrollmentID: username,
				affiliation: userOrg.toLowerCase() + '.department1'
			}, adminUserObj);
			console.info('Successfully got the secret for user ' + username);
			user = await client.setUserContext({username, password:secret});
			console.info('Successfully enrolled username ' + username + ' and setUserContext on the client object ');
		}
		if(user && user.isEnrolled) {
			if (isJson && isJson === true) {
				return {
					success: true,
					secret: user._enrollmentSecret,
					message: username + ' enrolled Successfully',
				};
			}
		} else {
			throw new Error('User was not enrolled');
		}
  } catch(err) {
    const message = 'Failed to get registered user: ' + username + ' with error: ' + err.toString();
    console.error(message);
		return message;
  }
}

const setupChaincodeDeploy = function() {
	process.env.GOPATH = path.join(__dirname, hfc.getConfigSetting('CC_SRC_PATH'));
};

module.exports = {
  getClientForOrg,
	getRegisteredUser,
	setupChaincodeDeploy
}