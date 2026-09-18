#!/usr/bin/env node
/**
 * Regulatory Docket Allocator - Live Studionet Docket Population Script
 * Contract: 0xC2E3b411A4b5BD691A42285A47111BD91d541962
 * Chain: GenLayer Studionet (61999)
 *
 * Usage:
 *   node scripts/populate_live.mjs <PRIVATE_KEY>
 * or
 *   GENLAYER_PRIVATE_KEY=<PRIVATE_KEY> node scripts/populate_live.mjs
 */

import { createClient, createAccount, generatePrivateKey, chains } from 'genlayer-js';

const CONTRACT_ADDRESS = '0xC2E3b411A4b5BD691A42285A47111BD91d541962';
const privateKey = process.argv[2] || process.env.GENLAYER_PRIVATE_KEY;

if (!privateKey) {
  console.error('Error: Please provide a private key as an argument or set GENLAYER_PRIVATE_KEY.');
  console.error('Usage: node scripts/populate_live.mjs 0x...');
  process.exit(1);
}

async function main() {
  console.log('====================================================');
  console.log('   REGULATORY DOCKET ALLOCATOR - LIVE POPULATION    ');
  console.log('====================================================\n');

  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const masterAccount = createAccount(formattedKey);
  console.log(`[Master Account] ${masterAccount.address}`);
  console.log(`[Target Contract] ${CONTRACT_ADDRESS}`);

  const masterClient = createClient({
    chain: chains.studionet,
    account: masterAccount,
  });

  const bal = await masterClient.getBalance({ address: masterAccount.address });
  console.log(`[Balance] ${(Number(bal) / 1e18).toFixed(4)} GEN\n`);

  // Check if docket 1 exists
  let docketExists = false;
  try {
    const d = await masterClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_docket',
      args: [1],
    });
    if (d) {
      docketExists = true;
      console.log('Docket #1 already exists on-chain:');
      console.log(`  State: ${JSON.parse(d).state}`);
      console.log(`  Submissions: ${JSON.parse(d).submission_count}`);
    }
  } catch {
    docketExists = false;
  }

  if (!docketExists) {
    console.log('\n[1/3] Initializing Rulemaking Docket #1...');
    const now = Math.floor(Date.now() / 1000);
    const initTx = await masterClient.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: 'initialize_docket',
      args: [
        'https://federalregister.gov/dockets/EPA-HQ-OAR-2026-0188',
        '4a6b2c89f1092e038827419efcd51804c81e9b28a7e02518e3290bca7140f9aa',
        '3bf1e0dc12003c267232230a103cfd39c09c323f99066601ea319a2786a51d8b',
        3, // 3 oral witness slots
        now + 86400,
        now + 172800,
      ],
      value: 0n,
    });
    console.log(`Init Tx: ${initTx}`);
    const receipt = await masterClient.waitForTransactionReceipt({ hash: initTx });
    console.log(`Docket #1 Initialized! Status: ${receipt.result_name}`);
  }

  // Check enrolled submissions
  const subs = await masterClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_all_submissions',
    args: [1],
  });
  const currentSubs = subs ? JSON.parse(subs) : [];
  console.log(`\nCurrent Enrolled Submissions: ${currentSubs.length}`);

  if (currentSubs.length < 5) {
    console.log('\n[2/3] Enrolling missing public submissions...');
    const candidates = [
      {
        id: 'EPA-SUB-001',
        url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/001-fleet-economics.txt',
        digest: '1111111111111111111111111111111111111111111111111111111111111111',
      },
      {
        id: 'EPA-SUB-002',
        url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/002-pediatric-epidemiology.txt',
        digest: '2222222222222222222222222222222222222222222222222222222222222222',
      },
      {
        id: 'EPA-SUB-003',
        url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/003-small-biz-freight.txt',
        digest: '3333333333333333333333333333333333333333333333333333333333333333',
      },
      {
        id: 'EPA-SUB-004',
        url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/004-clean-hydrogen-powertrain.txt',
        digest: '4444444444444444444444444444444444444444444444444444444444444444',
      },
      {
        id: 'EPA-SUB-005',
        url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/005-tampered-sample.txt',
        digest: '5555555555555555555555555555555555555555555555555555555555555555',
      },
    ];

    const existingIds = new Set(currentSubs.map((s) => s.submission_id));

    for (const c of candidates) {
      if (!existingIds.has(c.id)) {
        console.log(`Enrolling ${c.id}...`);
        const tx = await masterClient.writeContract({
          address: CONTRACT_ADDRESS,
          functionName: 'enroll_submission',
          args: [1, c.id, c.url, c.digest],
          value: 0n,
        });
        console.log(`  Tx: ${tx}`);
        await masterClient.waitForTransactionReceipt({ hash: tx });
      }
    }
  }

  console.log('\n[3/3] Verification:');
  const summary = await masterClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_docket',
    args: [1],
  });
  console.log('Live Docket Record:', JSON.parse(summary));
  console.log(`\nView on GenLayer Explorer: https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`);
}

main().catch(console.error);
