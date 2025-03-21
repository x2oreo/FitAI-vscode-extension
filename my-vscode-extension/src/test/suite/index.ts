import * as path from 'path';
import Mocha from 'mocha';
import glob = require('glob');

export function runTests(): void {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');

    glob('**/*.test.js', { cwd: testsRoot }, (err, files) => {
        if (err) {
            throw err;
        }

        // Add each file to the mocha instance
        files.forEach(file => mocha.addFile(path.resolve(testsRoot, file)));

        try {
            // Run the mocha test
            mocha.run(failures => {
                process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
            });
        } catch (err) {
            console.error(err);
            process.exitCode = 1; // exit with non-zero status on error
        }
    });
}