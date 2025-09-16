// This is a Netlify serverless function.
// It securely receives lead data from the form and sends it to your internal CRM.

export default async (req, context) => {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return new Response("Method Not Allowed", { status: 405 });
    }

    // 2. Get CRM connection details from secure environment variables
    // These MUST be set in your Netlify site settings.
    const CRM_ENDPOINT_URL = process.env.CRM_ENDPOINT_URL;
    const CRM_AUTH_TOKEN = process.env.CRM_AUTH_TOKEN; // Example: 'Bearer your-secret-token'

    if (!CRM_ENDPOINT_URL || !CRM_AUTH_TOKEN) {
        console.error("CRM environment variables not set.");
        return new Response("Server configuration error.", { status: 500 });
    }

    try {
        // 3. Get lead data from the frontend request
        const leadData = await req.json();

        // 4. (Optional) Add extra server-side data
        const fullLeadData = {
            ...leadData,
            submissionDate: new Date().toISOString(),
            source: 'Hypoteka-AI-Kalkulacka',
        };

        // 5. Send the data to your internal CRM API
        const crmResponse = await fetch(CRM_ENDPOINT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': CRM_AUTH_TOKEN,
            },
            body: JSON.stringify(fullLeadData),
        });

        // 6. Check if the CRM accepted the data
        if (!crmResponse.ok) {
            const errorText = await crmResponse.text();
            console.error("CRM Error:", errorText);
            // Don't expose internal errors to the client
            return new Response("Failed to submit lead.", { status: 502 }); // 502 Bad Gateway
        }

        // 7. Send a success response back to the frontend
        return new Response(JSON.stringify({ message: "Lead successfully submitted" }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        console.error("Error in submit-lead function:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
};

// Configuration for Netlify to recognize this as a function
export const config = {
  path: "/api/submit-lead",
};
