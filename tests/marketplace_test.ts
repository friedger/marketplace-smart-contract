import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.7.1/index.ts';
import { assertEquals } from 'https://deno.land/std@0.199.0/testing/asserts.ts';

const CONTRACT_MP = 'marketplace';
const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.marketplace';
const CONTRACT_OWNER = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const FNC_CREATE_GIG = 'create-gig';
const FNC_ACCEPT_GIG = 'accept-gig';
const FNC_DECLINE_GIG = 'decline-gig';
const FNC_GET_GIG = 'get-gig';
const FNC_SATISFACTION_AS_CLIENT = 'satisfaction-vote-gig-as-client';
const FNC_ACCEPTANCE_AS_ARTIST = 'satisfaction-acceptance-as-artist';
const FNC_DAO_SATISFACTION = 'dao-vote-satisfaction';
const FNC_SEND_TO_DISPUTE_TIME = 'send-to-dispute-passed-time-acceptance';
const FNC_SEND_TO_DISPTUTE_PARTICIPANT = 'send-to-dispute';
const FNC_CHECK_IS_EXPIRED = 'check-is-expired';
const FNC_CAN_REDEEM = 'can-redeem';
const FNC_REDEEM_BACK = 'redeem-back';

const ERR_NOT_FOUND = 404;

const ERR_NOT_ARTIST = 405;
const ERR_NOT_CLIENT = 406;
const ERR_NOT_DAO = 407;
const ERR_NOT_PARTICIPANT = 408;

const ERR_EXPIRED = 409;
const ERR_INVALID_SATISFACTION = 410;

const ERR_NOT_PENDING = 411;
const ERR_NOT_REDEEMABLE = 412;
const ERR_NOT_ACCEPTED = 413;
const ERR_NOT_ACCEPTANCE = 414;
const ERR_NOT_DISPUTED = 415;
const ERR_NOT_EXPIRED = 416;

const COMMISSION = 0.025;

const VOTE_1 = 'strongly-agree';
const VOTE_2 = 'agree';
const VOTE_3 = 'somewhat-agree';
const VOTE_4 = 'disagree';

// name: 'Ensure that client can start gig and send money',
Clarinet.test({
  name: 'Ensure that client can start gig and send money',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    // transfer stx to sm when creating a gig
    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);
  },
});

// name: 'Ensure that client can read-only created gig',
Clarinet.test({
  name: 'Ensure that client can read-only created gig',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    // transfer stx to sm when creating a gig
    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    let gig = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(1)], wallet_1.address);

    assertEquals(
      gig.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u1, block-created: u1, block-disputed: u1, completely-paid: false, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "initialized", satisfaction-disputed: "initialized", status: "pending", to: ${
        wallet_2.address
      }}`
    );
  },
});

// name: 'Ensure that two clients can start three gigs and send money, and next block send again to others',
Clarinet.test({
  name: 'Ensure that two clients can start three gigs and send money, and next block send again to others',
  // block 1
  // w1 -> w2
  // w1 -> w3
  // w2 -> w4
  // block 2
  // w1 -> w5
  // w2 -> w5
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const wallet_4 = accounts.get('wallet_4')!;
    const wallet_5 = accounts.get('wallet_5')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_3.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_4.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_2.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    block.receipts[1].result.expectOk().expectUint(2);
    assertEquals(block.receipts[1].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[1].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[1].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[1].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[1].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[1].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[1].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[1].events[1].stx_transfer_event.memo, '');

    block.receipts[2].result.expectOk().expectUint(3);
    assertEquals(block.receipts[2].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[2].events[0].stx_transfer_event.sender, wallet_2.address);
    assertEquals(block.receipts[2].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[2].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[2].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[2].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[2].events[1].stx_transfer_event.sender, wallet_2.address);
    assertEquals(block.receipts[2].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[2].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[2].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 3);
    assertEquals(block.height, 2);

    block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_5.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_5.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_2.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectUint(4);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    block.receipts[1].result.expectOk().expectUint(5);
    assertEquals(block.receipts[1].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, wallet_2.address);
    assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[1].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[1].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[1].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[1].events[1].stx_transfer_event.sender, wallet_2.address);
    assertEquals(block.receipts[1].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[1].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[1].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 3);
  },
});

// name: 'Ensure that client sends funds and artist declines returning money',
Clarinet.test({
  name: 'Ensure that client sends funds and artist declines returning money',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
      assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 2);
    }
    // decline and return stx to client
    block = chain.mineBlock([Tx.contractCall(CONTRACT_MP, FNC_DECLINE_GIG, [types.uint(1)], wallet_2.address)]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, deployer.address + '.' + CONTRACT_MP);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, wallet_1.address);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 3);
    }
  },
});

// name: "Ensure that artist cannot decline inexistent gig, someone's else gig or one which is not pending",
Clarinet.test({
  name: "Ensure that artist cannot decline inexistent gig, someone's else gig or one which is not pending",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_DECLINE_GIG, [types.uint(2)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_DECLINE_GIG, [types.uint(1)], wallet_3.address),
      Tx.contractCall(CONTRACT_MP, FNC_DECLINE_GIG, [types.uint(1)], wallet_2.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ERR_NOT_FOUND);
    block.receipts[1].result.expectErr().expectUint(ERR_NOT_ARTIST);
    block.receipts[2].result.expectOk().expectUint(1);
    assertEquals(block.receipts.length, 3);
    assertEquals(block.height, 3);

    block = chain.mineBlock([Tx.contractCall(CONTRACT_MP, FNC_DECLINE_GIG, [types.uint(1)], wallet_2.address)]);
    block.receipts[0].result.expectErr().expectUint(ERR_NOT_PENDING);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 4);
  },
});

// name: 'Ensure that artist can accept gig',
Clarinet.test({
  name: 'Ensure that artist can accept gig',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
      assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 2);
    }
    // accept work
    block = chain.mineBlock([Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address)]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 3);
    }

    // read only accepted gig
    let gig = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(1)], wallet_1.address);
    assertEquals(
      gig.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u1, completely-paid: false, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "initialized", satisfaction-disputed: "initialized", status: "accepted", to: ${
        wallet_2.address
      }}`
    );
  },
});

// name: 'Ensure that artist cannot accept inexistent gig, someone's else gig or one which is not pending',
Clarinet.test({
  name: "Ensure that artist cannot accept inexistent gig, someone's else gig or one which is not pending",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(2)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_3.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ERR_NOT_FOUND);
    block.receipts[1].result.expectErr().expectUint(ERR_NOT_ARTIST);
    block.receipts[2].result.expectOk().expectUint(1);
    assertEquals(block.receipts.length, 3);
    assertEquals(block.height, 3);

    block = chain.mineBlock([Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address)]);
    block.receipts[0].result.expectErr().expectUint(ERR_NOT_PENDING);
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 4);
  },
});

// the payment is voted vote-1 and money go to artist with it ended
// name: 'Ensure that client can vote strongly-agree',
Clarinet.test({
  name: 'Ensure that client can vote strongly-agree',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
      assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 2);
    }
    // accept work
    block = chain.mineBlock([Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address)]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 3);
    }

    // vote work as vote-1
    // accept work
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(1), types.ascii(VOTE_1)], wallet_3.address),
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(1), types.ascii(VOTE_1)], wallet_1.address),
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(1), types.ascii(VOTE_2)], wallet_1.address),
    ]);
    {
      block.receipts[0].result.expectErr().expectUint(ERR_NOT_CLIENT);
      block.receipts[1].result.expectOk().expectBool(true);
      block.receipts[2].result.expectErr().expectUint(ERR_NOT_ACCEPTED);
      assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
      assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, wallet_2.address);
      assertEquals(block.receipts[1].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts.length, 3);
      assertEquals(block.height, 4);
    }

    // read-only completed
    let gig = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(1)], wallet_1.address);
    assertEquals(
      gig.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u1, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "strongly-agree", satisfaction-disputed: "initialized", status: "completed", to: ${
        wallet_2.address
      }}`
    );
  },
});

// ensure that nobody else, besides the client, can vote the satisfaction level
Clarinet.test({
  name: 'Ensure that client can vote strongly-agree',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
      assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 2);
    }
    // try to accept before gig being accepted
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(1), types.ascii(VOTE_1)], wallet_1.address),
    ]);
    {
      block.receipts[0].result.expectErr().expectUint(ERR_NOT_ACCEPTED);
      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 3);
    }

    // accept work
    block = chain.mineBlock([Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address)]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 4);
    }

    // vote work as vote-1
    // accept work
    block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_SATISFACTION_AS_CLIENT,
        [types.uint(1), types.ascii('invalid-satisfaction')],
        wallet_1.address
      ),
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(1), types.ascii(VOTE_1)], wallet_3.address),
    ]);
    {
      block.receipts[0].result.expectErr().expectUint(ERR_INVALID_SATISFACTION);
      block.receipts[1].result.expectErr().expectUint(ERR_NOT_CLIENT);
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 5);
    }
  },
});

// case client pick satisfaction and artist accepts
// case succesfull vote-2 paid
// case succesfull vote-3 paid
// name: 'Ensure that creator can accept payment from middle satisfaction vote',
Clarinet.test({
  name: 'Ensure that creator can accept payment from middle satisfaction vote',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_3.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    {
      //   console.log(block.receipts[0].events);
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
      assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 2);
    }
    // accept work
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(2)], wallet_3.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 3);
    }

    // vote work as vote-2 and vote-3
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(1), types.ascii(VOTE_2)], wallet_1.address),
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(2), types.ascii(VOTE_3)], wallet_1.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 4);
    }

    // acceptance true for satisfaction vote
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPTANCE_AS_ARTIST, [types.uint(1), types.bool(true)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPTANCE_AS_ARTIST, [types.uint(2), types.bool(true)], wallet_3.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      //   stx transfer events for gig_1
      {
        assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, wallet_2.address);
        assertEquals(
          block.receipts[0].events[0].stx_transfer_event.amount,
          `${(75 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
        assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(
          block.receipts[0].events[1].stx_transfer_event.amount,
          `${(25 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      }

      //   stx transfer events for gig_2
      {
        assertEquals(block.receipts[1].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, wallet_3.address);
        assertEquals(
          block.receipts[1].events[0].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[1].events[0].stx_transfer_event.memo, '');
        assertEquals(block.receipts[1].events[1].type, 'stx_transfer_event');
        assertEquals(block.receipts[1].events[1].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[1].events[1].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(
          block.receipts[1].events[1].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[1].events[1].stx_transfer_event.memo, '');
      }
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 5);
    }

    // read-only completed
    let gig = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(1)], wallet_1.address);
    assertEquals(
      gig.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u1, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "${VOTE_2}", satisfaction-disputed: "initialized", status: "completed", to: ${
        wallet_2.address
      }}`
    );
    let gig2 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(2)], wallet_1.address);
    assertEquals(
      gig2.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u1, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "${VOTE_3}", satisfaction-disputed: "initialized", status: "completed", to: ${
        wallet_3.address
      }}`
    );
  },
});

// case vote-2 -> in dispute -> fair
// case vote-3 -> in dispute -> fair

// artist vote no
// contract-owner says same satisfaction
// updatesatisfaction-disputed

Clarinet.test({
  name: 'Ensure that dao can vote the same as client and those amounts are sent',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_3.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    {
      //   console.log(block.receipts[0].events);
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
      assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 2);
    }
    // accept work
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(2)], wallet_3.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 3);
    }

    // vote work as vote-2 and vote-3
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(1), types.ascii(VOTE_2)], wallet_1.address),
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(2), types.ascii(VOTE_3)], wallet_1.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 4);
    }

    // acceptance false for satisfaction vote
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPTANCE_AS_ARTIST, [types.uint(1), types.bool(false)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPTANCE_AS_ARTIST, [types.uint(2), types.bool(false)], wallet_3.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 5);

    // dao vote same
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(1), types.ascii(VOTE_2)], deployer.address),
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(2), types.ascii(VOTE_3)], deployer.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);

      //   stx transfer events for gig_1
      {
        assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, wallet_2.address);
        assertEquals(
          block.receipts[0].events[0].stx_transfer_event.amount,
          `${(75 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
        assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(
          block.receipts[0].events[1].stx_transfer_event.amount,
          `${(25 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      }

      //   stx transfer events for gig_2
      {
        assertEquals(block.receipts[1].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, wallet_3.address);
        assertEquals(
          block.receipts[1].events[0].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[1].events[0].stx_transfer_event.memo, '');
        assertEquals(block.receipts[1].events[1].type, 'stx_transfer_event');
        assertEquals(block.receipts[1].events[1].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[1].events[1].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(
          block.receipts[1].events[1].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[1].events[1].stx_transfer_event.memo, '');
      }
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 6);
    }

    // read-only completed
    let gig = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(1)], wallet_1.address);
    assertEquals(
      gig.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u4, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "${VOTE_2}", satisfaction-disputed: "${VOTE_2}", status: "completed", to: ${
        wallet_2.address
      }}`
    );
    let gig2 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(2)], wallet_1.address);
    assertEquals(
      gig2.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u4, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "${VOTE_3}", satisfaction-disputed: "${VOTE_3}", status: "completed", to: ${
        wallet_3.address
      }}`
    );
  },
});

// (asserts! (is-eq tx-sender (var-get contract-owner)) ERR_NOT_DAO)
// (asserts! (is-satisfaction-valid satisfaction-vote)  ERR_INVALID_SATISFACTION)
//   (asserts! (is-eq (get status gig-info) "disputed")  ERR_NOT_DISPUTED)
// name: 'Ensure that fails on dao vote when called by another entity, invalid satisfaction or not in a status different from disputed',
Clarinet.test({
  name: 'Ensure that fails on dao vote when called by another entity, invalid satisfaction or not in a status different from disputed',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    // transfer stx to sm when creating a gig
    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(1), types.ascii(VOTE_3)], wallet_1.address),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_DAO_SATISFACTION,
        [types.uint(1), types.ascii('invalid-satisfaction')],
        deployer.address
      ),
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(1), types.ascii(VOTE_3)], deployer.address),
    ]);
    block.receipts[0].result.expectErr().expectUint(ERR_NOT_DAO);
    block.receipts[1].result.expectErr().expectUint(ERR_INVALID_SATISFACTION);
    block.receipts[2].result.expectErr().expectUint(ERR_NOT_DISPUTED);

    assertEquals(block.receipts.length, 3);
    assertEquals(block.height, 3);
  },
});

// case vote-2 -> in dispute -> upgrade to vote-1
// case vote-3 -> in dispute -> upgrade to vote-1
// case vote-3 -> in dispute -> upgrade to vote-2
// name: 'Ensure that dao can vote different than client and those amounts are sent',
Clarinet.test({
  name: 'Ensure that dao can vote the different than client and those amounts are sent',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const wallet_4 = accounts.get('wallet_4')!;
    const price_gig = 1000000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_3.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_4.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    {
      //   console.log(block.receipts[0].events);
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
      assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
      assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
      assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      assertEquals(block.receipts.length, 3);
      assertEquals(block.height, 2);
    }
    // accept work
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(2)], wallet_3.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(3)], wallet_4.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      block.receipts[1].result.expectOk().expectUint(2);
      block.receipts[2].result.expectOk().expectUint(3);
      assertEquals(block.receipts.length, 3);
      assertEquals(block.height, 3);
    }

    // vote work as vote-2, vote-3, vote-3
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(1), types.ascii(VOTE_2)], wallet_1.address),
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(2), types.ascii(VOTE_3)], wallet_1.address),
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(3), types.ascii(VOTE_3)], wallet_1.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      block.receipts[2].result.expectOk().expectBool(true);
      assertEquals(block.receipts.length, 3);
      assertEquals(block.height, 4);
    }

    // acceptance false for satisfaction vote
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPTANCE_AS_ARTIST, [types.uint(1), types.bool(false)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPTANCE_AS_ARTIST, [types.uint(2), types.bool(false)], wallet_3.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPTANCE_AS_ARTIST, [types.uint(3), types.bool(false)], wallet_4.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    block.receipts[2].result.expectOk().expectBool(true);
    assertEquals(block.receipts.length, 3);
    assertEquals(block.height, 5);

    // dao votes differently
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(1), types.ascii(VOTE_1)], deployer.address),
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(2), types.ascii(VOTE_1)], deployer.address),
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(3), types.ascii(VOTE_2)], deployer.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      block.receipts[2].result.expectOk().expectBool(true);

      //   stx transfer events for gig_1
      {
        assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, wallet_2.address);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
      }

      //   stx transfer events for gig_2
      {
        assertEquals(block.receipts[1].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, wallet_3.address);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.memo, '');
      }

      //   stx transfer events for gig_3
      {
        assertEquals(block.receipts[2].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[2].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[2].events[0].stx_transfer_event.recipient, wallet_4.address);
        assertEquals(
          block.receipts[2].events[0].stx_transfer_event.amount,
          `${(75 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[2].events[0].stx_transfer_event.memo, '');
        assertEquals(block.receipts[2].events[1].type, 'stx_transfer_event');
        assertEquals(block.receipts[2].events[1].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[2].events[1].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(
          block.receipts[2].events[1].stx_transfer_event.amount,
          `${(25 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[2].events[1].stx_transfer_event.memo, '');
      }

      assertEquals(block.receipts.length, 3);
      assertEquals(block.height, 6);
    }

    // read-only completed
    let gig = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(1)], wallet_1.address);
    assertEquals(
      gig.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u4, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "${VOTE_2}", satisfaction-disputed: "${VOTE_1}", status: "completed", to: ${
        wallet_2.address
      }}`
    );
    let gig2 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(2)], wallet_1.address);
    assertEquals(
      gig2.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u4, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "${VOTE_3}", satisfaction-disputed: "${VOTE_1}", status: "completed", to: ${
        wallet_3.address
      }}`
    );
    let gig3 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(3)], wallet_1.address);
    assertEquals(
      gig3.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u4, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "${VOTE_3}", satisfaction-disputed: "${VOTE_2}", status: "completed", to: ${
        wallet_4.address
      }}`
    );
  },
});

// in dispute
// case succesfull vote-4 -> in dispute -> vote-3
// case succesfull vote-4 -> in dispute -> vote-4
// time expired 2 -> in dispute vote-3
// time expired 2 -> in dispute vote-4
// name: 'Ensure that dao can set in dispute from vote-4 and expire and dao vote accordingly a satisfaction-dispute vote ',
Clarinet.test({
  name: 'Ensure that dao can set in dispute from vote-4 and expire ; DAO vote accordingly a satisfaction-dispute vote ',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const wallet_4 = accounts.get('wallet_4')!;
    const wallet_5 = accounts.get('wallet_5')!;
    const price_gig = 1000000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_3.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_4.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_5.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts.length, 4);
    assertEquals(block.height, 2);

    // accept work
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(2)], wallet_3.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(3)], wallet_4.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(4)], wallet_5.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      block.receipts[1].result.expectOk().expectUint(2);
      block.receipts[2].result.expectOk().expectUint(3);
      block.receipts[3].result.expectOk().expectUint(4);
      assertEquals(block.receipts.length, 4);
      assertEquals(block.height, 3);
    }

    // vote work as vote-4 for gig_1 and gig_2
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(1), types.ascii(VOTE_4)], wallet_1.address),
      Tx.contractCall(CONTRACT_MP, FNC_SATISFACTION_AS_CLIENT, [types.uint(2), types.ascii(VOTE_4)], wallet_1.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 4);
    }

    // dao vote different and same
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(1), types.ascii(VOTE_3)], deployer.address),
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(2), types.ascii(VOTE_4)], deployer.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);

      //   stx transfer events for gig_1
      {
        assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, wallet_2.address);
        assertEquals(
          block.receipts[0].events[0].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
        assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(
          block.receipts[0].events[1].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      }

      //   stx transfer events for gig_2
      {
        assertEquals(block.receipts[1].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.memo, '');
      }

      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 5);
    }

    // read-only completed
    let gig = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(1)], wallet_1.address);
    assertEquals(
      gig.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u3, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "${VOTE_4}", satisfaction-disputed: "${VOTE_3}", status: "completed", to: ${
        wallet_2.address
      }}`
    );
    let gig2 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(2)], wallet_1.address);
    assertEquals(
      gig2.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u3, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "${VOTE_4}", satisfaction-disputed: "${VOTE_4}", status: "completed", to: ${
        wallet_3.address
      }}`
    );

    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SEND_TO_DISPUTE_TIME, [types.uint(3)], deployer.address),
      Tx.contractCall(CONTRACT_MP, FNC_SEND_TO_DISPUTE_TIME, [types.uint(4)], deployer.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(ERR_NOT_EXPIRED);
    block.receipts[1].result.expectErr().expectUint(ERR_NOT_EXPIRED);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, 6);

    // insert 2 transfers after time expired
    for (let i = 1; i < period; i++) {
      block = chain.mineBlock([]);
    }
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SEND_TO_DISPUTE_TIME, [types.uint(3)], deployer.address),
      Tx.contractCall(CONTRACT_MP, FNC_SEND_TO_DISPUTE_TIME, [types.uint(4)], deployer.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);
    block.receipts[1].result.expectOk().expectBool(true);
    assertEquals(block.receipts.length, 2);
    assertEquals(block.height, period + 6);
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(3), types.ascii(VOTE_3)], deployer.address),
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(4), types.ascii(VOTE_4)], deployer.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);

      //   stx transfer events for gig_3
      {
        assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, wallet_4.address);
        assertEquals(
          block.receipts[0].events[0].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
        assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(
          block.receipts[0].events[1].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      }

      //   stx transfer events for gig_4
      {
        assertEquals(block.receipts[1].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.memo, '');
      }

      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, period + 7);
    }

    // read-only completed
    let gig3 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(3)], wallet_1.address);
    assertEquals(
      gig3.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u2021, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "initialized", satisfaction-disputed: "${VOTE_3}", status: "completed", to: ${
        wallet_4.address
      }}`
    );
    let gig4 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(4)], wallet_1.address);
    assertEquals(
      gig4.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u2021, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "initialized", satisfaction-disputed: "${VOTE_4}", status: "completed", to: ${
        wallet_5.address
      }}`
    );
  },
});

// send to dispute by client or artist because the work will not be done
// as artist you want to dispute if client does not vote satisfaction before the end of work time-period
// g1 - client
// g2 - artist
// g3 - fail client
// g4 - fail artist
// name: "Ensure that client and artist can set in dispute as creator or client before expire date, and can't afterwards",
Clarinet.test({
  name: "Ensure that can set in dispute as creator or client before expire date, and can't afterwards",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // send funds to smart contract
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const wallet_4 = accounts.get('wallet_4')!;
    const wallet_5 = accounts.get('wallet_5')!;
    const price_gig = 1000000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_3.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_4.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_5.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);

    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts.length, 4);
    assertEquals(block.height, 2);

    // accept work
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(2)], wallet_3.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(3)], wallet_4.address),
      Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(4)], wallet_5.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      block.receipts[1].result.expectOk().expectUint(2);
      block.receipts[2].result.expectOk().expectUint(3);
      block.receipts[3].result.expectOk().expectUint(4);
      assertEquals(block.receipts.length, 4);
      assertEquals(block.height, 3);
    }

    // send-to-dispute for gig_1 and gig_2
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SEND_TO_DISPTUTE_PARTICIPANT, [types.uint(1)], wallet_1.address),
      Tx.contractCall(CONTRACT_MP, FNC_SEND_TO_DISPTUTE_PARTICIPANT, [types.uint(2)], wallet_3.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);
      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 4);
    }

    // dao votes for gig_1 and gig_2
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(1), types.ascii(VOTE_3)], deployer.address),
      Tx.contractCall(CONTRACT_MP, FNC_DAO_SATISFACTION, [types.uint(2), types.ascii(VOTE_4)], deployer.address),
    ]);
    {
      block.receipts[0].result.expectOk().expectBool(true);
      block.receipts[1].result.expectOk().expectBool(true);

      //   stx transfer events for gig_1
      {
        assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, wallet_2.address);
        assertEquals(
          block.receipts[0].events[0].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
        assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
        assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(
          block.receipts[0].events[1].stx_transfer_event.amount,
          `${(50 / 100) * (price_gig - price_gig * COMMISSION)}`
        );
        assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');
      }

      //   stx transfer events for gig_2
      {
        assertEquals(block.receipts[1].events[0].type, 'stx_transfer_event');
        assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, wallet_1.address);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
        assertEquals(block.receipts[1].events[0].stx_transfer_event.memo, '');
      }

      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, 5);
    }

    // read-only completed
    let gig = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(1)], wallet_1.address);
    assertEquals(
      gig.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u3, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "initialized", satisfaction-disputed: "${VOTE_3}", status: "completed", to: ${
        wallet_2.address
      }}`
    );
    let gig2 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(2)], wallet_1.address);
    assertEquals(
      gig2.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u3, completely-paid: true, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "initialized", satisfaction-disputed: "${VOTE_4}", status: "completed", to: ${
        wallet_3.address
      }}`
    );
    // insert 2 transfers after time expired
    for (let i = 0; i < period; i++) {
      block = chain.mineBlock([]);
    }
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_SEND_TO_DISPTUTE_PARTICIPANT, [types.uint(3)], wallet_1.address),
      Tx.contractCall(CONTRACT_MP, FNC_SEND_TO_DISPTUTE_PARTICIPANT, [types.uint(4)], wallet_5.address),
    ]);

    {
      block.receipts[0].result.expectErr().expectUint(ERR_EXPIRED);
      block.receipts[1].result.expectErr().expectUint(ERR_EXPIRED);

      assertEquals(block.receipts.length, 2);
      assertEquals(block.height, period + 6);
    }

    // read-only completed
    let gig3 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(3)], wallet_1.address);
    assertEquals(
      gig3.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u1, completely-paid: false, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "initialized", satisfaction-disputed: "initialized", status: "accepted", to: ${
        wallet_4.address
      }}`
    );
    let gig4 = chain.callReadOnlyFn(CONTRACT_MP, FNC_GET_GIG, [types.uint(4)], wallet_1.address);
    assertEquals(
      gig4.result.expectSome(),
      `{amount: u${
        price_gig - price_gig * COMMISSION
      }, block-accepted: u2, block-created: u1, block-disputed: u1, completely-paid: false, from: ${
        wallet_1.address
      }, job: "${job_title}", period: u${period}, satisfaction: "initialized", satisfaction-disputed: "initialized", status: "accepted", to: ${
        wallet_5.address
      }}`
    );
  },
});

// check is expired
// 1 transaction
// name: 'Ensure that user can check corectly if transaction is expired'
Clarinet.test({
  name: 'Ensure that user can check corectly if transaction is expired',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    // transfer stx to sm when creating a gig
    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    // check before expired
    let is_expired = chain.callReadOnlyFn(CONTRACT_MP, FNC_CHECK_IS_EXPIRED, [types.uint(1)], wallet_3.address);
    assertEquals(is_expired.result, 'false');

    // accept work
    block = chain.mineBlock([Tx.contractCall(CONTRACT_MP, FNC_ACCEPT_GIG, [types.uint(1)], wallet_2.address)]);
    {
      block.receipts[0].result.expectOk().expectUint(1);
      assertEquals(block.receipts.length, 1);
      assertEquals(block.height, 3);
    }

    for (let i = 0; i < period + 2; i++) {
      block = chain.mineBlock([]);
    }
    // check after expired
    is_expired = chain.callReadOnlyFn(CONTRACT_MP, FNC_CHECK_IS_EXPIRED, [types.uint(1)], wallet_3.address);
    assertEquals(is_expired.result, 'true');

    // check expired nonexistent gig
    is_expired = chain.callReadOnlyFn(CONTRACT_MP, FNC_CHECK_IS_EXPIRED, [types.uint(2)], wallet_3.address);
    assertEquals(is_expired.result, 'false');
  },
});

// same for can redeem
Clarinet.test({
  name: 'Ensure that user can check corectly if transaction is redeemable',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const wallet_3 = accounts.get('wallet_3')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    // transfer stx to sm when creating a gig
    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    // check before expired
    let is_redeemable = chain.callReadOnlyFn(
      CONTRACT_MP,
      FNC_CAN_REDEEM,
      [types.uint(1), types.principal(wallet_1.address)],
      wallet_3.address
    );
    is_redeemable.result.expectOk().expectBool(false);

    for (let i = 0; i < period + 2; i++) {
      block = chain.mineBlock([]);
    }
    // check after expired
    is_redeemable = chain.callReadOnlyFn(
      CONTRACT_MP,
      FNC_CAN_REDEEM,
      [types.uint(1), types.principal(wallet_1.address)],
      wallet_3.address
    );
    is_redeemable.result.expectOk().expectBool(true);

    is_redeemable = chain.callReadOnlyFn(
      CONTRACT_MP,
      FNC_CAN_REDEEM,
      [types.uint(1), types.principal(wallet_2.address)],
      wallet_3.address
    );
    is_redeemable.result.expectOk().expectBool(false);
  },
});

// redeem back - for previous can redeem
Clarinet.test({
  name: 'Ensure that can redeem when it should be able to',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet_1 = accounts.get('wallet_1')!;
    const wallet_2 = accounts.get('wallet_2')!;
    const price_gig = 1000;
    const job_title = 'art';
    const period = 144 * 14; // 14 days
    let block = chain.mineBlock([
      Tx.contractCall(
        CONTRACT_MP,
        FNC_CREATE_GIG,
        [types.principal(wallet_2.address), types.uint(price_gig), types.ascii(job_title), types.uint(period)],
        wallet_1.address
      ),
    ]);
    // transfer stx to sm when creating a gig
    block.receipts[0].result.expectOk().expectUint(1);
    assertEquals(block.receipts[0].events[0].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[0].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.recipient, deployer.address + '.' + CONTRACT_MP);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[0].stx_transfer_event.memo, '');
    assertEquals(block.receipts[0].events[1].type, 'stx_transfer_event');
    assertEquals(block.receipts[0].events[1].stx_transfer_event.sender, wallet_1.address);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.recipient, CONTRACT_OWNER);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.amount, `${price_gig * COMMISSION}`);
    assertEquals(block.receipts[0].events[1].stx_transfer_event.memo, '');

    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);

    // redeem before expired
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_REDEEM_BACK, [types.uint(1)], wallet_1.address),
      Tx.contractCall(CONTRACT_MP, FNC_REDEEM_BACK, [types.uint(2)], wallet_1.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(ERR_NOT_REDEEMABLE);
    block.receipts[1].result.expectErr().expectUint(ERR_NOT_FOUND);

    for (let i = 0; i < period + 2; i++) {
      block = chain.mineBlock([]);
    }
    // redeem with another wallet after expired
    // redeem after expired
    block = chain.mineBlock([
      Tx.contractCall(CONTRACT_MP, FNC_REDEEM_BACK, [types.uint(1)], wallet_2.address),
      Tx.contractCall(CONTRACT_MP, FNC_REDEEM_BACK, [types.uint(1)], wallet_1.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(ERR_NOT_CLIENT);
    block.receipts[1].result.expectOk().expectBool(true);
    //   stx transfer events for gig_1
    {
      assertEquals(block.receipts[1].events[0].type, 'stx_transfer_event');
      assertEquals(block.receipts[1].events[0].stx_transfer_event.sender, CONTRACT_ADDRESS);
      assertEquals(block.receipts[1].events[0].stx_transfer_event.recipient, wallet_1.address);
      assertEquals(block.receipts[1].events[0].stx_transfer_event.amount, `${price_gig - price_gig * COMMISSION}`);
      assertEquals(block.receipts[1].events[0].stx_transfer_event.memo, '');
    }

    // double try to redeem
    block = chain.mineBlock([Tx.contractCall(CONTRACT_MP, FNC_REDEEM_BACK, [types.uint(1)], wallet_1.address)]);

    block.receipts[0].result.expectErr().expectUint(ERR_NOT_REDEEMABLE);
  },
});
