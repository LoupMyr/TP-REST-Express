const z = require("zod");
const postgres = require("postgres");
const express = require('express'),
    router = express.Router();

const sql = postgres({db: "soap", user: "postgres", password: "root"});

const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    about: z.string(),
    price: z.number().positive(),
});
const CreateProductSchema = ProductSchema.omit({id: true});

const inName = str => sql`and name LIKE ${ '%' + str + '%'}`;
const inAbout = str => sql`and about LIKE ${ '%' + str + '%' }`;
const priceLessOrEqual = x => sql`and price <= ${ x }`;

router.post("/addProduct", async (req, res) => {
    const result = await CreateProductSchema.safeParse(req.body);

    if (result.success) {
        const {name, about, price} = result.data;

        const product = await sql`
          INSERT INTO products (name, about, price)
          VALUES (${name}, ${about}, ${price})
          RETURNING * 
          `;
        res.send(product[0]);
    } else {
        res.status(400).send(result);
    }
});

router.get("/products", async (req, res) => {
    let name = false;
    let about = false;
    let price = false;
    if (req.query.name) {
        name = true;
    }
    if (req.query.about) {
        about = true;
    }
    if (req.query.price) {
        price = true;
    }
    const products = await sql`
  SELECT *
  FROM products
  WHERE name is not null
  ${name ? inName(req.query.name) : sql``}
  ${about ? inAbout(req.query.about) : sql``}
  ${price ? priceLessOrEqual(req.query.price) : sql``}
  
  `;
    res.send(products);
});

router.get("/product/:id", async (req, res) => {
    const product = await sql`
  SELECT * 
  FROM products 
  WHERE id = ${req.params.id}
  `;

    if (product.length > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({message: "Not found"});
    }
});

router.delete("/deleteProduct/:id", async (req, res) => {
    const product = await sql`
    DELETE FROM products
    WHERE id = ${req.params.id}
    RETURNING *
  `;
    if (product.length > 0) {
        res.send(product[0]);
    } else {
        res.status(404).send({message: "Not found"});
    }
});

module.exports = router;
