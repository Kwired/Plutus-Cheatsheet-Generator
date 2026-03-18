const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, 'src', 'articles');

function generateHash() {
    return Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function generateAddr() {
    return 'addr_test1' + Array.from({length: 53}, () => {
        const chars = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
        return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
}

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    if (filePath.endsWith('index.ts')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Add eslint disable if missing
    if (!content.includes('/* eslint-disable react-refresh/only-export-components */')) {
        content = '/* eslint-disable react-refresh/only-export-components */\n' + content;
    }

    // 2. Replace dummy hashes
    const hashRegex = /dummy_[a-zA-Z0-9_]+hash[a-zA-Z0-9_]*#(\d+)/g;
    content = content.replace(hashRegex, (match, p1) => generateHash() + '#' + p1);
    
    const hashRegex2 = /dummy_[a-zA-Z0-9_]+hash[a-zA-Z0-9_]*/g;
    content = content.replace(hashRegex2, (match) => generateHash());

    // 3. Replace dummy addresses
    const addrRegex = /addr_test1_dummy_[a-zA-Z0-9_]+/g;
    content = content.replace(addrRegex, (match) => generateAddr());

    // 4. Add metadata fields if missing
    if (content.includes('export const articleMeta = {')) {
        let metaMatch = content.match(/export const articleMeta = \{([\s\S]*?)\};/);
        if (metaMatch) {
            let metaBody = metaMatch[1];
            
            if (!metaBody.includes('plutusVersion:')) {
                metaBody += ',\n    plutusVersion: "V2"';
            }
            if (!metaBody.includes('complexity:')) {
                let isAdv = metaBody.toLowerCase().includes('advanced') || metaBody.toLowerCase().includes('puzzle');
                let isInt = metaBody.toLowerCase().includes('intermediate');
                let comp = isAdv ? 'Advanced' : (isInt ? 'Intermediate' : 'Beginner');
                metaBody += `,\n    complexity: "${comp}"`;
            }
            if (!metaBody.includes('useCase:')) {
                let useCase = "Smart Contracts";
                if (metaBody.toLowerCase().includes('nft')) useCase = "NFTs";
                if (metaBody.toLowerCase().includes('token')) useCase = "Tokens";
                if (metaBody.toLowerCase().includes('game') || metaBody.toLowerCase().includes('play')) useCase = "Gaming";
                metaBody += `,\n    useCase: "${useCase}"`;
            }
            content = content.replace(metaMatch[0], `export const articleMeta = {${metaBody}\n};`);
        }
    }

    // 5. Replace "How It Really Works" occasionally
    const headings = ['Explanation', 'Deep Dive', 'Breaking It Down', 'Walkthrough'];
    if (content.includes('<h2 id="explanation">How It Really Works</h2>')) {
        const h = headings[Math.floor(Math.random() * headings.length)];
        content = content.replace('<h2 id="explanation">How It Really Works</h2>', `<h2 id="explanation">${h}</h2>`);
    } else if (content.includes('<h2 id="explanation">How It Really Works?</h2>')) {
        const h = headings[Math.floor(Math.random() * headings.length)];
        content = content.replace('<h2 id="explanation">How It Really Works?</h2>', `<h2 id="explanation">${h}</h2>`);
    }
    
    // Remove "No server. No backend. Just math." etc.
    content = content.replace(/No server.\s*No backend.\s*Just math./gi, '');
    content = content.replace(/It's cryptographic law./gi, '');
    content = content.replace(/It's not a suggestion — it's cryptographic law./gi, '');

    if (content !== originalContent) {
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
