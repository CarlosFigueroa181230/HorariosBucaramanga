const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'UPB-BETA');

const files = fs.readdirSync(frontendDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(frontendDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('http://localhost:3000')) {
        console.log(`Updating ${file}...`);
        content = content.replace(/http:\/\/localhost:3000/g, 'https://localhost:3000');
        fs.writeFileSync(filePath, content, 'utf8');
    }
});

console.log('✅ Todos los archivos del frontend actualizados a HTTPS.');
