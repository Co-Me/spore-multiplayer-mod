// SPDX-License-Identifier: GPL-3.0-or-later
// Two native clients (the shipped client code, not a test double) complete the
// real cooperative handshake against the real server and move the shared world
// into the Creature stage.
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = dirname(dirname(fileURLToPath(import.meta.url)));
const serverExe = process.env.SPORE_COOP_TEST_SERVER || join(project, 'SporeCoop.Server.exe');
const clientExe = join(project, 'bin/tests/NativeVisualTests.exe');
for (const [path, hint] of [[serverExe, 'run .\\Build-Server.ps1'], [clientExe, 'run .\\Test-Native.ps1']]) {
    try {
        await access(path);
    } catch {
        throw new Error(`Missing ${path}. ${hint} first.`);
    }
}
const temp = await mkdtemp(join(tmpdir(), 'spore-native-stage-'));
const save = join(temp, 'session.json');
const allocator = net.createServer();
await new Promise(resolve => allocator.listen(0, '127.0.0.1', resolve));
const port = allocator.address().port;
await new Promise(resolve => allocator.close(resolve));
const hostToken = 'test-stage-host-01234567890123456';
const guestToken = 'test-stage-guest-0123456789012345';

const server = spawn(serverExe, [
  '--listen', '127.0.0.1', '--port', String(port), '--host-token', hostToken,
  '--guest-token', guestToken, '--save', save
], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

function startClient(role, token) {
  return spawn(clientExe, ['--stage-transition'], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: {
      ...process.env, SPORE_COOP_ROLE: role, SPORE_COOP_SERVER: '127.0.0.1',
      SPORE_COOP_PORT: String(port), SPORE_COOP_TOKEN: token
    }
  });
}

function finish(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Native stage test timeout\n' + output)); }, 40000);
    child.once('error', reject);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('exit', code => { clearTimeout(timer); resolve({ code, output }); });
  });
}

let host, guest;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    let output = '';
    server.once('error', reject);
    server.once('exit', code => reject(new Error('Server exited: ' + code)));
    server.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('LISTENING')) { clearTimeout(timer); resolve(); }
    });
  });

  // The server refuses a guest before the host, so the host connects first.
  host = startClient('host', hostToken);
  const hostResult = finish(host);
  await new Promise(resolve => setTimeout(resolve, 500));
  guest = startClient('guest', guestToken);
  const guestResult = finish(guest);

  const hostOutcome = await hostResult;
  const guestOutcome = await guestResult;
  process.stdout.write(hostOutcome.output);
  process.stdout.write(guestOutcome.output);
  assert.equal(hostOutcome.code, 0, hostOutcome.output);
  assert.equal(guestOutcome.code, 0, guestOutcome.output);
  assert.match(hostOutcome.output, /PASS: native client reached the Creature stage/);
  assert.match(guestOutcome.output, /PASS: native client reached the Creature stage/);

  const session = JSON.parse(await readFile(save, 'utf8'));
  assert.equal(session.Stage, 'creature', 'The saved shared world is in the Creature stage');
  assert.equal(session.CellStageComplete, true, 'The Cell stage completion is saved with the stage');
  console.log('PASS: native clients and the real server moved the shared world into the Creature stage.');
} finally {
  for (const child of [host, guest]) {
    if (child && child.exitCode === null) child.kill();
  }
  if (server.exitCode === null) {
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill();
    await exited;
  }
}
