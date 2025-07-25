import { Banner, Button, Layout, Page } from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server"); // ✅ fixed
  const { billing } = await authenticate.admin(request);
  const { appSubscriptions } = await billing.check();

  return json({
    subscription: appSubscriptions?.[0],
  });
};

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server"); // ✅ fixed
  const { billing } = await authenticate.admin(request);
  const { appSubscriptions } = await billing.check();

  await billing.cancel({
    subscriptionId: appSubscriptions?.[0]?.id,
  });

  return json({ success: true });
};

export default function Billing() {
  const { subscription } = useLoaderData();
  const submit = useSubmit();
  const actionData = useActionData();

  if(actionData?.success) {
    shopify.toast.show('Plan successfully Canceled');
  }

  return (
    <Page title="Billing">
      <Layout>
        <Layout.Section>
          {subscription ? (
            <Banner
              title={`You are subscribed to the ${subscription.name} plan`}
              tone="success"
              action={{
                content: "Change Plan",
                url: "https://admin.shopify.com/charges/new-app-1055/pricing_plans",
                target: "_top",
              }}
              secondaryAction={{
                content: "Cancel Plan",
                onAction: () => submit({}, { method: "POST" }),
              }}
            />
          ) : (
            <Button
              target="_top"
              url="https://admin.shopify.com/charges/storepoint/pricing_plans"
            >
              View Plans
            </Button>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
