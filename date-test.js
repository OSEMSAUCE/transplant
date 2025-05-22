// // Test the date parsing with problematic formats
// // Run this with: node date-test.js

// // Mock the date parsing functions
// const monthNamesLong = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// const monthNamesShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// function testDateParsing(value) {
//   console.log(`\nTesting date: "${value}"`);
  
//   let dateObj = null;
  
//   // Flexible month-year combos
//   if (!dateObj) {
//     const flex = value.match(/^\s*([A-Za-z]{3,})\s*[,\.]?\s*(\d{4})\s*$/i) || 
//                  value.match(/^\s*(\d{4})\s*[,\.]?\s*([A-Za-z]{3,})\s*$/i);
    
//     console.log(`FLEX_MATCH: ${flex ? 'matched' : 'no match'}`);
    
//     if (flex) {
//       let monthStr, year;
//       if (isNaN(Number(flex[1]))) {
//         monthStr = flex[1].toLowerCase();
//         year = parseInt(flex[2]);
//       } else {
//         year = parseInt(flex[1]);
//         monthStr = flex[2].toLowerCase();
//       }
      
//       console.log(`EXTRACTED: month='${monthStr}', year=${year}`);
      
//       // More robust month matching
//       let monthNum = -1;
//       for (let i = 0; i < monthNamesLong.length; i++) {
//         if (monthStr.startsWith(monthNamesLong[i]) || monthNamesLong[i].startsWith(monthStr)) {
//           monthNum = i;
//           break;
//         }
//       }
      
//       if (monthNum === -1) {
//         for (let i = 0; i < monthNamesShort.length; i++) {
//           if (monthStr.startsWith(monthNamesShort[i]) || monthNamesShort[i].startsWith(monthStr)) {
//             monthNum = i;
//             break;
//           }
//         }
//       }
      
//       console.log(`MONTH_NUM: ${monthNum}`);
      
//       if (monthNum !== -1) {
//         dateObj = new Date(year, monthNum, 1, 0, 0, 0);
//         console.log(`CREATED_DATE: ${dateObj.toISOString()}`);
//       }
//     }
//   }
  
//   // Standalone month
//   if (!dateObj) {
//     const m = value.match(/^\s*([A-Za-z]{3,})\s*$/i);
    
//     console.log(`STANDALONE_MATCH: ${m ? 'matched' : 'no match'}`);
    
//     if (m) {
//       const monthStr = m[1].toLowerCase();
//       const now = new Date();
//       const year = now.getFullYear() - 1;
      
//       // More robust month matching
//       let monthNum = -1;
//       for (let i = 0; i < monthNamesLong.length; i++) {
//         if (monthStr.startsWith(monthNamesLong[i]) || monthNamesLong[i].startsWith(monthStr)) {
//           monthNum = i;
//           break;
//         }
//       }
      
//       if (monthNum === -1) {
//         for (let i = 0; i < monthNamesShort.length; i++) {
//           if (monthStr.startsWith(monthNamesShort[i]) || monthNamesShort[i].startsWith(monthStr)) {
//             monthNum = i;
//             break;
//           }
//         }
//       }
      
//       console.log(`STANDALONE_MONTH_NUM: ${monthNum}`);
      
//       if (monthNum !== -1) {
//         dateObj = new Date(year, monthNum, 1, 0, 0, 0);
//         console.log(`STANDALONE_DATE: ${dateObj.toISOString()}`);
//       }
//     }
//   }
  
//   return dateObj ? dateObj.toISOString() : "Not parsed";
// }

// // Test the problematic formats
// const testDates = [
//   "August",
//   "Aug",
//   "2024 Feb",
//   "March 2027",
//   "April 2028",
//   "Jun 2029",
//   "2031 December",
//   "2033, November",
//   "October 2015"
// ];

// testDates.forEach(date => {
//   const result = testDateParsing(date);
//   console.log(`Final result: ${result}`);
// });
