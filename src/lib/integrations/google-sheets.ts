/**
 * Google Sheets Integration
 * Handles OAuth flow and sheet updates
 */

export interface GoogleSheetsConfig {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Append rows to a Google Sheet
 */
export async function appendToSheet(
  config: GoogleSheetsConfig,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.statusText}`);
  }
}

/**
 * OAuth URLs (to be implemented with full OAuth flow)
 */
export function getGoogleSheetsAuthUrl(redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

