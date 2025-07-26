import { useEffect, useState } from "react";
import { json } from "@remix-run/node";
import {
  useActionData,
  useLoaderData,
  useSubmit,
  useFetcher,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // Get store count from database
  const storeRecord = await prisma.store.findUnique({
    where: { id: session.shop },
  });
  const storeCount = Array.isArray(storeRecord?.shop)
    ? storeRecord.shop.length
    : 0;

  return json({
    shop: session.shop,
    hasProducts: true,
    storeCount,
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Handle any actions here
  return json({ success: true });
};

export default function Index() {
  const { shop, hasProducts, storeCount } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const syncFetcher = useFetcher();
  const [syncMessage, setSyncMessage] = useState("");

  const generateProduct = () => submit({}, { replace: true, method: "POST" });

  const handleSyncMetafields = () => {
    syncFetcher.load("/app/sync-metafields");
  };

  useEffect(() => {
    if (syncFetcher.data) {
      setSyncMessage(syncFetcher.data.message);
      setTimeout(() => setSyncMessage(""), 5000); // Clear message after 5 seconds
    }
  }, [syncFetcher.data]);

  return (
    <Page>
      <TitleBar title="Store Locator App" />
      <BlockStack gap="500">
        {syncMessage && (
          <Banner
            tone={syncFetcher.data?.success ? "success" : "critical"}
            onDismiss={() => setSyncMessage("")}
          >
            {syncMessage}
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Welcome to Store Locator App! 🗺️
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Get started by setting up your store locations and
                    configuring your map display. You currently have{" "}
                    {storeCount} store{storeCount !== 1 ? "s" : ""} configured.
                  </Text>
                </BlockStack>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Quick Actions
                  </Text>
                  <InlineStack gap="300">
                    <Button url="/app/storeinfoform" variant="primary">
                      Add Store Location
                    </Button>
                    <Button url="/app/billing" variant="secondary">
                      View Billing
                    </Button>
                    <Button
                      onClick={handleSyncMetafields}
                      loading={syncFetcher.state === "loading"}
                      variant="secondary"
                    >
                      Sync to Theme
                    </Button>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Theme Integration 🎨
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Your store locations are automatically saved to Shopify
                    metafields, making them accessible in your theme.
                  </Text>
                  <BlockStack gap="200">
                    <Text as="h4" variant="headingSm">
                      Available Metafields:
                    </Text>
                    <List type="bullet">
                      <List.Item>
                        <code>shop.metafields.store_locator.locations</code> -
                        All store locations (JSON)
                      </List.Item>
                      <List.Item>
                        <code>shop.metafields.store_locator.total_stores</code>{" "}
                        - Total store count
                      </List.Item>
                    </List>
                  </BlockStack>
                  {storeCount > 0 && (
                    <Text variant="bodyMd" as="p" tone="success">
                      ✅ {storeCount} store{storeCount !== 1 ? "s" : ""} synced
                      to metafields
                    </Text>
                  )}
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    App Features
                  </Text>
                  <List>
                    <List.Item>
                      <strong>Store Locator</strong> - Help customers find your
                      physical stores
                    </List.Item>
                    <List.Item>
                      <strong>Interactive Maps</strong> - Beautiful map display
                      with store markers
                    </List.Item>
                    <List.Item>
                      <strong>Store Management</strong> - Easy store information
                      management
                    </List.Item>
                    <List.Item>
                      <strong>Theme Integration</strong> - Seamless integration
                      with your theme via metafields
                    </List.Item>
                    <List.Item>
                      <strong>Liquid Template Blocks</strong> - Ready-to-use
                      theme extension blocks
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Need Help?
                  </Text>
                  <Text variant="bodyMd" as="p">
                    Use the "Store Locator" theme block in your theme editor to
                    display store locations on your storefront.
                  </Text>
                  <Button
                    variant="plain"
                    external
                    url="https://help.shopify.com"
                  >
                    Documentation
                  </Button>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
