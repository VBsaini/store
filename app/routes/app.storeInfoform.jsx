// import {
//   Page,
//   Card,
//   FormLayout,
//   TextField,
//   Button,
//   Modal,
// } from "@shopify/polaris";
// import { useLoaderData, useSubmit, useFetcher } from "@remix-run/react";
// import { useState } from "react";
// import { authenticate } from "../shopify.server";
// import prisma from "../db.server";

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;

//   const storeRecord = await prisma.store.findUnique({
//     where: { id: shop },
//   });

//   // Ensure `stores` is always an array
//   const stores = storeRecord?.shop || [];

//   return { stores };
// };

// export const action = async ({ request }) => {
//   const body = await request.json();
//   const { method, id, storeName, country, state, address } = body;

//   const { session } = await authenticate.admin(request);
//   const shop = session.shop;

//   if (method === "add") {
//     const existingStore = await prisma.store.findUnique({
//       where: { id: shop },
//     });

//     if (existingStore) {
//       await prisma.store.update({
//         where: { id: shop },
//         data: {
//           shop: {
//             push: {
//               id: Date.now().toString(), // Generate a unique ID for the store
//               storeName,
//               country,
//               state,
//               address,
//             },
//           },
//         },
//       });
//     } else {
//       await prisma.store.create({
//         data: {
//           id: shop,
//           shop: [
//             {
//               id: Date.now().toString(),
//               storeName,
//               country,
//               state,
//               address,
//             },
//           ],
//           accessToken: "dummyAccessToken",
//           scope: "read_products,write_orders",
//         },
//       });
//     }
//   } else if (method === "edit") {
//     const existingStore = await prisma.store.findUnique({
//       where: { id: shop },
//     });

//     if (existingStore) {
//       const updatedShop = existingStore.shop.map((store) =>
//         store.id === id
//           ? { ...store, storeName, country, state, address }
//           : store,
//       );

//       await prisma.store.update({
//         where: { id: shop },
//         data: { shop: updatedShop },
//       });
//     }
//   } else if (method === "delete") {
//     const existingStore = await prisma.store.findUnique({
//       where: { id: shop },
//     });

//     if (existingStore) {
//       const updatedShop = existingStore.shop.filter((store) => store.id !== id);

//       await prisma.store.update({
//         where: { id: shop },
//         data: { shop: updatedShop },
//       });
//     }
//   }

//   return new Response(null, { status: 200 });
// };

// export default function StoreInfoForm() {
//   const { stores } = useLoaderData(); // Fetch initial stores from the loader
//   const [storeName, setStoreName] = useState("");
//   const [address, setAddress] = useState("");
//   const [country, setCountry] = useState("");
//   const [state, setState] = useState("");
//   const [isEditing, setIsEditing] = useState(false);
//   const [editStore, setEditStore] = useState(null); // Store being edited
//   const submit = useSubmit();
//   const fetcher = useFetcher();

//   const handleAddMarker = (event) => {
//     event.preventDefault();

//     const formData = new FormData(event.target);
//     const data = Object.fromEntries(formData);

//     submit(
//       { ...data, method: "add", country, state, storeName, address },
//       {
//         method: "post",
//         action: "/app/storeinfoform",
//         encType: "application/json",
//       },
//     );

//     // Reset the form fields
//     setStoreName("");
//     setAddress("");
//     setCountry("");
//     setState("");
//   };

//   const handleEditMarker = (store) => {
//     // Open the modal and prefill the inputs with the store data
//     setEditStore(store);
//     setStoreName(store.storeName);
//     setAddress(store.address);
//     // setCountry(store.country);
//     setState(store.state);
//     setIsEditing(true);
//   };

//   const handleSaveEdit = () => {
//     // Submit the updated store data to the backend
//     fetcher.submit(
//       {
//         id: editStore.id,
//         method: "edit",
//         storeName,
//         address,
//         country,
//         state,
//       },
//       {
//         method: "post",
//         action: "/app/storeinfoform",
//         encType: "application/json",
//       },
//     );

//     // Close the modal and reset the editing state
//     setIsEditing(false);
//     setEditStore(null);
//     setStoreName("");
//     setAddress("");
//     setCountry("");
//     setState("");
//   };

//   const handleDeleteMarker = (id) => {
//     fetcher.submit(
//       { id, method: "delete" },
//       {
//         method: "post",
//         action: "/app/storeinfoform",
//         encType: "application/json",
//       },
//     );
//   };

//   return (
//     <Page title="Store Information">
//       <Card sectioned>
//         <fetcher.Form
//           method="post"
//           onSubmit={handleAddMarker}
//           encType="application/json"
//         >
//           <FormLayout>
//             <TextField
//               label="Store Name"
//               name="storeName"
//               value={storeName}
//               onChange={setStoreName}
//               autoComplete="off"
//             />
//             <TextField
//               label="Country"
//               name="country"
//               value={country}
//               onChange={setCountry}
//               autoComplete="off"
//             />
//             <TextField
//               label="State"
//               name="state"
//               value={state}
//               onChange={setState}
//               autoComplete="off"
//             />
//             <TextField
//               label="Full Address"
//               name="address"
//               value={address}
//               onChange={setAddress}
//               autoComplete="off"
//             />
//             <Button primary submit>
//               Add Store
//             </Button>
//           </FormLayout>
//         </fetcher.Form>
//       </Card>
//       <Card sectioned title="Stores List">
//         {stores.map((store, index) => (
//           <div key={index} style={{ marginBottom: "10px" }}>
//             <strong>{store.storeName}</strong>
//             <br />
//             {store.address}
//             <br />
//             <Button onClick={() => handleEditMarker(store)}>Edit</Button>
//             <Button destructive onClick={() => handleDeleteMarker(store.id)}>
//               Delete
//             </Button>
//           </div>
//         ))}
//       </Card>

//       {/* Modal for Editing */}
//       {isEditing && (
//         <Modal
//           open={isEditing}
//           onClose={() => setIsEditing(false)}
//           title="Edit Store"
//           primaryAction={{
//             content: "Save",
//             onAction: handleSaveEdit,
//           }}
//           secondaryActions={[
//             {
//               content: "Cancel",
//               onAction: () => setIsEditing(false),
//             },
//           ]}
//         >
//           <Modal.Section>
//             <FormLayout>
//               <TextField
//                 label="Store Name"
//                 value={storeName}
//                 onChange={setStoreName}
//                 autoComplete="off"
//               />
//               <TextField
//                 label="Country"
//                 value={country}
//                 onChange={setCountry}
//                 autoComplete="off"
//               />
//               <TextField
//                 label="State"
//                 value={state}
//                 onChange={setState}
//                 autoComplete="off"
//               />
//               <TextField
//                 label="Full Address"
//                 value={address}
//                 onChange={setAddress}
//                 autoComplete="off"
//               />
//             </FormLayout>
//           </Modal.Section>
//         </Modal>
//       )}
//     </Page>
//   );
// }

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

export const action = async ({ request }) => {
  const body = await request.json();
  const {
    method,
    id,
    storeName,
    country,
    state,
    address,
    latitude,
    longitude,
  } = body;

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (method === "add") {
    const existingStore = await prisma.store.findUnique({
      where: { id: shop },
    });

    if (existingStore) {
      await prisma.store.update({
        where: { id: shop },
        data: {
          shop: {
            push: {
              id: Date.now().toString(), // Generate a unique ID for the store
              storeName,
              country,
              state,
              address,
              coordinates: {
                lat: parseFloat(latitude),
                lng: parseFloat(longitude),
              },
            },
          },
        },
      });
    } else {
      await prisma.store.create({
        data: {
          id: shop,
          shop: [
            {
              id: Date.now().toString(),
              storeName,
              country,
              state,
              address,
              coordinates: {
                lat: parseFloat(latitude),
                lng: parseFloat(longitude),
              },
            },
          ],
          accessToken: "dummyAccessToken",
          scope: "read_products,write_orders",
        },
      });
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
    }
  } else if (method === "delete") {
    const existingStore = await prisma.store.findUnique({
      where: { id: shop },
    });

    if (existingStore) {
      const updatedShop = existingStore.shop.filter((store) => store.id !== id);

      await prisma.store.update({
        where: { id: shop },
        data: { shop: updatedShop },
      });
    }
  }

  return new Response(null, { status: 200 });
};

export default function StoreInfoForm() {
  const { stores } = useLoaderData(); // Fetch initial stores from the loader
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editStore, setEditStore] = useState(null); // Store being edited
  const submit = useSubmit();
  const fetcher = useFetcher();

  const handleAddMarker = (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);

    submit(
      {
        ...data,
        method: "add",
        country,
        state,
        storeName,
        address,
        latitude,
        longitude,
      },
      {
        method: "post",
        action: "/app/storeinfoform",
        encType: "application/json",
      },
    );

    // Reset the form fields
    setStoreName("");
    setAddress("");
    setCountry("");
    setState("");
    setLatitude("");
    setLongitude("");
  };

  const handleEditMarker = (store) => {
    // Open the modal and prefill the inputs with the store data
    setEditStore(store);
    setStoreName(store.storeName);
    setAddress(store.address);
    setCountry(store.country);
    setState(store.state);
    setLatitude(store.coordinates?.lat || "");
    setLongitude(store.coordinates?.lng || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    // Submit the updated store data to the backend
    fetcher.submit(
      {
        id: editStore.id,
        method: "edit",
        storeName,
        address,
        country,
        state,
        latitude,
        longitude,
      },
      {
        method: "post",
        action: "/app/storeinfoform",
        encType: "application/json",
      },
    );

    // Close the modal and reset the editing state
    setIsEditing(false);
    setEditStore(null);
    setStoreName("");
    setAddress("");
    setCountry("");
    setState("");
    setLatitude("");
    setLongitude("");
  };

  const handleDeleteMarker = (id) => {
    fetcher.submit(
      { id, method: "delete" },
      {
        method: "post",
        action: "/app/storeinfoform",
        encType: "application/json",
      },
    );
  };

  return (
    <Page title="Store Information">
      <Card sectioned>
        <fetcher.Form
          method="post"
          onSubmit={handleAddMarker}
          encType="application/json"
        >
          <FormLayout>
            <TextField
              label="Store Name"
              name="storeName"
              value={storeName}
              onChange={setStoreName}
              autoComplete="off"
            />
            <TextField
              label="Country"
              name="country"
              value={country}
              onChange={setCountry}
              autoComplete="off"
            />
            <TextField
              label="State"
              name="state"
              value={state}
              onChange={setState}
              autoComplete="off"
            />
            <TextField
              label="Full Address"
              name="address"
              value={address}
              onChange={setAddress}
              autoComplete="off"
            />
            <TextField
              label="Latitude"
              name="latitude"
              value={latitude}
              onChange={setLatitude}
              autoComplete="off"
            />
            <TextField
              label="Longitude"
              name="longitude"
              value={longitude}
              onChange={setLongitude}
              autoComplete="off"
            />
            <Button primary submit>
              Add Store
            </Button>
          </FormLayout>
        </fetcher.Form>
      </Card>
      <Card sectioned title="Stores List">
        {stores.map((store, index) => (
          <div key={index} style={{ marginBottom: "10px" }}>
            <strong>{store.storeName}</strong>
            <br />
            {store.address}, {store.state}, {store.country}
            <br />
            Coordinates: {store.coordinates?.lat}, {store.coordinates?.lng}
            <br />
            <Button onClick={() => handleEditMarker(store)}>Edit</Button>
            <Button destructive onClick={() => handleDeleteMarker(store.id)}>
              Delete
            </Button>
          </div>
        ))}
      </Card>

      {/* Modal for Editing */}
      {isEditing && (
        <Modal
          open={isEditing}
          onClose={() => setIsEditing(false)}
          title="Edit Store"
          primaryAction={{
            content: "Save",
            onAction: handleSaveEdit,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setIsEditing(false),
            },
          ]}
        >
          <Modal.Section>
            <FormLayout>
              <TextField
                label="Store Name"
                value={storeName}
                onChange={setStoreName}
                autoComplete="off"
              />
              <TextField
                label="Country"
                value={country}
                onChange={setCountry}
                autoComplete="off"
              />
              <TextField
                label="State"
                value={state}
                onChange={setState}
                autoComplete="off"
              />
              <TextField
                label="Full Address"
                value={address}
                onChange={setAddress}
                autoComplete="off"
              />
              <TextField
                label="Latitude"
                value={latitude}
                onChange={setLatitude}
                autoComplete="off"
              />
              <TextField
                label="Longitude"
                value={longitude}
                onChange={setLongitude}
                autoComplete="off"
              />
            </FormLayout>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
