'use strict';

const util = require('util');
const fs = require('fs');
const path = require('path');
const helper = require('./helper');

const installChaincode = async function (peers,chaincodeName, chaincodePath, username, orgName) {
  let error_message = null;
  try {
    const client = await helper.getClientForOrg(orgName, username);
    const tx_id = client.newTransactionID(true);
    const request = {
      targets: peers,
			chaincodePath: chaincodePath,
			chaincodeId: chaincodeName,
			chaincodeVersion: 'v1',
      chaincodeType: 'node',
      tx_id
    };
    console.log('Installing chaincode');
    const results = await client.installChaincode(request);
    console.log('Installed chaincode');
    const proposalResponses = results[0];
    
    let all_good = true;
    for(let i in proposalResponses) {
      let one_good = false;
      if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
        one_good = true;
      }
      all_good = all_good & one_good;
    }

    if (all_good) {
      console.log('Successfully sent install Proposal and received ProposalResponse');
    } else {
      error_message = 'Failed to send install Proposal or receive valid response. Response null or status is not 200';
      console.error(error_message);
    }
  } catch (err) {
    console.error('Failed to install due to error: ' + err.stack ? err.stack : err);
		error_message = err.toString();
  }

  if (!error_message) {
    const message = util.format('Successfully install chaincode');
    return {
      success: true,
			message
    }
  }
  const message = util.format('Failed to install due to: ' + error_message);
  return {
    message,
    success: false
  }
}

const instantiateChaincode = async function (peers, channelName, chaincodeName, username, orgName) {
  let error_message = null;
  let deployId = null;
  try {
    const client = await helper.getClientForOrg(orgName, username);
    const channel = await client.getChannel(channelName);
    if (!channel) {
      const message = util.format('Channel ' + channelName + ' was not defined in the connection profile');
      return {
        success: false,
        message
      }
    }

    const tx_id = client.newTransactionID(true);
    deployId = tx_id.getTransactionID();

    const request = {
      targets: peers,
      chaincodeId: chaincodeName,
      chaincodeType: 'node',
      chaincodeVersion: 'v1',
      txId: tx_id
    };

    const results = await channel.sendInstantiateProposal(request, 600000);
    let proposalResponses = results[0];
    let proposal = results[1];

    let all_good = true;
    for (let i in proposalResponses) {
      let one_good = false;
      if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
        one_good = true;
      }
      all_good = all_good & one_good;
    }

    if (all_good) {
      let promises = [];
      let event_hubs = channel.getChannelEventHubsForOrg();

      event_hubs.forEach((eh) => {
        const instantiateEventPromise = new Promise((resolve, reject) => {
          const event_timeout = setTimeout(() => {
						const message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
						console.error(message);
						eh.disconnect();
          }, 60000);
          eh.registerTxEvent(deployId, (tx_id, code, block_num) => {
            clearTimeout(event_timeout);

            if (code !== 'VALID') {
              const message = until.format('The chaincode instantiate transaction was invalid, code: ' + code);
							console.error(message);
							reject(new Error(message));
            } else {
              const message = 'The chaincode instantiate transaction was valid.';
							console.info(message);
							resolve(message);
            }
          }, (err) => {
            clearTimeout(event_timeout);
						console.error(err);
						reject(err);
          },
            {unregister: true, disconnect: true}
          );
          eh.connect();
        })
        promises.push(instantiateEventPromise);
      })

      const orderer_request = {
        txId: tx_id,
        proposalResponses,
        proposal
      }
      const sendPromise = channel.sendTransaction(orderer_request);
      promises.push(sendPromise);
      const results = await Promise.all(promises);
      const response = results.pop(); //  orderer results are last in the results
			if (response.status === 'SUCCESS') {
				console.info('Successfully sent transaction to the orderer.');
			} else {
				error_message = util.format('Failed to order the transaction. Error code: ' + response.status);
				console.debug(error_message);
      }
      
      for(let i in results) {
				const event_hub_result = results[i];
				const event_hub = event_hubs[i];
				console.debug('Event results for event hub ' + event_hub.getPeerAddr());
				if(typeof event_hub_result === 'string') {
					console.debug(event_hub_result);
				} else {
					if(!error_message) error_message = event_hub_result.toString();
					console.debug(event_hub_result.toString());
				}
			}
    } else {
      error_message = util.format('Failed to send Proposal and receive all good ProposalResponse');
			console.debug(error_message);
    }
  } catch (err) {
    console.error('Failed to send instantiate due to error: ' + err.stack ? err.stack : err);
		error_message = err.toString();
  }

  if (!error_message) {
		const message = util.format(
			'Successfully instantiate chaingcode in organization ' + orgName + ' to the channel ' + channelName);
      console.info(message);
		// build a response to send back to the REST caller
		return {
			success: true,
      message,
      deployId
		};
	} else {
		const message = util.format('Failed to instantiate. cause:%s',error_message);
		console.error(message);
		throw new Error(message);
	}
}

module.exports = {
  installChaincode,
  instantiateChaincode
}
