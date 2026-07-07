import express from 'express';
const app = express();
const PORT = 4008;

app.get('*', (req, res) => {
  res.redirect(301, 'https://vault.anakachain.com' + req.url);
});

app.listen(PORT, () => console.log('Signet redirect running on port ' + PORT));
