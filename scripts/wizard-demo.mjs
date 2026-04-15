#!/usr/bin/env node

import readline from 'node:readline';
import { createSession, getCurrentPrompt, handleInput } from '../src/wizard/engine.mjs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'you> '
});

const session = createSession();

function printState(result) {
  console.log('\n--- wizard ---');
  console.log(`state: ${result.currentState}`);
  console.log(`canProceed: ${result.canProceed}`);
  console.log(`requiredFieldsMissing: ${JSON.stringify(result.requiredFieldsMissing)}`);
  console.log(`nextActions: ${JSON.stringify(result.nextActions)}`);
  console.log('prompt:');
  console.log(getCurrentPrompt(session));
  console.log('--------------\n');
}

printState(handleInput(session, 'status'));
rl.prompt();

rl.on('line', (line) => {
  const result = handleInput(session, line);
  printState(result);

  if (session.currentState === 'CLOSE' && result.canProceed) {
    rl.close();
    return;
  }

  rl.prompt();
});

rl.on('close', () => {
  console.log('Wizard demo ended.');
  process.exit(0);
});
