const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Bem-vindo ao Backend do Cassino Online!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});