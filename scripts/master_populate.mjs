/**
 * Master GenLayer Live Population Script
 *
 * 1. Generates authentic random wallets.
 * 2. Funds them with GEN from the master funded key.
 * 3. Populates Regulatory Docket Allocator (0xD9403971A4CE287EAc3891065f79CF8Dd9f72048).
 * 4. Populates Civic Deliberation Allocator (0x8c0747c835Dc8692878EaCA5Dd652a5216D60AA0).
 */

import { createClient, createAccount, generatePrivateKey, chains } from '../frontend/node_modules/genlayer-js/dist/index.js';

const MASTER_KEY = '0x865c6773bcd46f894a56092ca318c2d4931d49ed8e60ddc4c8a709b67683e699';
const REGULATORY_CONTRACT = '0xD9403971A4CE287EAc3891065f79CF8Dd9f72048';
const CIVIC_CONTRACT = '0x8c0747c835Dc8692878EaCA5Dd652a5216D60AA0';

async function main() {
  console.log('========================================================');
  console.log('   GENLAYER STUDIONET MULTI-WALLET POPULATION PIPELINE   ');
  console.log('========================================================\n');

  const masterAccount = createAccount(MASTER_KEY);
  const masterClient = createClient({ chain: chains.studionet, account: masterAccount });
  console.log(`[Master Account] Address: ${masterAccount.address}`);

  const masterBal = await masterClient.getBalance({ address: masterAccount.address });
  console.log(`[Master Balance] ${(Number(masterBal) / 1e18).toFixed(4)} GEN\n`);

  // 1. Generate Random Wallets
  console.log('--- Step 1: Generating Distinct Random Wallets ---');
  const challengerKey = generatePrivateKey();
  const challengerAccount = createAccount(challengerKey);

  const civicOrganizerKey = generatePrivateKey();
  const civicOrganizerAccount = createAccount(civicOrganizerKey);

  const civicCitizenKey = generatePrivateKey();
  const civicCitizenAccount = createAccount(civicCitizenKey);

  console.log(`Challenger Wallet:       ${challengerAccount.address}`);
  console.log(`Civic Organizer Wallet:  ${civicOrganizerAccount.address}`);
  console.log(`Civic Citizen Wallet:    ${civicCitizenAccount.address}\n`);

  // 2. Fund the generated wallets with GEN transfers
  console.log('--- Step 2: Transferring GEN from Master Wallet ---');
  const walletsToFund = [
    { name: 'Challenger', account: challengerAccount, amount: 15n * 10n ** 18n },
    { name: 'Civic Organizer', account: civicOrganizerAccount, amount: 20n * 10n ** 18n },
    { name: 'Civic Citizen', account: civicCitizenAccount, amount: 15n * 10n ** 18n },
  ];

  for (const w of walletsToFund) {
    console.log(`Transferring 15-20 GEN to ${w.name} (${w.account.address})...`);
    const nonce = await masterClient.getTransactionCount({ address: masterAccount.address });
    const signedTx = await masterAccount.signTransaction({
      to: w.account.address,
      value: w.amount,
      nonce,
      chainId: 61999,
      type: 'legacy'
    });
    const txHash = await masterClient.request({
      method: 'eth_sendRawTransaction',
      params: [signedTx]
    });
    console.log(`  Transfer Tx: ${txHash}`);
    await masterClient.waitForTransactionReceipt({ hash: txHash });
    const bal = await masterClient.getBalance({ address: w.account.address });
    console.log(`  Confirmed! New Balance: ${(Number(bal) / 1e18).toFixed(2)} GEN`);
  }

  // 3. Populate Regulatory Docket Allocator
  console.log('\n--- Step 3: Populating Regulatory Docket Allocator ---');
  console.log(`Target Contract: ${REGULATORY_CONTRACT}`);
  
  const regSubmissions = [
    {
      id: 'EPA-SUB-002',
      url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/002-pediatric-epidemiology.txt',
      digest: '2222222222222222222222222222222222222222222222222222222222222222'
    },
    {
      id: 'EPA-SUB-003',
      url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/003-small-biz-freight.txt',
      digest: '3333333333333333333333333333333333333333333333333333333333333333'
    },
    {
      id: 'EPA-SUB-004',
      url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/004-clean-hydrogen-powertrain.txt',
      digest: '4444444444444444444444444444444444444444444444444444444444444444'
    },
    {
      id: 'EPA-SUB-005',
      url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/005-tampered-sample.txt',
      digest: '5555555555555555555555555555555555555555555555555555555555555555'
    }
  ];

  for (const s of regSubmissions) {
    console.log(`Enrolling ${s.id} in Docket #1...`);
    const tx = await masterClient.writeContract({
      address: REGULATORY_CONTRACT,
      functionName: 'enroll_submission',
      args: [1, s.id, s.url, s.digest]
    });
    console.log(`  Tx: ${tx}`);
    const r = await masterClient.waitForTransactionReceipt({ hash: tx });
    console.log(`  Confirmed! Result: ${r.result_name}`);
  }

  const regDocket = await masterClient.readContract({
    address: REGULATORY_CONTRACT,
    functionName: 'get_docket',
    args: [1]
  });
  console.log(`Regulatory Docket #1 now has ${JSON.parse(regDocket).submission_count} enrolled public submissions!`);

  // 4. Populate Civic Deliberation Allocator
  console.log('\n--- Step 4: Populating Civic Deliberation Allocator ---');
  console.log(`Target Contract: ${CIVIC_CONTRACT}`);

  const civicClient = createClient({ chain: chains.studionet, account: civicOrganizerAccount });
  console.log(`Initializing Civic Docket #1 using newly funded organizer: ${civicOrganizerAccount.address}...`);

  const now = Math.floor(Date.now() / 1000);
  const civicInitTx = await civicClient.writeContract({
    address: CIVIC_CONTRACT,
    functionName: 'initialize_docket',
    args: [
      'https://assembly.civic.gov/charters/transit-2026.txt',
      '4a6b25110d939626e259b3df9e63e1986c758bb8efb7a1ffb1548b8b9c8a77a9',
      'f5e09a0e5533875bb352f6bd4be8d8ae3da11ce7b4ffe4007c17b55d6691989b',
      2, // 2 delegate seats
      now + 86400,
      now + 172800
    ]
  });
  console.log(`Civic Init Tx: ${civicInitTx}`);
  const civicInitReceipt = await civicClient.waitForTransactionReceipt({ hash: civicInitTx });
  console.log(`Civic Docket #1 Initialized! Result: ${civicInitReceipt.result_name}`);

  const civicTestimonies = [
    {
      id: 't-commuter-union',
      url: 'https://assembly.civic.gov/t/t1.txt',
      digest: '1111111111111111111111111111111111111111111111111111111111111111'
    },
    {
      id: 't-active-mobility',
      url: 'https://assembly.civic.gov/t/t2.txt',
      digest: '2222222222222222222222222222222222222222222222222222222222222222'
    },
    {
      id: 't-suburban-transit',
      url: 'https://assembly.civic.gov/t/t3.txt',
      digest: '3333333333333333333333333333333333333333333333333333333333333333'
    },
    {
      id: 't-green-corridor',
      url: 'https://assembly.civic.gov/t/t4.txt',
      digest: '4444444444444444444444444444444444444444444444444444444444444444'
    }
  ];

  for (const t of civicTestimonies) {
    console.log(`Enrolling testimony ${t.id} into Civic Docket #1...`);
    const tx = await civicClient.writeContract({
      address: CIVIC_CONTRACT,
      functionName: 'enroll_testimony',
      args: [1, t.id, t.url, t.digest]
    });
    console.log(`  Tx: ${tx}`);
    const r = await civicClient.waitForTransactionReceipt({ hash: tx });
    console.log(`  Confirmed! Result: ${r.result_name}`);
  }

  const civicDocket = await civicClient.readContract({
    address: CIVIC_CONTRACT,
    functionName: 'get_docket',
    args: [1]
  });
  console.log(`Civic Docket #1 now has ${JSON.parse(civicDocket).testimony_count} enrolled citizen testimonies!`);

  console.log('\n========================================================');
  console.log('   POPULATION COMPLETE: ALL ON-CHAIN DATA CONFIRMED');
  console.log('========================================================');
  console.log(`Regulatory Explorer: https://explorer-studio.genlayer.com/address/${REGULATORY_CONTRACT}`);
  console.log(`Civic Explorer:      https://explorer-studio.genlayer.com/address/${CIVIC_CONTRACT}`);
}

main().catch(console.error);
