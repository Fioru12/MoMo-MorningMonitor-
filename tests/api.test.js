/**
 * MoMo - API Tests (Self-contained)
 * Run: npm test
 */

const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');

// We test against our server endpoints
const PORT = 3999; // test port - isolato, non confligge con 3100
const BASE_URL = `http://localhost:${PORT}`;

// Helper per fare richieste HTTP
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 MoMo Self-Contained API Tests\n');
  let passed = 0;
  let failed = 0;

  // Start temporary server for testing
  process.env.PORT = PORT;
  // Clear require cache for server if needed or start it
  const serverModule = require('../server.js');

  // Wait 1 second for server to boot
  await new Promise(r => setTimeout(r, 1000));

  // Test 1: Health Check
  try {
    const res = await request('/api/health');
    if (res.status === 200 && res.data.status === 'ok') {
      console.log('✅ Health Check - Server is running');
      passed++;
    } else {
      throw new Error('Health check failed');
    }
  } catch (err) {
    console.log('❌ Health Check -', err.message);
    failed++;
  }

  // Test 2: System API
  try {
    const res = await request('/api/system');
    if (res.status === 200 && res.data.hostname && res.data.cpu) {
      console.log('✅ System API - Returns system info');
      passed++;
    } else {
      throw new Error('System API failed');
    }
  } catch (err) {
    console.log('❌ System API -', err.message);
    failed++;
  }

  // Test 3: Todos CRUD API
  try {
    // POST
    const postRes = await request('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { text: 'Automated test todo' }
    });
    if (postRes.status === 201 && postRes.data.id) {
      const todoId = postRes.data.id;
      
      // GET
      const getRes = await request('/api/todos');
      const found = getRes.data.find(t => t.id === todoId);
      if (found) {
        // DELETE
        const delRes = await request(`/api/todos/${todoId}`, { method: 'DELETE' });
        if (delRes.status === 200) {
          console.log('✅ Todos API - CRUD operations passed');
          passed++;
        } else {
          throw new Error('Delete todo failed');
        }
      } else {
        throw new Error('Created todo not found in list');
      }
    } else {
      throw new Error('Create todo failed');
    }
  } catch (err) {
    console.log('❌ Todos API -', err.message);
    failed++;
  }

  // Test 4: Export CSV API (verifying SPA fallback fix)
  try {
    const res = await request('/api/export/system');
    if (res.status === 200 && res.headers['content-type'].includes('text/csv')) {
      console.log('✅ Export CSV API - Successfully returns CSV instead of SPA HTML');
      passed++;
    } else {
      throw new Error('Export CSV returned status ' + res.status);
    }
  } catch (err) {
    console.log('❌ Export CSV API -', err.message);
    failed++;
  }

  // Test 5: Snippet Exec API (Web Terminal)
  try {
    const res = await request('/api/snippets/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { command: 'echo Hello MoMo' },
    });
    if (res.status === 200 && res.data.ok && res.data.stdout.includes('Hello MoMo')) {
      console.log('✅ Snippet Exec API - Successfully executed CLI command in Web Terminal');
      passed++;
    } else {
      throw new Error('Snippet Exec returned status ' + res.status);
    }
  } catch (err) {
    console.log('❌ Snippet Exec API -', err.message);
    failed++;
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed.`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
