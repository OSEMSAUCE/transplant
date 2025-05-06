// const data is what we're sending to the DB
// src/lib/transferComponents/dbButton.ts

// we need to take teh data from the browser and put in here somehow. 

export async function submitToDB(data: Record<string, any>) {
    try {
      const response = await fetch('/api/submitToDB', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
  
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unknown error');
      }
      console.log('DB submission result:', result);
      return result;
    } catch (err) {
      console.error('Failed to submit to DB:', err);
      return { success: false, error: (err as any).message };
    }
}