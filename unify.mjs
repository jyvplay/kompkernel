import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// --- CONFIGURATION ---
const OLD_PKG_NAME = 'kompgpt56txhapex';
const NEW_PKG_NAME = 'kompkernel';
const OLD_REPO_PATH = 'jyvplay/kompgpt56txhapex';
const NEW_REPO_PATH = 'jyvplay/kompkernel';
const OLD_REPO_URL = `https://github.com/${OLD_REPO_PATH}`;
const NEW_REPO_URL = `https://github.com/${NEW_REPO_PATH}`;
const HISTORICAL_PKGS = ['kompgpt56txhapex', 'veritas-kompg45', 'kompg45', 'veritas-kompco46', 'kompco46', 'gpt56lxh', 'g31ppv2', 'unkbv10', 'veritas-co46t5b'];
// ---------------------

console.log(`🚀 Starting Hardened Unified Migration Script for ${NEW_PKG_NAME}...`);

const npmPkgPath = path.resolve('node_modules', OLD_PKG_NAME, 'package.json');
if (!fs.existsSync(npmPkgPath)) {
    console.log(`📦 Base package not found. Installing ${OLD_PKG_NAME}...`);
    execSync(`npm install ${OLD_PKG_NAME} --no-save`, { stdio: 'inherit' });
}

console.log("2. Merging package.json dependencies...");
const localPkgPath = path.resolve('package.json');
const localPkg = JSON.parse(fs.readFileSync(localPkgPath, 'utf-8'));
const npmPkg = JSON.parse(fs.readFileSync(npmPkgPath, 'utf-8'));

localPkg.dependencies = { ...npmPkg.dependencies, ...localPkg.dependencies };
for (const pkg of HISTORICAL_PKGS) {
    delete localPkg.dependencies[pkg];
}
localPkg.name = NEW_PKG_NAME;
localPkg.version = "1.0.0";

if (localPkg.repository) {
    if (typeof localPkg.repository === 'string') localPkg.repository = NEW_REPO_URL;
    else localPkg.repository.url = `git+${NEW_REPO_URL}.git`;
}
if (localPkg.bugs) localPkg.bugs.url = `${NEW_REPO_URL}/issues`;
if (localPkg.homepage) localPkg.homepage = `${NEW_REPO_URL}#readme`;

fs.writeFileSync(localPkgPath, JSON.stringify(localPkg, null, 2));

console.log("3. Fusing src directories...");
if (fs.existsSync('src_advanced')) fs.rmSync('src_advanced', { recursive: true, force: true });
fs.renameSync('src', 'src_advanced');
fs.cpSync(path.join('node_modules', OLD_PKG_NAME, 'src'), 'src', { recursive: true });

console.log("4. Merging Advanced Overlay & Resolving Base Overrides...");

const pkgRegexStr = `(?:${HISTORICAL_PKGS.join('|')})`;

// Pass 1: Dissolve pure shims
function removePureShims(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            removePureShims(fullPath);
        } else {
            const relPath = path.relative('src_advanced', fullPath);
            const normalizedRelPath = relPath.split(path.sep).join('/');
            const expectedImportPath = normalizedRelPath.replace(/\.[jt]sx?$/, '');
            const isIndex = expectedImportPath.endsWith('/index');
            const dirPath = isIndex ? expectedImportPath.substring(0, expectedImportPath.length - 6) : expectedImportPath;
            const escapedPath = dirPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            let content = fs.readFileSync(fullPath, 'utf-8');
            const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '').trim();
            const exportRegex = new RegExp(`^(?:export\\s+(?:\\*|\\{[^}]+\\})\\s+from\\s+['"](?:(?:\\.\\.\\/)*node_modules\\/)?${pkgRegexStr}/src/(?:${escapedPath}|${escapedPath}/index)(?:\\.[jt]sx?)?['"];?\\s*)+$`);
            
            if (exportRegex.test(stripped)) {
                console.log(`    -> Dissolving pure pass-through shim: ${relPath}`);
                fs.unlinkSync(fullPath);
            }
        }
    }
}
removePureShims('src_advanced');

// Pass 2: Identify overwritten bases
const renamedBases = new Set();
function renameOverwrittenBases(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            renameOverwrittenBases(fullPath);
        } else {
            const relPath = path.relative('src_advanced', fullPath);
            const targetPath = path.join('src', relPath);
            if (fs.existsSync(targetPath)) {
                const ext = path.extname(targetPath);
                const origPath = targetPath.replace(new RegExp(`\\${ext}$`), `.orig${ext}`);
                
                if (!fs.existsSync(origPath)) {
                    fs.renameSync(targetPath, origPath);
                }
                
                const normalizedRelPath = relPath.split(path.sep).join('/');
                const importPath = normalizedRelPath.replace(/\.[jt]sx?$/, '');
                renamedBases.add(importPath);
            }
        }
    }
}
renameOverwrittenBases('src_advanced');

// Pass 3: Rewrite imports in src_advanced and copy to src
function rewriteImportsAndCopy(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const relPath = path.relative('src_advanced', fullPath);
        const targetPath = path.join('src', relPath);

        if (fs.statSync(fullPath).isDirectory()) {
            if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
            rewriteImportsAndCopy(fullPath);
        } else {
            let content = fs.readFileSync(fullPath, 'utf-8');
            
            for (const baseImport of renamedBases) {
                const escapedPath = baseImport.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const importRegex = new RegExp(`['"](?:(?:\\.\\.\\/)*node_modules\\/)?${pkgRegexStr}/src/(?:${escapedPath}(?:\\.orig)?|${escapedPath}/index)(?:\\.[jt]sx?)?['"]`, 'g');
                
                const currentDir = path.dirname(relPath);
                let relativeToOrig = path.relative(currentDir, baseImport);
                if (!relativeToOrig.startsWith('.')) relativeToOrig = './' + relativeToOrig;
                relativeToOrig = relativeToOrig + '.orig';
                
                content = content.replace(importRegex, `"${relativeToOrig}"`);
            }
            
            fs.writeFileSync(targetPath, content, 'utf-8');
        }
    }
}
rewriteImportsAndCopy('src_advanced');
fs.rmSync('src_advanced', { recursive: true, force: true });

console.log("5. Scorched Earth Cleanup of Sidecar Artifacts...");
const cssPath = path.join('src', 'index.css');
if (fs.existsSync(cssPath)) {
    let css = fs.readFileSync(cssPath, 'utf-8');
    const cssRegex = new RegExp(`@source\\s+"(?:\\.\\.\\/)*node_modules/${pkgRegexStr}/src";?\\r?\\n?`, 'g');
    css = css.replace(cssRegex, '');
    fs.writeFileSync(cssPath, css);
}

const viteConfigPath = 'vite.config.ts';
if (fs.existsSync(viteConfigPath)) {
    const cleanViteConfig = `import path from "path";\nimport { fileURLToPath } from "url";\nimport tailwindcss from "@tailwindcss/vite";\nimport react from "@vitejs/plugin-react";\nimport { defineConfig } from "vite";\nimport { viteSingleFile } from "vite-plugin-singlefile";\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss(), viteSingleFile()],\n  resolve: {\n    alias: {\n      "@": path.resolve(__dirname, "src"),\n    }\n  }\n});`;
    fs.writeFileSync(viteConfigPath, cleanViteConfig);
}

const tsconfigPath = 'tsconfig.json';
if (fs.existsSync(tsconfigPath)) {
    try {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
        if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
            tsconfig.compilerOptions.paths['@/*'] = ["./src/*"];
        }
        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    } catch (e) {
        console.log("Note: Could not parse tsconfig.json automatically.");
    }
}

if (fs.existsSync('script.js')) fs.rmSync('script.js');
if (fs.existsSync(localPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(localPkgPath, 'utf-8'));
    if (pkg.scripts && pkg.scripts.build) pkg.scripts.build = "vite build";
    fs.writeFileSync(localPkgPath, JSON.stringify(pkg, null, 2));
}

console.log("6. Rewriting NPM imports and cleaning comments...");
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.md', '.html', '.json'];

function patchFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            patchFiles(fullPath);
        } else if (EXTENSIONS.includes(path.extname(fullPath))) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let originalContent = content;

            // 1. Replace quotes-based imports: "kompgpt56txhapex/src/X" -> "@/$1"
            const allImportsRegex = new RegExp(`['"](?:(?:\\.\\.\\/)*node_modules\\/)?${pkgRegexStr}/src/([^'"]+)['"]`, 'g');
            content = content.replace(allImportsRegex, "'@/$1'");

            // 2. Replace node_modules/pkg/ in comments/docstrings with node_modules/
            const nodeModulesPkgRegex = new RegExp(`node_modules/${pkgRegexStr}/`, 'g');
            content = content.replace(nodeModulesPkgRegex, 'node_modules/');

            // 3. Replace pkg/src/ in comments/docstrings with src/
            const commentPathRegex = new RegExp(`${pkgRegexStr}/src/`, 'g');
            content = content.replace(commentPathRegex, 'src/');

            // 4. Replace standalone package names with NEW_PKG_NAME
            for (const pkg of HISTORICAL_PKGS) {
                content = content.replaceAll(pkg, NEW_PKG_NAME);
            }
            content = content.replaceAll(OLD_REPO_URL, NEW_REPO_URL);
            content = content.replaceAll(OLD_REPO_PATH, NEW_REPO_PATH);

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf-8');
            }
        }
    }
}
patchFiles('src');
patchFiles('public');

['README.md', 'index.html'].forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf-8');
        let originalContent = content;
        for (const pkg of HISTORICAL_PKGS) {
            content = content.replaceAll(pkg, NEW_PKG_NAME);
        }
        content = content.replaceAll(OLD_REPO_URL, NEW_REPO_URL);
        content = content.replaceAll(OLD_REPO_PATH, NEW_REPO_PATH);
        if (content !== originalContent) fs.writeFileSync(file, content, 'utf-8');
    }
});

console.log("7. Cleaning up...");
fs.rmSync(path.join('node_modules', OLD_PKG_NAME), { recursive: true, force: true });
if (fs.existsSync('package-lock.json')) fs.rmSync('package-lock.json');
execSync('npm install', { stdio: 'inherit' });

console.log(`✅ Unification complete! Push to ${NEW_REPO_PATH} and publish to NPM as ${NEW_PKG_NAME}.`);