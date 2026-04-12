const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

async function run() {
    const securityDir = path.join(__dirname, 'security');
    if (!fs.existsSync(securityDir)){
        fs.mkdirSync(securityDir);
    }

    const attrs = [{ name: 'commonName', value: 'localhost' }];
    
    try {
        console.log('⏳ Generando certificados...');
        // await para la versión asíncrona
        const pems = await selfsigned.generate(attrs, { days: 365 });
        
        if (!pems || !pems.private || !pems.cert) {
            console.error('❌ Error: El objeto generado no tiene las propiedades esperadas:', pems);
            process.exit(1);
        }

        fs.writeFileSync(path.join(securityDir, 'server.key'), pems.private);
        fs.writeFileSync(path.join(securityDir, 'server.cert'), pems.cert);

        console.log('✅ Certificados SSL generados exitosamente en backend/security/');
    } catch (err) {
        console.error('❌ Error durante la generación:', err);
        process.exit(1);
    }
}

run();
