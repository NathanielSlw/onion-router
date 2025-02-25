import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT, BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import { createRandomSymmetricKey, exportSymKey, rsaEncrypt } from "../crypto";
import axios from "axios";


export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  // ÉTAPE 1: -----------------------------------------------------------------
  // Implémentation de la route /status
  _user.get("/status", (req, res) => {
    res.send("live");
  });
  // -----------------------------------------------------------------

  // ÉTAPE 2 : -----------------------------------------------------------------
  // Variables pour stocker les messages
  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  // Route pour récupérer le dernier message reçu
  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({ result: lastReceivedMessage });
  });

  // Route pour récupérer le dernier message envoyé
  _user.get("/getLastSentMessage", (req, res) => {
    res.json({ result: lastSentMessage });
  });
  // -----------------------------------------------------------------

  // ÉTAPE 2 : -----------------------------------------------------------------
  //  Route POST /message - Réception d'un message
  _user.post("/message", (req, res) => {
    const { message } = req.body as SendMessageBody;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    lastReceivedMessage = message;
    console.log(`User ${userId} received message: ${message}`);

    return res.status(200).send("success");
  });

  // ÉTAPE 6.1 : -----------------------------------------------------------------
  // Route POST /sendMessage - Envoi d'un message
  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body as SendMessageBody;

    if (!message || destinationUserId === undefined) {
      return res.status(400).json({ error: "Message and destinationUserId are required" });
    }

    try {
      // Récupérer la liste des nœuds du registre
      const { data: { nodes } } = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
      if (nodes.length < 3) {
        return res.status(500).json({ error: "Not enough nodes in the registry" });
      }

      // Créer un circuit aléatoire de 3 nœuds distincts
      const circuit: { nodeId: number; pubKey: string }[] = [];

      while (circuit.length < 3) {
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        if (!circuit.includes(randomNode)) {
          circuit.push(randomNode);
        }
      }
      
      // Créer une clé symétrique unique pour chaque nœud du circuit
      const symKeys = await Promise.all(circuit.map(() => createRandomSymmetricKey()));
      const symKeysBase64 = await Promise.all(symKeys.map(key => exportSymKey(key)));

      // Appliquer les couches de chiffrement
      let encryptedMessage = message;
      for (let i = circuit.length - 1; i >= 0; i--) {
        const node = circuit[i];
        const symKey = symKeysBase64[i];
        const destination = i === circuit.length - 1
          ? (BASE_USER_PORT + destinationUserId).toString().padStart(10, '0')
          : (BASE_ONION_ROUTER_PORT + circuit[i + 1].nodeId).toString().padStart(10, '0');

        const encryptedSymKey = await rsaEncrypt(symKey, node.pubKey);
        encryptedMessage = `${encryptedSymKey}${symKey}${encryptedMessage}`;
      }

      // Envoyer le message chiffré au premier nœud du circuit
      await axios.post(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, { message: encryptedMessage });

      lastSentMessage = message;
      return res.status(200).send("Message sent successfully");
    } 
    catch (error) {
      console.error("Failed to send message:", error);
      return res.status(500).json({ error: "Failed to send message" });
    }
  });
  // -----------------------------------------------------------------
  // Variables pour stocker le circuit
  let lastCircuit: number[] = [];

  // Route pour récupérer le dernier circuit
  _user.get("/getLastCircuit", (req, res) => {
    res.json({ result: lastCircuit });
  });

  // -----------------------------------------------------------------

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
