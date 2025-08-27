import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Select,
  BlockStack,
  InlineStack,
  Text,
  Banner,
} from "@shopify/polaris";
import { useLoaderData, useSubmit, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const storeRecord = await prisma.store.findUnique({
    where: { id: shop },
  });

  // Ensure `stores` is always an array
  const stores = Array.isArray(storeRecord?.shop) ? storeRecord.shop : [];

  return { stores };
};

// Helper function to get shop ID
async function getShopId(admin) {
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

  return shopId;
}

// Helper function to update metafields
async function updateMetafields(admin, stores) {
  const shopId = await getShopId(admin);

  const locationsResult = await admin.graphql(
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

  const countResult = await admin.graphql(
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

  // Check for errors
  const locationsData = await locationsResult.json();
  const countData = await countResult.json();

  if (locationsData.data?.metafieldsSet?.userErrors?.length > 0) {
    console.error(
      "Locations metafield errors:",
      locationsData.data.metafieldsSet.userErrors,
    );
  }

  if (countData.data?.metafieldsSet?.userErrors?.length > 0) {
    console.error(
      "Count metafield errors:",
      countData.data.metafieldsSet.userErrors,
    );
  }

  return { locationsData, countData };
}

export const action = async ({ request }) => {
  const body = await request.json();
  const {
    method,
    id,
    storeName,
    country,
    state,
    city,
    address,
    latitude,
    longitude,
  } = body;

  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  if (method === "add") {
    const storeData = {
      id: Date.now().toString(), // Generate a unique ID for the store
      storeName,
      country,
      state,
      city,
      address,
      coordinates: {
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
      },
    };

    // Update database
    const existingStore = await prisma.store.findUnique({
      where: { id: shop },
    });

    if (existingStore) {
      await prisma.store.update({
        where: { id: shop },
        data: {
          shop: {
            push: storeData,
          },
        },
      });
    } else {
      await prisma.store.create({
        data: {
          id: shop,
          shop: [storeData],
          accessToken: "dummyAccessToken",
          scope: "read_products,write_orders",
        },
      });
    }

    // Get all stores to update metafields
    const updatedStoreRecord = await prisma.store.findUnique({
      where: { id: shop },
    });
    const allStores = Array.isArray(updatedStoreRecord?.shop)
      ? updatedStoreRecord.shop
      : [];

    // Update metafields
    try {
      await updateMetafields(admin, allStores);
    } catch (error) {
      console.error("Error updating metafields:", error);
    }
  } else if (method === "edit") {
    const existingStore = await prisma.store.findUnique({
      where: { id: shop },
    });

    if (existingStore) {
      const updatedShop = existingStore.shop.map((store) =>
        store.id === id
          ? {
              ...store,
              storeName,
              country,
              state,
              city,
              address,
              coordinates: {
                lat: parseFloat(latitude),
                lng: parseFloat(longitude),
              },
            }
          : store,
      );

      await prisma.store.update({
        where: { id: shop },
        data: { shop: updatedShop },
      });

      // Update metafields
      try {
        await updateMetafields(admin, updatedShop);
      } catch (error) {
        console.error("Error updating metafields:", error);
      }
    }
  } else if (method === "delete") {
    const existingStore = await prisma.store.findUnique({
      where: { id: shop },
    });

    if (existingStore) {
      const filteredShop = existingStore.shop.filter(
        (store) => store.id !== id,
      );

      await prisma.store.update({
        where: { id: shop },
        data: { shop: filteredShop },
      });

      // Update metafields
      try {
        await updateMetafields(admin, filteredShop);
      } catch (error) {
        console.error("Error updating metafields:", error);
      }
    }
  }

  return { success: true };
};

export default function StoreInfoForm() {
  const { stores } = useLoaderData();
  const submit = useSubmit();
  const fetcher = useFetcher();

  const [formData, setFormData] = useState({
    storeName: "",
    country: "",
    state: "",
    city: "",
    address: "",
    latitude: "",
    longitude: "",
  });

  const [editingStoreId, setEditingStoreId] = useState(null);

  // Country and state options
  const countries = [
    { label: "Select Country", value: "" },
    { label: "United States", value: "USA" },
    { label: "Canada", value: "Canada" },
    { label: "United Kingdom", value: "UK" },
    { label: "Australia", value: "Australia" },
    { label: "Germany", value: "Germany" },
    { label: "France", value: "France" },
    { label: "India", value: "India" },
    { label: "Japan", value: "Japan" },
    { label: "Other", value: "Other" },
  ];

  const getStatesForCountry = (country) => {
    const states = {
      USA: [
        { label: "Select State", value: "" },
        { label: "California", value: "CA" },
        { label: "New York", value: "NY" },
        { label: "Texas", value: "TX" },
        { label: "Florida", value: "FL" },
        { label: "Illinois", value: "IL" },
        { label: "Pennsylvania", value: "PA" },
        { label: "Ohio", value: "OH" },
        { label: "Georgia", value: "GA" },
        { label: "North Carolina", value: "NC" },
        { label: "Michigan", value: "MI" },
      ],
      Canada: [
        { label: "Select Province", value: "" },
        { label: "Ontario", value: "ON" },
        { label: "Quebec", value: "QC" },
        { label: "British Columbia", value: "BC" },
        { label: "Alberta", value: "AB" },
        { label: "Manitoba", value: "MB" },
        { label: "Saskatchewan", value: "SK" },
        { label: "Nova Scotia", value: "NS" },
        { label: "New Brunswick", value: "NB" },
        { label: "Newfoundland and Labrador", value: "NL" },
        { label: "Prince Edward Island", value: "PE" },
      ],
      UK: [
        { label: "Select Region", value: "" },
        { label: "England", value: "England" },
        { label: "Scotland", value: "Scotland" },
        { label: "Wales", value: "Wales" },
        { label: "Northern Ireland", value: "Northern Ireland" },
      ],
      Australia: [
        { label: "Select State", value: "" },
        { label: "New South Wales", value: "NSW" },
        { label: "Victoria", value: "VIC" },
        { label: "Queensland", value: "QLD" },
        { label: "Western Australia", value: "WA" },
        { label: "South Australia", value: "SA" },
        { label: "Tasmania", value: "TAS" },
        { label: "Australian Capital Territory", value: "ACT" },
        { label: "Northern Territory", value: "NT" },
      ],
    };
    return states[country] || [{ label: "Select State/Region", value: "" }];
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      // Reset state when country changes
      ...(field === "country" && { state: "" }),
    }));
  };

  const handleSubmit = () => {
    const method = editingStoreId ? "edit" : "add";
    const payload = editingStoreId
      ? { method, id: editingStoreId, ...formData }
      : { method, ...formData };

    fetcher.submit(JSON.stringify(payload), {
      method: "POST",
      encType: "application/json",
    });

    // Reset form
    setFormData({
      storeName: "",
      country: "",
      state: "",
      city: "",
      address: "",
      latitude: "",
      longitude: "",
    });
    setEditingStoreId(null);
  };

  const handleEdit = (store) => {
    setFormData({
      storeName: store.storeName,
      country: store.country,
      state: store.state,
      city: store.city,
      address: store.address,
      latitude: store.coordinates?.lat?.toString() || "",
      longitude: store.coordinates?.lng?.toString() || "",
    });
    setEditingStoreId(store.id);
  };

  const handleDelete = (storeId) => {
    if (confirm("Are you sure you want to delete this store?")) {
      fetcher.submit(JSON.stringify({ method: "delete", id: storeId }), {
        method: "POST",
        encType: "application/json",
      });
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      storeName: "",
      country: "",
      state: "",
      city: "",
      address: "",
      latitude: "",
      longitude: "",
    });
    setEditingStoreId(null);
  };

  const isFormValid =
    formData.storeName &&
    formData.country &&
    formData.state &&
    formData.city &&
    formData.address;

  return (
    <Page title="Store Information Management">
      <BlockStack gap="600">
        {/* Store Form */}
        <Card>
          <BlockStack gap="400">
            <Text variant="headingMd" as="h2">
              {editingStoreId ? "Edit Store" : "Add New Store"}
            </Text>

            {editingStoreId && (
              <Banner status="info">
                <p>
                  You are editing a store. Click "Cancel" to add a new store
                  instead.
                </p>
              </Banner>
            )}

            <FormLayout>
              <TextField
                label="Store Name"
                value={formData.storeName}
                onChange={(value) => handleInputChange("storeName", value)}
                placeholder="Enter store name"
                autoComplete="off"
              />

              <InlineStack gap="400">
                <div style={{ flex: 1 }}>
                  <Select
                    label="Country"
                    options={countries}
                    value={formData.country}
                    onChange={(value) => handleInputChange("country", value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label={
                      formData.country === "Canada"
                        ? "Province"
                        : formData.country === "UK"
                          ? "Region"
                          : "State"
                    }
                    options={getStatesForCountry(formData.country)}
                    value={formData.state}
                    onChange={(value) => handleInputChange("state", value)}
                    disabled={!formData.country}
                  />
                </div>
              </InlineStack>

              <TextField
                label="City"
                value={formData.city}
                onChange={(value) => handleInputChange("city", value)}
                placeholder="Enter city name"
                autoComplete="address-level2"
              />

              <TextField
                label="Address"
                value={formData.address}
                onChange={(value) => handleInputChange("address", value)}
                placeholder="Enter street address"
                autoComplete="street-address"
              />

              <InlineStack gap="400">
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Latitude"
                    value={formData.latitude}
                    onChange={(value) => handleInputChange("latitude", value)}
                    type="number"
                    step="any"
                    placeholder="e.g., 40.7128"
                    helpText="Enter the latitude coordinate"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Longitude"
                    value={formData.longitude}
                    onChange={(value) => handleInputChange("longitude", value)}
                    type="number"
                    step="any"
                    placeholder="e.g., -74.0060"
                    helpText="Enter the longitude coordinate"
                  />
                </div>
              </InlineStack>

              <InlineStack gap="300">
                <Button
                  primary
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  loading={fetcher.state === "submitting"}
                >
                  {editingStoreId ? "Update Store" : "Add Store"}
                </Button>
                {editingStoreId && (
                  <Button onClick={handleCancelEdit}>Cancel Edit</Button>
                )}
              </InlineStack>
            </FormLayout>
          </BlockStack>
        </Card>

        {/* Stores List */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text variant="headingMd" as="h2">
                Store Locations ({stores.length})
              </Text>
            </InlineStack>

            {stores.length === 0 ? (
              <Text as="p" color="subdued">
                No stores added yet. Use the form above to add your first store.
              </Text>
            ) : (
              <BlockStack gap="300">
                {stores.map((store) => (
                  <Card key={store.id} padding="400">
                    <BlockStack gap="200">
                      <InlineStack align="space-between">
                        <Text variant="headingSm" as="h3">
                          {store.storeName}
                        </Text>
                        <InlineStack gap="200">
                          <Button
                            size="slim"
                            onClick={() => handleEdit(store)}
                            disabled={fetcher.state === "submitting"}
                          >
                            Edit
                          </Button>
                          <Button
                            size="slim"
                            tone="critical"
                            onClick={() => handleDelete(store.id)}
                            disabled={fetcher.state === "submitting"}
                          >
                            Delete
                          </Button>
                        </InlineStack>
                      </InlineStack>

                      <BlockStack gap="100">
                        <Text as="p" color="subdued">
                          <strong>Address:</strong> {store.address}
                        </Text>
                        <Text as="p" color="subdued">
                          <strong>Location:</strong> {store.city}, {store.state}
                          , {store.country}
                        </Text>
                        {store.coordinates && (
                          <Text as="p" color="subdued">
                            <strong>Coordinates:</strong>{" "}
                            {store.coordinates.lat}, {store.coordinates.lng}
                          </Text>
                        )}
                      </BlockStack>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
