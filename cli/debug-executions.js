const Database = require('better-sqlite3');
const path = require('path');

// Quick debug script to examine executions
const dbPath = path.join(process.cwd(), '.sentient', 'knowledge.db');
const db = new Database(dbPath);

console.log('🔍 Examining all executions in database:\n');

const executions = db.prepare(`
  SELECT id, timestamp, prompt, success, reasoning, outcome 
  FROM executions 
  ORDER BY timestamp DESC
`).all();

console.log(`Found ${executions.length} executions:\n`);

executions.forEach((exec, index) => {
  console.log(`${index + 1}. ID: ${exec.id}`);
  console.log(`   📅 Time: ${exec.timestamp}`);
  console.log(`   📝 Prompt: ${exec.prompt?.substring(0, 60)}...`);
  console.log(`   ✅ Success: ${exec.success === 1 ? 'YES' : 'NO'}`);
  console.log(`   🧠 Reasoning: ${exec.reasoning?.substring(0, 60)}...`);
  console.log(`   🎯 Outcome: ${exec.outcome?.substring(0, 60)}...`);
  console.log('');
});

// Summary
const successful = executions.filter(e => e.success === 1).length;
const failed = executions.filter(e => e.success === 0).length;

console.log('📊 Summary:');
console.log(`   ✅ Successful: ${successful}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📈 Success Rate: ${((successful / executions.length) * 100).toFixed(1)}%`);

db.close();
