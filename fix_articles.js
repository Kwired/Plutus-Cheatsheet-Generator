const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, 'src', 'articles');

function generateHash() {
    return Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateAddr() {
    // Generate a realistic looking testnet address
    return 'addr_test1' + Array.from({length: 53}, () => {
        const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'; // bech32 charset without 1,b,i,o
        return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    if (filePath.endsWith('index.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // 1. Add eslint disable if missing
    if (!content.includes('/* eslint-disable react-refresh/only-export-components */')) {
        content = '/* eslint-disable react-refresh/only-export-components */\n' + content;
        changed = true;
    }

    // 2. Replace dummy hashes
    const hashRegex = /dummy_[a-zA-Z0-9_]+hash[a-zA-Z0-9_]*#(\d+)/g;
    if (hashRegex.test(content)) {
        content = content.replace(hashRegex, (match, p1) => {
            return generateHash() + '#' + p1;
        });
        changed = true;
    }
    
    // Also replace standalone dummy hashes without #0
    const hashRegex2 = /dummy_[a-zA-Z0-9_]+hash[a-zA-Z0-9_]*/g;
    if (hashRegex2.test(content)) {
        content = content.replace(hashRegex2, (match) => {
            return generateHash();
        });
        changed = true;
    }

    // 3. Replace dummy addresses
    const addrRegex = /addr_test1_dummy_[a-zA-Z0-9_]+/g;
    if (addrRegex.test(content)) {
        content = content.replace(addrRegex, (match) => {
            return generateAddr();
        });
        changed = true;
    }

    // 4. Check for missing metadata fields
    if (content.includes('export const articleMeta = {')) {
        let metaMatch = content.match(/export const articleMeta = \{([\s\S]*?)\};/);
        if (metaMatch) {
            let metaBody = metaMatch[1];
            let metaChanged = false;
            
            if (!metaBody.includes('plutusVersion:')) {
                metaBody += ',\n    plutusVersion: "V2"';
                metaChanged = true;
            }
            if (!metaBody.includes('complexity:')) {
                let isAdvanced = metaBody.includes('advanced') || metaBody.includes('puzzle');
                let isIntermediate = metaBody.includes('intermediate') || metaBody.includes('Intermediate');
                let comp = isAdvanced ? 'Advanced' : (isIntermediate ? 'Intermediate' : 'Beginner');
                metaBody += `,\n    complexity: "${comp}"`;
                metaChanged = true;
            }
            if (!metaBody.includes('useCase:')) {
                let useCase = "Smart Contracts";
                if (metaBody.includes('nft') || metaBody.includes('NFT')) useCase = "NFTs";
                if (metaBody.includes('token')) useCase = "Tokens";
                if (metaBody.includes('game') || metaBody.includes('play')) useCase = "Gaming";
                metaBody += `,\n    useCase: "${useCase}"`;
                metaChanged = true;
            }
            
            if (metaChanged) {
                content = content.replace(metaMatch[0], `export const articleMeta = {${metaBody}\n};`);
                changed = true;
            }
        }
    }

    // 5. Replace "How It Really Works" occasionally to "Explanation" if we want to vary
    // Wait, the user said "do the same things for all articles".
    // I already manually varied the 7 new ones. Let's just catch any remaining ones and vary if needed.
    if (content.includes('<h2 id="explanation">How It Really Works</h2>')) {
        const headings = ['Explanation', 'Deep Dive', 'Breaking It Down', 'Walkthrough'];
        const randomHeading = headings[Math.floor(Math.random() * headings.length)];
        content = content.replace('<h2 id="explanation">How It Really Works</h2>', `<h2 id="explanation">${randomHeading}</h2>`);
        changed = true;
    }

    // Remove AI Catchphrases
    const catchphrases = [
        "No server. No backend. Just math.",
        "It's not a suggestion — it's cryptographic law.",
        "It's cryptographic law.",
        "Just math.",
        "No backend."
    ];
    for (const phrase of catchphrases) {
        if (content.includes(phrase)) {
            content = content.replace(new RegExp(phrase, 'gi'), '');
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${path.basename(filePath)}`);
    }
}

function run() {
    const files = fs.readdirSync(articlesDir);
    for (const file of files) {
        processFile(path.join(articlesDir, file));
    }
    console.log("Done processing all files.");
}

run();
