import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Modal,
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

  const [editingStore, setEditingStore] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const method = editingStore ? "edit" : "add";
    const payload = editingStore
      ? { method, id: editingStore.id, ...formData }
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
    setEditingStore(null);
    setIsModalOpen(false);
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
    setEditingStore(store);
    setIsModalOpen(true);
  };

  const handleDelete = (storeId) => {
    if (confirm("Are you sure you want to delete this store?")) {
      fetcher.submit(JSON.stringify({ method: "delete", id: storeId }), {
        method: "POST",
        encType: "application/json",
      });
    }
  };

  const openAddModal = () => {
    setFormData({
      storeName: "",
      country: "",
      state: "",
      city: "",
      address: "",
      latitude: "",
      longitude: "",
    });
    setEditingStore(null);
    setIsModalOpen(true);
  };

  return (
    <Page title="Store Information">
      <Card>
        <div style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2>Store Locations ({stores.length})</h2>
            <Button primary onClick={openAddModal}>
              Add Store
            </Button>
          </div>

          {stores.length === 0 ? (
            <p>No stores added yet. Click "Add Store" to get started.</p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            >
              {stores.map((store) => (
                <Card key={store.id}>
                  <div style={{ padding: "15px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "10px",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "1.2em",
                          color: "#2c5aa0",
                        }}
                      >
                        {store.storeName}
                      </h3>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <Button size="slim" onClick={() => handleEdit(store)}>
                          Edit
                        </Button>
                        <Button
                          size="slim"
                          destructive
                          onClick={() => handleDelete(store.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div style={{ color: "#666", fontSize: "0.9em" }}>
                      <p style={{ margin: "5px 0" }}>
                        <strong>Address:</strong> {store.address}
                      </p>
                      <p style={{ margin: "5px 0" }}>
                        <strong>Location:</strong> {store.city}, {store.state},{" "}
                        {store.country}
                      </p>
                      {store.coordinates && (
                        <p style={{ margin: "5px 0" }}>
                          <strong>Coordinates:</strong> {store.coordinates.lat},{" "}
                          {store.coordinates.lng}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStore ? "Edit Store" : "Add New Store"}
        primaryAction={{
          content: editingStore ? "Update Store" : "Add Store",
          onAction: handleSubmit,
          disabled:
            !formData.storeName ||
            !formData.country ||
            !formData.state ||
            !formData.city,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setIsModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Store Name"
              value={formData.storeName}
              onChange={(value) => handleInputChange("storeName", value)}
              autoComplete="off"
            />
            <TextField
              label="Country"
              value={formData.country}
              onChange={(value) => handleInputChange("country", value)}
              autoComplete="country"
            />
            <TextField
              label="State"
              value={formData.state}
              onChange={(value) => handleInputChange("state", value)}
              autoComplete="address-level1"
            />
            <TextField
              label="City"
              value={formData.city}
              onChange={(value) => handleInputChange("city", value)}
              autoComplete="address-level2"
            />
            <TextField
              label="Address"
              value={formData.address}
              onChange={(value) => handleInputChange("address", value)}
              autoComplete="street-address"
            />
            <TextField
              label="Latitude"
              value={formData.latitude}
              onChange={(value) => handleInputChange("latitude", value)}
              type="number"
              step="any"
              helpText="Enter the latitude coordinate (e.g., 40.7128)"
            />
            <TextField
              label="Longitude"
              value={formData.longitude}
              onChange={(value) => handleInputChange("longitude", value)}
              type="number"
              step="any"
              helpText="Enter the longitude coordinate (e.g., -74.0060)"
            />
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
