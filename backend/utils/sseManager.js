// ניהול חיבורי SSE (Server-Sent Events) למשתמשים מחוברים
const clients = new Set();

const addClient = (res) => {
  clients.add(res);
};

const removeClient = (res) => {
  clients.delete(res);
};

// שליחת אירוע לכל המשתמשים המחוברים
const broadcast = (event, data) => {
  for (const client of clients) {
    client.write(`event: ${event}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

module.exports = { addClient, removeClient, broadcast };
