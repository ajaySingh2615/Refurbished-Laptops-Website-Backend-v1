import { db } from "./client.js";
import { products } from "./schema.js";

async function main() {
  await db.insert(products).values([
    {
      title: "Dell Latitude 7400",
      brand: "Dell",
      cpu: "i5-8365U",
      ramGb: 16,
      storage: "512GB SSD",
      condition: "Refurbished-A",
      price: "45999.00",
      inStock: true,
      description: "Slim, business grade.",
    },
    {
      title: "ThinkPad T480",
      brand: "Lenovo",
      cpu: "i5-8350U",
      ramGb: 16,
      storage: "256GB SSD",
      condition: "Refurbished-A",
      price: "39999.00",
      inStock: true,
      description: "Durable classic.",
    },
  ]);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
