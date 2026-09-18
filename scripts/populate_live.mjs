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

import { createClient, createAccount } from 'genlayer-js';

const CONTRACT_ADDRESS = '0xC2E3b411A4b5BD691A42285A47111BD91d541962';
const STUDIONET_RPC = 'https://studio.genlayer.com/api';

const privateKey = process.argv[2] || process.env.GENLAYER_PRIVATE_KEY;

if (!privateKey) {
  console.error('Error: Please provide a private key as an argument or set GENLAYER_PRIVATE_KEY.');
  console.error('Usage: node scripts/populate_live.mjs 0x...');
  process.exit(1);
}

const studionet = {
  id: 61999,
  name: 'GenLayer Studionet',
  rpcUrls: {
    default: { http: [STUDIONET_RPC] },
    public: { http: [STUDIONET_RPC] }
  }
};

async function main() {
  console.log('--- Initializing GenLayer Client ---');
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = createAccount(formattedKey);
  console.log(`Using Account: ${account.address}`);
  console.log(`Target Contract: ${CONTRACT_ADDRESS}`);

  const client = createClient({
    chain: studionet,
    account
  });

  // Check current docket count
  try {
    const docketCount = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_docket_count',
      args: []
    });
    console.log(`Current On-Chain Docket Count: ${docketCount}`);

    let targetDocketId = Number(docketCount);

    if (targetDocketId === 0) {
      console.log('\n[1/4] Initializing Docket #1 (EPA Heavy Vehicle PM2.5 Rulemaking)...');
      const now = Math.floor(Date.now() / 1000);
      const initTx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: 'initialize_docket',
        args: [
          account.address,
          account.address,
          'https://federalregister.gov/dockets/EPA-HQ-OAR-2026-0188',
          '4a6b2c89f1092e038827419efcd51804c81e9b28a7e02518e3290bca7140f9aa',
          3, // 3 oral witness slots
          now + 86400, // 24h enrollment deadline
          now + 172800 // 48h contestation deadline
        ]
      });
      console.log(`Init Tx Submitted: ${initTx}`);
      console.log('Waiting for receipt...');
      const initReceipt = await client.waitForTransactionReceipt({ hash: initTx });
      console.log(`Docket #1 Initialized! Status: ${initReceipt.status}`);
      targetDocketId = 1;
    } else {
      console.log(`Docket #1 already exists (Current state will be populated/inspected).`);
    }

    // Check existing submissions
    const existingSubs = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_all_submissions',
      args: [targetDocketId]
    });
    console.log(`Existing Submissions Count: ${existingSubs ? existingSubs.length : 0}`);

    if (!existingSubs || existingSubs.length === 0) {
      console.log('\n[2/4] Enrolling authentic public submissions...');
      const authenticSubmissions = [
        {
          id: 'EPA-SUB-001',
          url: 'https://federalregister.gov/comments/EPA-HQ-OAR-2026-0188/001-fleet-economics.txt',
          digest: '1111111111111111111111111111111111111111111111111111111111111111'
        },
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

      for (const sub of authenticSubmissions) {
        console.log(`Enrolling ${sub.id}...`);
        const tx = await client.writeContract({
          address: CONTRACT_ADDRESS,
          functionName: 'enroll_submission',
          args: [targetDocketId, sub.id, sub.url, sub.digest]
        });
        console.log(`  Tx: ${tx}`);
        await client.waitForTransactionReceipt({ hash: tx });
      }
      console.log('All 5 public submissions successfully enrolled on-chain!');
    }

    console.log('\n[3/4] Manifest Verification & Status Summary:');
    const docketSummary = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_docket',
      args: [targetDocketId]
    });
    console.log('Docket State:', docketSummary.state);
    console.log('Enrolled Submissions:', docketSummary.submission_count);
    console.log('Manifest Hash:', docketSummary.expected_manifest_digest || docketSummary.computed_manifest_digest);

    console.log('\n[SUCCESS] Live transactions populated successfully on GenLayer Studionet!');
    console.log(`View live contract on explorer: https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`);
  } catch (err) {
    console.error('Execution failed with error:', err);
  }
}

main();
