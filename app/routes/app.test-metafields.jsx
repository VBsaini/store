import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);

    // Query metafields directly
    const response = await admin.graphql(`
      query {
        shop {
          id
          myshopifyDomain
          metafields(first: 20, namespace: "store_locator") {
            edges {
              node {
                id
                namespace
                key
                value
                type
                description
              }
            }
          }
        }
      }
    `);

    const data = await response.json();

    return json({
      shop: data.data?.shop || null,
      metafields: data.data?.shop?.metafields?.edges || [],
      rawData: data,
    });
  } catch (error) {
    return json({
      error: error.message,
      shop: null,
      metafields: [],
    });
  }
};

export default function TestMetafields() {
  const { shop, metafields, error, rawData } = useLoaderData();

  return (
    <Page title="Test Metafields">
      <Card>
        <div style={{ padding: "20px" }}>
          <h2>Shop Information</h2>
          {shop && (
            <div>
              <p>
                <strong>Shop ID:</strong> {shop.id}
              </p>
              <p>
                <strong>Domain:</strong> {shop.myshopifyDomain}
              </p>
            </div>
          )}

          <h2>Store Locator Metafields</h2>
          {metafields.length > 0 ? (
            <div>
              {metafields.map((edge, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "15px",
                    padding: "10px",
                    border: "1px solid #ccc",
                  }}
                >
                  <p>
                    <strong>Key:</strong> {edge.node.key}
                  </p>
                  <p>
                    <strong>Type:</strong> {edge.node.type}
                  </p>
                  <p>
                    <strong>Value:</strong> {edge.node.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No store_locator metafields found</p>
          )}

          {error && (
            <div>
              <h3>Error:</h3>
              <p>{error}</p>
            </div>
          )}

          <details>
            <summary>Raw GraphQL Response</summary>
            <pre
              style={{
                background: "#f5f5f5",
                padding: "10px",
                overflow: "auto",
              }}
            >
              {JSON.stringify(rawData, null, 2)}
            </pre>
          </details>
        </div>
      </Card>
    </Page>
  );
}
