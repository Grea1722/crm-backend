const { ApolloServer, gql } = require("apollo-server");
const typeDefs = require("./db/schema");
const jwt = require("jsonwebtoken");
resolvers = require("./db/resolvers");
require("dotenv").config({ path: "variables.env" });

const conectarDB = require("./config/db");

//conectar a la base de datos
conectarDB();
//servidor
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // console.log(req.headers["authorization"]);
    const token = req.headers["authorization"] || "";
    if (token) {
      try {
        const usuario = jwt.verify(token, process.env.SECRETA);
        return { usuario };
      } catch (error) {
        console.log("ah ocurrido un error", error);
      }
    }
  },
});

//arrancar servidor
server.listen().then(({ url }) => {
  console.log(`Servidor listo en la URL ${url}`);
});
