import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Get all stores from database
    const storeRecord = await prisma.store.findUnique({
      where: { id: shop },
    });

    const stores = Array.isArray(storeRecord?.shop) ? storeRecord.shop : [];

    if (stores.length > 0) {
      // Get proper shop ID via GraphQL
      const shopQuery = await admin.graphql(`
        query {
          shop {
            id
          }
        }
      `);

      const shopData = await shopQuery.json();
      const shopId = shopData.data?.shop?.id;

      if (!shopId) {
        throw new Error("Could not retrieve shop ID");
      }

      await admin.graphql(
        `
        mutation CreateMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              value
              type
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
        {
          variables: {
            metafields: [
              {
                ownerId: shopId,
                namespace: "store_locator",
                key: "locations",
                type: "json",
                value: JSON.stringify(stores),
              },
            ],
          },
        },
      );

      await admin.graphql(
        `
        mutation CreateMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              value
              type
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
        {
          variables: {
            metafields: [
              {
                ownerId: shopId,
                namespace: "store_locator",
                key: "total_stores",
                type: "number_integer",
                value: stores.length.toString(),
              },
            ],
          },
        },
      );

      return json({
        success: true,
        message: `Successfully synced ${stores.length} stores to metafields`,
        stores: stores.length,
      });
    } else {
      return json({
        success: true,
        message: "No stores found to sync",
        stores: 0,
      });
    }
  } catch (error) {
    console.error("Sync error:", error);
    return json(
      {
        success: false,
        message: "Error syncing stores to metafields",
        error: error.message,
      },
      { status: 500 },
    );
  }
};

export default function SyncMetafields() {
  return null; // This route is API-only
}
