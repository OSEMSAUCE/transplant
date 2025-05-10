//  To test this file run this command: 
//   npx ts-node src/lib/transferComponents/formatDetectionTest.ts
// Update the array of values in testArray and run again.
const FormatDetection_1 = require("../src/lib/transferComponents/FormatDetection");
// Example test array
const testArray = [
    '2022-01-01',
    'ES',
    '12/12/2020',
    'France',
    '1999',
    '2025-05-10',
    '48.123,-122.456',
    '123',
    'foo'
];
// Per-value detection
console.log('Per-value detection:');
testArray.forEach((val, idx) => {
    console.log(`[${idx}] "${val}": isDate=${(0, FormatDetection_1.isDate)(val)}, isNumber=${(0, FormatDetection_1.isNumber)(val)}, isGps=${(0, FormatDetection_1.isGps)(val)}`);
});
// Column format detection
const format = (0, FormatDetection_1.detectFormat)(testArray, 'TestColumn');
console.log(`\nColumn detectFormat: ${format}`);
