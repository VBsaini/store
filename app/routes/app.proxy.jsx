import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  console.log("----------------- hit app proxy -----------------");
  const { session } = await authenticate.public.appProxy(request);

  if (session) {
    const shop = session?.shop;
    const existingStore = await prisma.store.findUnique({
      where: { id: shop },
    });

    if (existingStore && existingStore.shop) {
      // Process the shop array to extract country and state from the address
      const processedShop = existingStore.shop.map((store) => {
        const { country, state, address } = store || {};
        return {
          ...store,
          country: country || "Unknown Country",
          state: state || "Unknown State",
        };
      });

      console.log("Processed Shop Data:", processedShop);
      return new Response(JSON.stringify(processedShop), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Store not found" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ message: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
};
