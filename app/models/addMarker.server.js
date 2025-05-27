import prisma from "../db.server";
export async function action({ request, params }) {
  const body = await request.json();

  try {
    // Save marker data to the Prisma database
    const newMarker = await prisma.store.create({
      data: {
        shop: [
          {
            storeName: body.storeName,
            address: body.address,
            coordinates: {
              lat: body.coordinates.lat,
              lng: body.coordinates.lng,
            },
            dummyData: body.dummyData, // Add dummy data
          },
        ],
        accessToken: "dummyAccessToken", // Dummy data
        scope: "read_products,write_orders", // Dummy data
      },
    });

    return new Response(JSON.stringify(newMarker), { status: 201 });
  } catch (error) {
    console.error("Error saving marker:", error);
    return new Response("Failed to save marker", { status: 500 });
  }
}
