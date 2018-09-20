'use strict';

const path = require('path');
const fs = require('fs');
const util = require('util');
const hfc = require('fabric-client');
const helper = require('./helper.js');

const invokeTransaction = async function (peers, channelName, chaincodeName, fcn, args, username, orgName) {
	let error_message = null;
	let tx_id_string = null;
	try {
		const client = await helper.getClientForOrg(orgName, username);
		const channel = client.getChannel(channelName);
		if(!channel) {
			const message = util.format('Channel %s was not defined in the connection profile', channelName);
			console.error(message);
			throw new Error(message);
		}
		const tx_id = client.newTransactionID();
		tx_id_string = tx_id.getTransactionID();

		const request = {
			targets: peers,
			chaincodeId: chaincodeName,
			fcn: fcn,
			args: args,
			chainId: channelName,
			txId: tx_id
		};

		const results = await channel.sendTransactionProposal(request);

		let proposalResponses = results[0];
		let proposal = results[1];

		let all_good = true;
		for (var i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status == 200) {
				one_good = true;
			}
			all_good = all_good & one_good;
		}

		if (all_good) {
			let promises = [];
			let event_hubs = channel.getChannelEventHubsForOrg();
			event_hubs.forEach((eh) => {
				const invokeEventPromise = new Promise((resolve, reject) => {
					const event_timeout = setTimeout(() => {
						const message = 'REQUEST_TIMEOUT:' + eh.getPeerAddr();
						console.error(message);
						eh.disconnect();
					}, 3000);
					eh.registerTxEvent(tx_id_string, (tx, code, block_num) => {
						clearTimeout(event_timeout);
	
						if (code !== 'VALID') {
							const message = util.format('The invoke chaincode transaction was invalid, code ' + code);
							console.error(message);
							reject(new Error(message));
						} else {
							const message = 'The invoke chaincode transaction was valid.';
							console.info(message);
							resolve(message);
						}
					}, err => {
						clearTimeout(event_timeout);
						console.error(err);
						reject(err);
					},
						{unregister: true, disconnect: true}
					);
					eh.connect();
				});
				promises.push(invokeEventPromise);
			});

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
				console.info(response);
			} else {
				error_message = util.format('Failed to order the transaction. Error code: ' + response.status);
				console.info(error_message);
			}

			for(let i in results) {
				let event_hub_result = results[i];
				let event_hub = event_hubs[i];
				console.info('Event results for event hub : ' + event_hub.getPeerAddr());
				if(typeof event_hub_result === 'string') {
					console.info(event_hub_result);
				} else {
					if(!error_message) error_message = event_hub_result.toString();
					console.info(event_hub_result.toString());
				}
			}
		} else {
			error_message = util.format('Failed to send Proposal and receive all good ProposalResponse');
			console.info(error_message);
		}
	} catch (err) {
		console.error('Failed to invoke due to error: ' + err.stack ? err.stack : err);
		error_message = err.toString();
	}

	if (!error_message) {
		const message = util.format('Successfully invoked the chaincode ' + orgName + ' to the channel ' +  channelName + ' for transaction ID: ' + tx_id_string);
		console.info(message);
		return tx_id_string;
	} else {
		const message = util.format('Failed to invoke chaincode. cause: ' + error_message);
		console.error(message);
		throw new Error(message);
	}
}

const queryFromChaincode = async function (peer, channelName, chaincodeName, fcn, args, username, orgName) {
	try {
		const client = await helper.getClientForOrg(orgName, username);
		const channel = client.getChannel(channelName);
		if (!channel) {
			const message = util.format('Channel ' + channelName +  ' was not defined in the connection profile');
			console.error(message);
			throw new Error(message);
		}

		const request = {
			targets: [peer],
			chaincodeId: chaincodeName,
			fcn,
			args
		}

		const response_payloads = await channel.queryByChaincode(request);
		if (response_payloads) {
			for (let i = 0; i < response_payloads.length; i++) {
				console.info(args[0]+' now has ' + response_payloads[i].toString('utf8'));
			}
			return JSON.stringify({ user: args[0], payload: response_payloads[0].toString('utf8')});
		} else {
			console.error('response_payloads is null');
			return 'response_payloads is null';
		}
	} catch(err) {
		console.error('Failed to query due to error: ' + err.stack ? err.stack : err);
		return err.toString();
	}
}

module.exports = {
	invokeTransaction,
	queryFromChaincode
};
