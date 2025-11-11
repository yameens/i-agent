/**
 * Salesforce Integration
 * Handles OAuth flow and lead/note creation
 */

export interface SalesforceConfig {
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
}

export interface SalesforceLead {
  Company: string;
  LastName: string;
  Phone: string;
  Description: string;
}

/**
 * Create a lead in Salesforce
 */
export async function createSalesforceLead(
  config: SalesforceConfig,
  lead: SalesforceLead
): Promise<{ id: string }> {
  const response = await fetch(`${config.instanceUrl}/services/data/v59.0/sobjects/Lead`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(lead),
  });

  if (!response.ok) {
    throw new Error(`Salesforce API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Add a note to a Salesforce lead
 */
export async function addSalesforceNote(
  config: SalesforceConfig,
  leadId: string,
  noteBody: string
): Promise<{ id: string }> {
  const response = await fetch(
    `${config.instanceUrl}/services/data/v59.0/sobjects/ContentNote`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Title: "Retail Interview Insights",
        Content: Buffer.from(noteBody).toString("base64"),
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Salesforce API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * OAuth URLs (to be implemented with full OAuth flow)
 */
export function getSalesforceAuthUrl(redirectUri: string): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID!;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "api refresh_token",
  });

  return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
}

