import {
  Page,
  Card,
  Button,
  BlockStack,
  Text,
  Link,
  List,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export default function Index() {
  return (
    <Page title="Instructions">
      <Card sectioned>
        <BlockStack gap="4">
          <Text as="h2" variant="headingMd">
            Welcome to the Store Locator App
          </Text>
          <Text as="p" variant="bodyMd">
            Follow the instructions below to manage your store locations:
          </Text>
          <List>
            <List.Item>
              Add, edit, or delete store locations using the Store Info page.
            </List.Item>
            <List.Item>
              Ensure all store details, including address and coordinates, are
              accurate.
            </List.Item>
            <List.Item>
              Use the "Find Store" feature to locate stores based on country and
              state.
            </List.Item>
          </List>
          <Button primary url="/app/storeinfoform">
            Go to Store Info Page
          </Button>
        </BlockStack>
      </Card>
    </Page>
  );
}
