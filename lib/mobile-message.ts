// Comment: Mobile Message (mobilemessage.com.au) REST SMS — Basic Auth

function toAuMobileRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('61') && digits.length === 11) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return digits;
  }
  return phone.trim();
}

export async function sendMobileMessageSMS(
  to: string,
  message: string,
): Promise<{ success: boolean; messageId?: string; error?: string; details?: unknown }> {
  const username = process.env.MOBILE_MESSAGE_API_USERNAME?.trim();
  const password = process.env.MOBILE_MESSAGE_API_PASSWORD?.trim();
  const sender = process.env.MOBILE_MESSAGE_SENDER_ID?.trim();

  if (!username || !password || !sender) {
    return {
      success: false,
      error:
        'Mobile Message is not configured. Set MOBILE_MESSAGE_API_USERNAME, MOBILE_MESSAGE_API_PASSWORD, and MOBILE_MESSAGE_SENDER_ID.',
    };
  }

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const recipient = toAuMobileRecipient(to);

  try {
    const res = await fetch('https://api.mobilemessage.com.au/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        messages: [
          {
            to: recipient,
            message,
            sender,
          },
        ],
      }),
    });

    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep raw text
    }

    if (!res.ok) {
      const errMsg =
        typeof parsed === 'object' &&
        parsed !== null &&
        'message' in parsed &&
        typeof (parsed as { message?: unknown }).message === 'string'
          ? (parsed as { message: string }).message
          : text || `HTTP ${res.status}`;
      return { success: false, error: errMsg, details: parsed };
    }

    let messageId: string | undefined;
    if (typeof parsed === 'object' && parsed !== null && 'results' in parsed) {
      const results = (parsed as { results?: Array<{ message_id?: string }> }).results;
      messageId = results?.[0]?.message_id;
    }

    return { success: true, messageId, details: parsed };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to send SMS';
    return { success: false, error: msg };
  }
}
