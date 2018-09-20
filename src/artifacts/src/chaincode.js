'use strict';
const shim = require('fabric-shim');
const util = require('util');

var SHARE_COUNT = 0;

const getSharekey = () => {
  SHARE_COUNT++;
  return 'SH' + SHARE_COUNT;
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
  
    const shareKey = getSharekey();
    await stub.putState(shareKey, Buffer.from(JSON.stringify(share)));
    const user = await stub.getState(ownerEmail);
    const shares = user.shares || [];
    shares.push(shareKey);
    user.shares = shares;
    await stub.putState(ownerEmail, user);
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
}

shim.start(new Chaincode());
