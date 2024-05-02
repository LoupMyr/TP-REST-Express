const z = require("zod");
const sha512 = require("js-sha512");
const express = require('express'), router = express.Router();
const postgres = require("postgres");

const sql = postgres({db: "soap", user: "postgres", password: "root"});

const UserSchema = z.object({
    id: z.string(), username: z.string(), email: z.string(), password: z.string(),
});
const UserPatchSchema = z.object({
    username: z.string().optional(), email: z.string().optional(), password: z.string().optional(),
});
const CreateUserSchema = UserSchema.omit({id: true});

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve a list of JSONPlaceholder users.
 *     description: Retrieve a list of users from JSONPlaceholder. Can be used to populate a list of fake users when prototyping or testing an API.
 *     responses:
 *       200:
 *         description: A list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The user ID.
 *                         example: 0
 *                       username:
 *                         type: string
 *                         description: The user's username.
 *                         example: Leanne Graham
 *                       email:
 *                         type: string
 *                         description: The user's email.
 *                         example: leannegraham@test.com
 *
 */
router.get("/users", async (req, res) => {
    const users = await sql`
  SELECT (id, username, email)
  FROM users
  `;
    res.send(users);
});

router.get("/user/:id", async (req, res) => {
    const user = await sql`
  SELECT (id, username, email) 
  FROM users
  WHERE id = ${req.params.id}
  `;
    if (user.length > 0) {
        res.send(user);
    } else {
        res.status(404).send({message: "Not Found"});
    }
});

router.delete("/deleteUser/:id", async (req, res) => {
    const user = await sql`
    DELETE FROM users
    WHERE id = ${req.params.id}
    RETURNING *
  `;
    if (user.length > 0) {
        res.send(user[0]);
    } else {
        res.status(404).send({message: "Not found"});
    }
});

router.post("/addUser", async (req, res) => {
    const result = await CreateUserSchema.safeParse(req.body);
    if (result.success) {
        const {username, email, password} = result.data;
        const user = await sql`
          INSERT INTO users (username, email, password)
          VALUES (${username}, ${email}, ${ sha512(password) })
          RETURNING * 
          `;
        res.send(user[0]);
    } else {
        res.status(400).send(result);
    }
});

router.put("/putUser/:id", async (req, res) => {
    const result = await CreateUserSchema.safeParse(req.body);

    if (result.success) {
        let {username, email, password} = result.data;
        const request = await sql`UPDATE users set username=${username},email=${email},password=${sha512(password)} where id = ${req.params.id} returning *`;
        res.send(request[0]);
    } else {
        res.status(400).send(result);
    }
});

router.patch("/patchUser/:id", async (req, res) => {
    const result = await UserPatchSchema.safeParse(req.body);

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

    const [user] = await sql`
          UPDATE users
          SET ${sql(updates)}
          WHERE id = ${req.params.id}
          RETURNING *
        `;

    res.json(user);
  } else {
    res.status(400).json({ message: "Invalid request body" });
  }
});

module.exports = router;
