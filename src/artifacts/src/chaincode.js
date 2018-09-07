'use strict';
const shim = require('fabric-shim');
const util = require('util');

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
    if (args.length !== 3) {
      throw new Error('Incorrect number of arguments. Expecting Company name, email, share count and owner');
    }
  
    const company = {
      docType: 'Trader',
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
}

shim.start(new Chaincode());
