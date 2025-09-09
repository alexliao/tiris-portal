#!/usr/bin/env node
/*
 Minimal MCP client for the Playwright MCP server.
 - Spawns the server via stdio
 - Supports: list-tools, call <toolName> [jsonParams]
*/

const path = require('node:path');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function connectPlaywrightServer() {
  // Resolve the installed server binary
  const binPath = path.resolve(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'playwright-mcp-server.cmd' : 'playwright-mcp-server'
  );

  const transport = new StdioClientTransport({
    command: binPath,
    // Pipe stderr so we can surface server errors to the user
    stderr: 'pipe',
    env: process.env,
  });

  const client = new Client({ name: 'LocalMCPClient', version: '0.1.0' });

  // Surface server stderr to our stderr for easier troubleshooting
  const stderr = transport.stderr;
  if (stderr) {
    stderr.on('data', (chunk) => {
      // Prefix to distinguish server logs
      process.stderr.write(String(chunk));
    });
  }

  await client.connect(transport);
  return { client, transport };
}

async function listTools() {
  const { client, transport } = await connectPlaywrightServer();
  try {
    const res = await client.listTools({});
    // Print minimal table
    for (const tool of res.tools) {
      const params = tool.inputSchema ? ' (params)' : '';
      console.log(`${tool.name}${params} - ${tool.description || ''}`.trim());
    }
  } finally {
    await transport.close();
  }
}

async function callTool(name, paramsJson) {
  const { client, transport } = await connectPlaywrightServer();
  try {
    let args = undefined;
    if (paramsJson) {
      try {
        args = JSON.parse(paramsJson);
      } catch (e) {
        console.error('Invalid JSON for params:', e.message);
        process.exitCode = 1;
        return;
      }
    }
    const res = await client.callTool({ name, arguments: args });
    if (res.structuredContent) {
      console.log(JSON.stringify(res.structuredContent, null, 2));
    } else if (res.content) {
      console.log(JSON.stringify(res.content, null, 2));
    } else if (res.text) {
      console.log(res.text);
    } else {
      console.log(JSON.stringify(res, null, 2));
    }
  } finally {
    await transport.close();
  }
}

async function smokeHomepage(url) {
  const targetUrl = url || process.env.HOMEPAGE_URL || 'http://localhost:5174';
  const { client, transport } = await connectPlaywrightServer();
  try {
    // 1) Navigate
    await client.callTool({ name: 'playwright_navigate', arguments: { url: targetUrl, waitUntil: 'load', timeout: 30000 } });
    // 2) Get visible text and assert key strings
    const res = await client.callTool({ name: 'playwright_get_visible_text', arguments: {} });
    const text = Array.isArray(res.content)
      ? res.content.map((c) => (c.text ? c.text : '')).join('\n')
      : (res.text || '');
    const checks = [
      { label: 'contains TIRIS', pass: /TIRIS/i.test(text) },
      { label: 'contains subtitle', pass: /Profitable Crypto Trading Bot/i.test(text) },
    ];
    const allPass = checks.every((c) => c.pass);
    // 3) Screenshot for artifact
    await client.callTool({ name: 'playwright_screenshot', arguments: { name: 'homepage', fullPage: true } });
    // 4) Report
    console.log(JSON.stringify({ url: targetUrl, checks }, null, 2));
    if (!allPass) {
      process.exitCode = 1;
    }
  } finally {
    await transport.close();
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log('Usage: node tools/mcp-playwright.cjs <list-tools | call <toolName> [jsonParams] >');
    process.exit(0);
  }
  if (cmd === 'list-tools') {
    await listTools();
    return;
  }
  if (cmd === 'call') {
    const [name, params] = rest;
    if (!name) {
      console.error('call requires <toolName>');
      process.exitCode = 1;
      return;
    }
    await callTool(name, params);
    return;
  }
  if (cmd === 'smoke:homepage') {
    const [url] = rest;
    await smokeHomepage(url);
    return;
  }
  console.error(`Unknown command: ${cmd}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error('Error:', err && err.stack ? err.stack : String(err));
  process.exitCode = 1;
});
