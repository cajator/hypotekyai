// This is a Netlify serverless function.
// It acts as a secure proxy to the Google Gemini API.

export default async (req, context) => {
    // 1. Check if the request method is POST.
    if (req.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    // 2. Get the Gemini API Key from environment variables.
    // This key MUST be set in your Netlify site settings.
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return new Response("API key is not configured.", { status: 500 });
    }

    try {
        // 3. Get the request body from the frontend.
        const requestBody = await req.json();

        // 4. Construct the URL for the Gemini API.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

        // 5. Forward the request to the Gemini API.
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody), // The body is passed through from the client
        });

        // 6. Handle the response from Gemini.
        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API Error:", errorText);
            return new Response(errorText, { status: geminiResponse.status });
        }

        const geminiData = await geminiResponse.json();
        
        // 7. Send the successful response back to the frontend.
        return new Response(JSON.stringify(geminiData), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error in serverless function:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
};

// Configuration for Netlify to recognize this as a function
export const config = {
  path: "/api/gemini",
};
