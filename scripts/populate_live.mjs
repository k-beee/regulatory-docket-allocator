#!/usr/bin/env node
/**
 * Regulatory Docket Allocator - Live Studionet Docket Population Script
 * Contract: 0xD9403971A4CE287EAc3891065f79CF8Dd9f72048
 * Chain: GenLayer Studionet (61999)
 *
 * Usage:
 *   node scripts/populate_live.mjs <PRIVATE_KEY>
 * or
 *   GENLAYER_PRIVATE_KEY=<PRIVATE_KEY> node scripts/populate_live.mjs
 */

import { createClient, createAccount, generatePrivateKey, chains } from 'genlayer-js';

const CONTRACT_ADDRESS = '0xD9403971A4CE287EAc3891065f79CF8Dd9f72048';
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
        'https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/nprm-epa-2026.txt',
        'af6d1c26d932fd08c75c0ba79e16105605a64c06f73e9790b2e9466b591d5e9a',
        '23a385cf2c5e85b48af0b3a49c501ec4f03cfb7aa63510a425636cd3222f58e8',
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
        url: 'https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub1-industry.txt',
        digest: 'a0e8fd652015c05be982defa160a2fdeac85a2197dbed36144a9b45e21acabab',
      },
      {
        id: 'EPA-SUB-002',
        url: 'https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub2-epidemiology.txt',
        digest: 'e916f0efdf0b52c0107197daf9839953211b398bac86fc33deee06701ce12c4a',
      },
      {
        id: 'EPA-SUB-003',
        url: 'https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub3-small-biz.txt',
        digest: 'e2026a7df83c0056fe482bf95e60b57fb90444b58c1e5a10dc713a232d72d974',
      },
      {
        id: 'EPA-SUB-004',
        url: 'https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub4-clean-tech.txt',
        digest: 'cdf7ac8836d3d728e084cfb3fb56a52c420411de3cf8d72eafa170be4f98e16c',
      },
      {
        id: 'EPA-SUB-005',
        url: 'https://raw.githubusercontent.com/k-beee/regulatory-docket-allocator/main/frontend/public/fixtures/sub5-tampered-sample.txt',
        digest: '03043ced0923843fb2d29f53ba2e91b4d57d6e9cd0ebf33264759389aeb95753',
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
