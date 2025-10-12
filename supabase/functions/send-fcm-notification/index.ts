import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface FCMNotification {
  user_id: string;
  title: string;
  message: string;
  document_id?: string;
  type: 'high_risk_alert' | 'analysis_failed' | 'analysis_success';
}

// --- Main Server Logic ---
serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const notification: FCMNotification = await req.json();

    // Validate payload
    if (!notification.user_id || !notification.title || !notification.message || !notification.type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // ** MOCK IMPLEMENTATION **
    // In a real implementation, you would:
    // 1. Fetch the user's FCM token from the 'user_profiles' table in Supabase.
    // 2. Construct a payload for the Firebase Admin SDK.
    // 3. Send the message using `admin.messaging().send()`.

    console.log(`[MOCK FCM SENT]`);
    console.log(`  - To: ${notification.user_id}`)
    console.log(`  - Title: ${notification.title}`);
    console.log(`  - Message: ${notification.message}`);
    console.log(`  - Type: ${notification.type}`);
    if (notification.document_id) {
        console.log(`  - Document ID: ${notification.document_id}`);
    }

    // Simulate a successful FCM send
    return new Response(JSON.stringify({ success: true, message: "Mock FCM sent successfully" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (e: any) {
    console.error('Error sending FCM notification:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
