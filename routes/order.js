const z = require("zod");
const postgres = require("postgres");
const express = require("express"),
  router = express.Router();

const sql = postgres({ db: "soap", user: "postgres", password: "root" });

const OrderSchema = z.object({
  id: z.string(),
  total: z.number().positive(),
  payment: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  id_product: z.string(),
  id_user: z.string(),
});

const OrderPatchSchema = z.object({
  payment: z.boolean().optional(),
});

const CreateOrderSchema = OrderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  total: true,
});

router.post("/addOrder", async (req, res) => {
  const result = await CreateOrderSchema.safeParse(req.body);

  if (result.success) {
    const { payment, id_product, id_user } = result.data;
    const product = await sql`
    SELECT price
    FROM products
    WHERE id=${id_product}
    `;
    if (product.length > 0) {
      const order = await sql`
              INSERT INTO orders (total, payment, createdAt, updatedAt, id_product, id_user)
              VALUES (${
                product[0].price * 1.2
              }, ${payment}, ${new Date()}, ${new Date()}, ${id_product}, ${id_user})
              RETURNING * 
              `;
      res.send(order[0]);
    }
  } else {
    res.status(400).send(result);
  }
});

router.get("/orders", async (req, res) => {
  const orders = await sql`
    SELECT *
    FROM orders
    `;
  res.send(orders);
});

router.get("/order/:id", async (req, res) => {
  const order = await sql`
  SELECT * 
  FROM orders 
  WHERE id = ${req.params.id}
  `;

  if (order.length > 0) {
    res.send(order[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

router.patch("/patchOrder/:id", async (req, res) => {
  const result = await OrderPatchSchema.safeParse(req.body);
  if (result.success) {
    const updates = Object.keys(result.data).reduce((acc, key) => {
      if (result.data[key] !== undefined) {
        acc[key] = result.data[key];
      }
      return acc;
    }, {});

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    const [order] = await sql`
          UPDATE orders
          SET ${sql(updates)}
          WHERE id = ${req.params.id}
          RETURNING *
        `;
    const date = await sql`
    UPDATE orders
    SET updatedat = ${new Date()}
    WHERE id = ${req.params.id}
    RETURNING *
    `;

    res.json(order);
  } else {
    res.status(400).json({ message: "Invalid request body" });
  }
});

router.delete("/deleteOrder/:id", async (req, res) => {
  const order = await sql`
    DELETE FROM orders
    WHERE id = ${req.params.id}
    RETURNING *
  `;
  if (order.length > 0) {
    res.send(order[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

module.exports = router;
