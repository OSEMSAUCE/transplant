// Simple test script for date parsing logic
const formatDetection = require('./src/lib/transferComponents/formatDetection2');

// Test cases
const testDates = [
  "August",
  "Aug",
  "2024 Feb",
  "March 2027",
  "April 2028",
  "Jun 2029",
  "2031 December",
  "2033, November",
  "October 2015"
];

// Test each date format
console.log("Testing date parsing for problematic formats:");
console.log("=============================================");

testDates.forEach(dateStr => {
  console.log(`\nTesting: "${dateStr}"`);
  
  // Check if it's recognized as a date
  const isDate = formatDetection.isDate(dateStr);
  console.log(`Recognized as date: ${isDate}`);
  
  // Try to format it
  if (isDate) {
    const formatted = formatDetection.formatValue('date', dateStr);
    console.log(`Formatted result: ${formatted}`);
  } else {
    console.log("Not recognized as a date - no formatting attempted");
  }
});
