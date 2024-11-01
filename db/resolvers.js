const Usuario = require("../models/Usuario");
const Cliente = require("../models/Cliente");
const Pedido = require("../models/Pedido");
const Producto = require("../models/Producto");
require("dotenv").config({ path: "variables.env" });
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");

const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email, nombre, apellido } = usuario;

  return jwt.sign({ id, email, nombre, apellido }, secreta, { expiresIn });
};

//Resolvers
const resolvers = {
  //Obtener datos de db
  Query: {
    obtenerUsuario: async (_, { token }) => {
      const usuarioId = await jwt.verify(token, process.env.SECRETA);

      return usuarioId;
    },
    obtenerProductos: async () => {
      const productos = await Producto.find({});
      return productos;
    },
    obtenerProducto: async (_, { id }) => {
      //revisar si existe
      const producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }

      return producto;
    },
    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({});
        return clientes;
      } catch (error) {
        throw new Error("Ah ocurrido un error", error);
      }
    },
    obtenerClientesVendedor: async (_, {}, ctx) => {
      try {
        const clientes = await Cliente.find({
          vendedor: ctx.usuario.id.toString(),
        });

        return clientes;
      } catch (error) {
        throw new Error("Ah ocurrido un error", error);
      }
    },
    obtenerCliente: async (_, { id }, ctx) => {
      //revisar que cliente exista
      const cliente = await Cliente.findById(id);

      if (!cliente) {
        throw new Error("Cliente no existe");
      }

      //Quien lo creo lo puede ver
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes credenciales");
      }

      return cliente;
    },
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosVendedor: async (_, {}, ctx) => {
      try {
        const pedidos = await Pedido.find({ vendedor: ctx.usuario.id });
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedido: async (_, { id }, ctx) => {
      //Si el pedido existe o no
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }
      console.log(ctx.usuario.id);
      //solo quien lo creo puede verlo
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las creedenciales");
      }

      //resultado
      return pedido;
    },
    obtenerPedidosEstado: async (_, { estado }, ctx) => {
      const pedidos = await Pedido.find({ vendedor: ctx.usuario.id, estado });

      return pedidos;
    },
    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        { $group: { _id: "$cliente", total: { $sum: "$total" } } },
        {
          $lookup: {
            from: "clientes",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },
        { $sort: { total: -1 } },
      ]);

      return clientes;
    },
    mejoresVendedores: async () => {
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$vendedor",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },
        { $limit: 3 },
        { $sort: { total: -1 } },
      ]);

      return vendedores;
    },
    buscarProducto: async (_, { texto }) => {
      const productos = await Producto.find({
        $text: { $search: texto },
      }).limit(10);

      return productos;
    },
  },
  //Crear, editar y eliminar datos de db
  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      const { email, password } = input;
      //revisar si el usuario ya esta registrado
      const existeUsuario = await Usuario.findOne({ email });
      if (existeUsuario) {
        throw new Error("El usuario ya esta registrado");
      }
      // hashear password
      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash(password, salt);

      try {
        // Guardarlo en la base de datos
        const usuario = new Usuario(input);
        usuario.save();

        return usuario;
      } catch (error) {
        console.log(error);
      }
    },
    autenticarUsuario: async (_, { input }) => {
      const { email, password } = input;
      //si el usuario existe
      const existeUsuario = await Usuario.findOne({ email });
      if (!existeUsuario) {
        throw new Error("El usuario no existe");
      }

      //revisar password
      const passwordCorrecto = await bcryptjs.compare(
        password,
        existeUsuario.password
      );
      if (!passwordCorrecto) {
        throw new Error("Password incorrecto");
      }

      //crear token
      return {
        token: crearToken(existeUsuario, process.env.SECRETA, "24h"),
      };
    },
    nuevoProducto: async (_, { input }) => {
      const producto = new Producto(input);

      //almacenar en db
      const resultado = await producto.save();

      //despues de guardar un producto lo devolvemos con el id actualizado
      return resultado;
      try {
      } catch (error) {
        throw new Error(error);
      }
    },
    actualizarProducto: async (_, { id, input }) => {
      //Revisamos que el prducto exista
      let producto = await Producto.findById(id);

      if (!producto) {
        throw new Error("Producto no existe");
      }

      //guardar en base de datos
      producto = await Producto.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });

      return producto;
    },
    eliminarProducto: async (_, { id }) => {
      let producto = await Producto.findById(id);

      if (!producto) {
        throw new Error("El producto no existe");
      }

      //elimminar
      await Producto.findOneAndDelete({ _id: id });

      return "Producto Elimminado";
    },
    nuevoCliente: async (_, { input }, ctx) => {
      console.log(ctx);
      const { email } = input;
      //verificar si cliente esta asignado
      const cliente = await Cliente.findOne({ email });
      if (cliente) {
        throw new Error("Cliente ya existe");
      }
      const nuevoCliente = new Cliente(input);
      //le asignamos vendedor
      nuevoCliente.vendedor = ctx.usuario.id;

      //Guardamos en db
      try {
        const resultado = await nuevoCliente.save();

        return resultado;
      } catch (error) {
        throw new Error(error);
      }
    },
    actualizarCliente: async (_, { id, input }, ctx) => {
      // verificar si existe cliente
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("El cliente no existe");
      }
      //verificar si el vendedor edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("Este cliente no te pertenece");
      }

      //guardar cliente
      cliente = await Cliente.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });

      return cliente;
    },
    eliminarCliente: async (_id, { id }, ctx) => {
      // verificar si existe cliente
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("El cliente no existe");
      }
      //verificar si el vendedor edita
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("Este cliente no te pertenece");
      }

      //Eliminar cliente
      await Cliente.findOneAndDelete({ _id: id });
      return "Cliente eliminado con exito";
    },
    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente } = input;
      //verificar existencia del cliente
      let clienteExiste = await Cliente.findById(cliente);

      if (!clienteExiste) {
        throw new Error("El cliente no existe");
      }

      //verificar si el cliente es del vendedor
      if (clienteExiste.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }
      //revisar stock disponible
      for await (const articulo of input.pedido) {
        const { id } = articulo;

        const producto = await Producto.findById(id);

        if (articulo.cantidad > producto.existencia) {
          throw new Error(
            `El articulo: ${producto.nombre} excede la cantidad disponible`
          );
        } else {
          //Restar la cantidad a lo disponible
          producto.existencia -= articulo.cantidad;

          await producto.save();
        }
      }

      // crear nuevo pedido
      const nuevoPedido = new Pedido(input);

      //asignar vendedor
      nuevoPedido.vendedor = ctx.usuario.id;
      //guardar en base de datos
      const resultado = await nuevoPedido.save();

      return resultado;
    },
    actualizarPedido: async (_, { id, input }, ctx) => {
      const { cliente } = input;
      //verificar si existe el pedido
      const existePedido = await Pedido.findById(id);
      if (!existePedido) {
        throw new Error("El pedido no existe");
      }

      //verificar si existe el cliente
      const existeCliente = await Cliente.findById(cliente);
      if (!existeCliente) {
        throw new Error("El cliente no existe");
      }
      //revisar si el pedido y el cliente pertenecen al vendedor
      if (existeCliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("El cliente no existe");
      }
      //revisar stock
      if (input.pedido) {
        for await (const articulo of input.pedido) {
          const { id } = articulo;

          const producto = await Producto.findById(id);

          if (articulo.cantidad > producto.existencia) {
            throw new Error("Existencia insuficiente");
          } else {
            producto.existencia -= articulo.cantidad;
            await producto.save();
          }
        }
      }
      //guarda pedido
      const resultado = await Pedido.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });

      return resultado;
    },
    eliminarPedido: async (_, { id }, ctx) => {
      // verificar si el pedido existe
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("El pedido no existe");
      }
      //verificar si el vendedor es el que lo borra
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("No tienes las credenciales");
      }

      //eliminar pedido
      await Pedido.findOneAndDelete({ _id: id });

      return "Pedido eliminado";
    },
  },
};

module.exports = resolvers;
