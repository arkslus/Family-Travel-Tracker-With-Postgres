// Require express app
const express = require("express");
const app = express();

// Require path
const path = require("path");
// set path to views
app.set("views", path.join(__dirname, "views"));
// Set the view engine for the ejs file
app.set("view engine", "ejs");

// Middleware
// for post request, we will need url encoded
app.use(express.urlencoded({ extended: true }));
// This is to use the public file
app.use(express.static("public"));

// Require postgres
const { Pool } = require("pg");

const pool = new Pool({
  user: "your username",
  password: "123456",
  host: "localhost",
  port: 1234, // default Postgres port
  database: "your database",
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};

pool.connect();

// Set the current user to 1
let currentUserId = 1;

// Set the users
let users = [
  { id: 1, name: "Abdulrahman", color: "teal" },
  { id: 2, name: "Mohamed", color: "powderblue" },
];

// Check the visited countries
async function checkVisited() {
  const result = await pool.query(
    "SELECT country_code FROM visited_countries WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

// Get the current user
async function getCurrentUser() {
  const result = await pool.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id == currentUserId);
}

// Get the homepage
app.get("/", async (req, res) => {
  const countries = await checkVisited();
  const currentUser = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });
});

// Add a new country
app.post("/add", async (req, res) => {
  const input = req.body["country"];
  const currentUser = await getCurrentUser();

  try {
    const result = await pool.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await pool.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

// Add a new user or select an existing user
app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
});

// Add a new user
app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await pool.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
});

app.listen(3000, () => {
  console.log("Server running on 3000!");
});
