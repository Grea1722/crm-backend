const mongoose = require("mongoose");
const Usuario = require("./Usuario");
const Cliente = require("./Cliente");
const PedidosSchema = mongoose.Schema({
  pedido: { type: Array, required: true },
  total: { type: Number, required: true },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: Cliente,
  },
  vendedor: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: Usuario,
  },
  estado: {
    type: String,
    default: "PENDIENTE",
  },
});

module.exports = mongoose.model("Pedido", PedidosSchema);
