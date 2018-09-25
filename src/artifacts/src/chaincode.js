'use strict';
const shim = require('fabric-shim');
const util = require('util');

let UUID = {
  share: 0,
  proposal: 0,
  trade: 0
}

const getUUID = (key) => {
  UUID[key]++;
  return key + UUID[key];
}

const getTradeTypeKey = (key) => {
  return key + 'Proposals';
}

const Chaincode = class {
  async Init(stub) {
    console.info('============Instantiated Chaincode============');
    return shim.success();
  }

  async Invoke(stub) {
    const ret = stub.getFunctionAndParameters();
    console.info(ret);

    const method = this[ret.fcn];
    if (!method) {
      console.error('No function of name:' + ret.fcn + ' found');
      throw new Error('Received unknown function ' + ret.fcn + ' invocation');
    }

    try {
      const payload = await method(stub, ret.params);
      return shim.success(payload);
    } catch (err) {
      console.log(err);
      return shim.error(err);
    }
  }

  async createTrader(stub, args) {
    console.info('============START: CREATE TRADER============');
    if (args.length !== 3) {
      throw new Error('Incorrect number of arguments. Expecting Trader name, email and balance');
    }
  
    const trader = {
      docType: 'Trader',
      name: args[1],
      balance: args[2]
    }
  
    const result = await stub.putState(args[0], Buffer.from(JSON.stringify(trader)));
    console.log('result', result);
    console.info('============END: CREATE TRADER============');
  }

  async queryTrader(stub, args) {
    console.info('============START: QUERY TRADER============');
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting Trader email');
    }

    const email = args[0];
    const traderAsBytes = await stub.getState(email);
    if (!traderAsBytes || traderAsBytes.toString().length <= 0) {
      throw new Error(email + ' does not exist');
    }
    console.info(traderAsBytes.toString());
    console.info('============END: QUERY TRADER============');
    return traderAsBytes;
  }

  async createCompany(stub, args) {
    console.info('============START: CREATE COMPANY============');
    if (args.length !== 4) {
      throw new Error('Incorrect number of arguments. Expecting Company name, email, share count and owner');
    }
  
    const company = {
      docType: 'Company',
      name: args[1],
      issuedShareCount: args[2],
      owner: args[3]
    }
  
    const result = await stub.putState(args[0], Buffer.from(JSON.stringify(company)));
    console.log('result', result);
    console.info('============END: CREATE COMPANY============');
  }

  async queryCompany(stub, args) {
    console.info('============START: QUERY COMPANY============');
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting Company email');
    }

    const email = args[0];
    const companyAsBytes = await stub.getState(email);
    if (!companyAsBytes || companyAsBytes.toString().length <= 0) {
      throw new Error(email + ' does not exist');
    }
    console.info(companyAsBytes.toString());
    console.info('============END: QUERY COMPANY============');
    return companyAsBytes;
  }

  async createShare(stub, args) {
    console.info('============START: ISSUE SHARE ============');
    if (args.length !== 4) {
      throw new Error('Incorrect number of arguments. Expecting full share details');
    }

    const companyEmail = args[0];
    const ownerEmail = args[1];
    const companyAsBytes = await stub.getState(companyEmail);
    const company = JSON.parse(companyAsBytes.toString());
    if (company.owner !== ownerEmail) {
      throw new Error('Company owner is only allowed to issue shares');
    }

    const share = {
      docType: 'Share',
      company: companyEmail,
      owner: ownerEmail,
      price: args[2],
      count: args[3]
    }
  
    const shareKey = getUUID('share');
    await stub.putState(shareKey, Buffer.from(JSON.stringify(share)));
    const userAsBytes = await stub.getState(ownerEmail);
    console.log('userAsBytes', userAsBytes.toString());
    const user = JSON.parse(userAsBytes.toString());
    console.log('user', user)
    const shares = user.shares || [];
    shares.push(shareKey);
    user.shares = shares;
    await stub.putState(ownerEmail, Buffer.from(JSON.stringify(user)));
    console.info('============END: ISSUE SHARE ============');
  }

  async queryShare(stub, args) {
    console.info('============START: QUERY SHARE ============');
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting share id');
    }

    const shareId = args[0];
    const shareAsBytes = await stub.getState(shareId);
    if (!shareAsBytes || shareAsBytes.toString().length <= 0) {
      throw new Error(shareId + ' does not exist');
    }
    console.info(shareAsBytes.toString());
    console.info('============END: QUERY SHARE============');
    return shareAsBytes;
  }

  async createProposal(stub, args) {
    console.info('============START: CREATE PROPOSAL ============');
    if (args.length !== 5) {
      throw new Error('Incorrect number of arguments. Expecting full proposal details');
    }

    const proposal = {
      docType: 'Proposal',
      company: args[0],
      trader: args[1],
      price: args[2],
      count: args[3],
      tradeType: args[4]
    }
  
    const proposalKey = getUUID('proposal');
    await stub.putState(proposalKey, Buffer.from(JSON.stringify(proposal)));
    const userAsBytes = await stub.getState(proposal.trader);
    const user = JSON.parse(userAsBytes.toString());
    const tradeTypeKey = getTradeTypeKey(proposal.tradeType);
    const proposals = user[tradeTypeKey] || [];
    proposals.push(proposalKey);
    user[tradeTypeKey] = proposals;
    await stub.putState(proposal.trader, Buffer.from(JSON.stringify(user)));
    console.info('============END: CREATE PROPOSAL ============');
  }

  async queryProposal(stub, args) {
    console.info('============START: QUERY SHARE ============');
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting proposal id');
    }

    const proposalId = args[0];
    const proposalAsBytes = await stub.getState(proposalId);
    if (!proposalAsBytes || proposalAsBytes.toString().length <= 0) {
      throw new Error(proposalId + ' does not exist');
    }
    console.info(proposalAsBytes.toString());
    console.info('============END: QUERY SHARE============');
    return proposalAsBytes;
  }

  async createTrade(stub, args) {
    console.info('============START: CREATE TRADE ============');
    if (args.length !== 5) {
      throw new Error('Incorrect number of arguments. Expecting full proposal details');
    }

    const trade = {
      docType: 'Trade',
      buyer: args[0],
      seller: args[1],
      price: args[2],
      count: args[3],
      company: args[4]
    }
  
    const tradeKey = getUUID('trade');
    await stub.putState(tradeKey, Buffer.from(JSON.stringify(trade)));
    const sellerAsBytes = await stub.getState(trade.seller);
    const buyerAsBytes = await stub.getState(trade.buyer);
    const seller = JSON.parse(sellerAsBytes.toString());
    const buyer = JSON.parse(buyerAsBytes.toString());

    const sellerTransactions = seller.transactions || [];
    const buyerTransactions = buyer.transactions || [];
    sellerTransactions.push(tradeKey);
    buyerTransactions.push(tradeKey);
    seller.transactions = sellerTransactions;
    buyer.transactions = buyerTransactions;

    await stub.putState(trade.seller, Buffer.from(JSON.stringify(seller)));
    await stub.putState(trade.buyer, Buffer.from(JSON.stringify(buyer)));
    console.info('============END: CREATE TRADE ============');
  }

  async queryTrade(stub, args) {
    console.info('============START: QUERY TRADE ============');
    if (args.length !== 1) {
      throw new Error('Incorrect number of arguments. Expecting trade id');
    }

    const tradeId = args[0];
    const tradeAsBytes = await stub.getState(tradeId);
    if (!tradeAsBytes || tradeAsBytes.toString().length <= 0) {
      throw new Error(tradeId + ' does not exist');
    }
    console.info(tradeAsBytes.toString());
    console.info('============END: QUERY TRADE ============');
    return tradeAsBytes;
  }
}

shim.start(new Chaincode());
