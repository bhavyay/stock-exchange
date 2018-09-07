const util = require('util');
const fs = require('fs');
const path = require('path');
const helper = require('./helper');

const createChannel = async function (channelName, channelConfigPath, username, orgName) {
  try {
    const client = await helper.getClientForOrg(orgName, username);
    const envelope = fs.readFileSync(path.join(__dirname, channelConfigPath));
    const channelConfig = client.extractChannelConfig(envelope);
    let signature = client.signChannelConfig(channelConfig);

    const request = {
			config: channelConfig,
			signatures: [signature],
			name: channelName,
			txId: client.newTransactionID(true) // get an admin based transactionID
    };
    
    const response = await client.createChannel(request);
    if (response && response.status === 'SUCCESS') {
      return {
				success: true,
				message: 'Channel \'' + channelName + '\' created Successfully'
			};
    } else {
      console.log('Failed to create the channel ' + channelName);
      throw new Error('Failed to create the channel ' + channelName);
    }
  } catch(err) {
    console.error('Failed to initialize the channel: ' + (err.stack ? err.stack : err));
    throw new Error('Failed to initialize the channel: ' + err.toString());
  }
}

const joinChannel = async function (channelName, peers, username, orgName) {
  var error_message = null;
  let all_eventhubs = [];
  try {
    const client = await helper.getClientForOrg(orgName, username);
    const channel = client.getChannel(channelName);
    if (!channel) {
      let message = util.format('Channel ' + channelName + ' was not defined in the connection profile');
      console.error(message);
			throw new Error(message);
    }

    let request = {
      txId: client.newTransactionID(true)
    }

    let promises = [];
    let block_registration_numbers = [];
    let genesis_block = await channel.getGenesisBlock(request);
    let event_hubs = client.getEventHubsForOrg(orgName);
    event_hubs.forEach((eh) => {
      const configBlockPromise = new Promise((resolve, reject) => {
        const event_timeout = setTimeout(() => {
					const message = 'REQUEST_TIMEOUT:' + eh._ep._endpoint.addr;
					console.error(message);
					eh.disconnect();
					reject(new Error(message));
        }, 60000);
        
        let block_registration_number = eh.registerBlockEvent((block) => {
          clearTimeout(event_timeout);

          if (block.data.data.length === 1) {
						// Config block must only contain one transaction
						const channel_header = block.data.data[0].payload.header.channel_header;
						if (channel_header.channel_id === channelName) {
							const message = util.format('EventHub ' + eh._ep._endpoint.addr + ' has reported a block update for channel ' + channelName);
							console.info(message)
							resolve(message);
						} else {
							const message = util.format('Unknown channel block event received from ' + eh._ep._endpoint.addr);
							console.error(message);
							reject(new Error(message));
						}
					}
        }, (err) => {
          clearTimeout(event_timeout);
					const message = 'Problem setting up the event hub: ' + err.toString();
					console.error(message);
					reject(new Error(message));
        });
        block_registration_numbers.push(block_registration_number);
        all_eventhubs.push(eh);
      });
      promises.push(configBlockPromise);
      eh.connect();
    });

    let join_request = {
      targets: peers,
      txId: client.newTransactionID(true),
      block: genesis_block
    }

    let join_promise = channel.joinChannel(join_request);
    promises.push(join_promise);
    
    let results = await Promise.all(promises);
    const peers_results = results.pop();

    for(let i in peers_results) {
			let peer_result = peers_results[i];
			if(peer_result.response && peer_result.response.status == 200) {
				console.info('Successfully joined peer to the channel ' + channelName);
			} else {
				let message = util.format('Failed to joined peer to the channel ' +  channelName);
				error_message = message;
				console.error(message);
			}
    }
    
    for(let i in results) {
			let event_hub_result = results[i];
			let event_hub = event_hubs[i];
			let block_registration_number = block_registration_numbers[i];
			console.info('Event results for event hub : ' + event_hub._ep._endpoint.addr);
			if(typeof event_hub_result === 'string') {
				console.info(event_hub_result);
			} else {
				if(!error_message) error_message = event_hub_result.toString();
				console.info(event_hub_result.toString());
			}
			event_hub.unregisterBlockEvent(block_registration_number);
		}
  } catch(err) {
    console.error('Failed to join channel due to error: ' + err.stack ? err.stack : err);
		error_message = err.toString();
  }

  all_eventhubs.forEach((eh) => {
		eh.disconnect();
  });
  
  if (!error_message) {
		const message = util.format('Successfully joined peers in organization' + orgName + 'to the channel: '+channelName);
		console.info(message);
		return {
			success: true,
			message: message
		};
	} else {
		const message = util.format('Failed to join all peers to channel. cause: ' + error_message);
		console.error(message);
		throw new Error(message);
	}
}

const getChannels = async function (peer, username, orgName) {
  try {
    const client = await helper.getClientForOrg(orgName, username);
    const response = await client.queryChannels(peer);
    if (response) {
			let channelNames = [];
			for (let i = 0; i < response.channels.length; i++) {
				channelNames.push('channel id: ' + response.channels[i].channel_id);
			}
			return response;
		} else {
			return 'response_payloads is null';
		}
  } catch (err) {
    console.error('Failed to query due to error: ' + err.stack ? err.stack : err);
		return err.toString();
  }
}

module.exports = {
  createChannel,
  joinChannel,
  getChannels
}
