const https = require('https');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/horarios?tipo=horarios&facultad=Ingenieria%20De%20Sistemas%20E%20Inform%C3%A1tica',
    method: 'GET',
    rejectUnauthorized: false
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            console.log(JSON.stringify(result.horarios.slice(0, 5), null, 2));
        } catch (e) {
            console.error(e.message);
        }
    });
});

req.on('error', (e) => { console.error(e.message); });
req.end();
