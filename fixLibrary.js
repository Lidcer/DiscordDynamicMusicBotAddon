//@ts-check

// fixes one library in order for build without any errors
const fs = require('fs');
const path = require('path');
const problemFile = path.join(__dirname, 'node_modules', 'prism-media', 'typings', 'opus.d.ts');

fs.readFile(path.join(__dirname, 'node_modules', 'prism-media', 'typings', 'opus.d.ts'), 'utf8', (err, data) => {
    if (err) {
        throw err;
    }
    if (!data.includes('export class OpusStream extends Transform')) {
        data = data.replace('class OpusStream extends Transform', 'export class OpusStream extends Transform')

        fs.writeFile(problemFile, data, (err) => {
            if (err) {
                throw err;
            }
        });
    }
})
