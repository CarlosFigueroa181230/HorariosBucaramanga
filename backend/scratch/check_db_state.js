const db = require('../db');

async function checkDuplicates() {
    try {
        console.log('--- Checking Asignatura table ---');
        const [rows] = await db.query('SELECT * FROM Asignatura');
        console.log(`Total rows: ${rows.length}`);
        
        const counts = {};
        rows.forEach(r => {
            counts[r.nombre] = (counts[r.nombre] || 0) + 1;
        });
        
        const duplicates = Object.keys(counts).filter(name => counts[name] > 1);
        console.log('Duplicate names found:', duplicates);
        
        if (duplicates.length > 0) {
            console.log('Example duplicate details:');
            const [dups] = await db.query('SELECT * FROM Asignatura WHERE nombre IN (?)', [duplicates.slice(0, 5)]);
            console.table(dups);
        }

        console.log('\n--- Checking Publicacion headers ---');
        const [headers] = await db.query('SELECT count(*) as count FROM Publicacion WHERE nrc = "HEADER"');
        console.log(`Total header rows: ${headers[0].count}`);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkDuplicates();
