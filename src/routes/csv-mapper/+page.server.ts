export const ssr = false;  // Isolate server-side rendering
export const csr = true;   // Only run on client-side 

export const load = async () => {
  return {
    // Return empty data to prevent server-side errors
    status: 200,
    data: {}
  };
}; 