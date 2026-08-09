import fs from 'fs';
import path from 'path';

console.log("🔍 Running Pre-Build Diagnostics...");

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
    if (condition) {
        console.log(`  ✅ ${name}`);
        passed++;
    } else {
        console.error(`  ❌ ${name} ${detail ? `— ${detail}` : ""}`);
        failed++;
    }
}

check("App.tsx wrapper preserved", fs.existsSync('src/App.tsx'), "App.tsx deleted.");

let ghostImports = 0;
function walk(dir) {
    for (const file of fs.readdirSync(dir)) {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
            const content = fs.readFileSync(p, 'utf-8');
            if (content.includes('kompgpt56txhapex/') || content.includes('veritas-kompg45/') || content.includes('kompg45/') || content.includes('veritas-kompco46/') || content.includes('kompco46/') || content.includes('gpt56lxh/') || content.includes('g31ppv2/') || content.includes('unkbv10/')) {
                ghostImports++;
                console.error(`    ⚠ Ghost import found in ${p}`);
            }
        }
    }
}
walk('src');
check("Zero ghost package imports", ghostImports === 0, `${ghostImports} files reference old packages.`);

console.log(`\n📊 Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);