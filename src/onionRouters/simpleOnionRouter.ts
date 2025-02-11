import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT } from "../config";
import { generateRsaKeyPair, exportPubKey, exportPrvKey } from "../crypto";
import axios from "axios";


export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // ÉTAPE 1 --------------------------------------------------------
  // Implémentation de la route /status
  onionRouter.get("/status", (req, res) => {
    res.send("live");
  });
  // -----------------------------------------------------------------

  // ÉTAPE 2 --------------------------------------------------------
   // Variables pour stocker les messages et la destination
   let lastReceivedEncryptedMessage: string | null = null;
   let lastReceivedDecryptedMessage: string | null = null;
   let lastMessageDestination: number | null = null;

   // Route pour récupérer le dernier message chiffré reçu
   onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  // Route pour récupérer le dernier message déchiffré
  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  // Route pour récupérer la dernière destination du message
  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });
  // -----------------------------------------------------------------

  // ÉTAPE 3 --------------------------------------------------------
  // Génération des clés RSA
  const { publicKey, privateKey } = await generateRsaKeyPair();
  const publicKeyBase64 = await exportPubKey(publicKey);
  console.log("Private Key Object:", privateKey);
  const privateKeyBase64 = await exportPrvKey(privateKey);
  console.log("Exported Private Key (Base64):", privateKeyBase64);

  if (!privateKeyBase64) {
    console.error("Private key generation failed");
    throw new Error("Private key generation failed");
  }

  // Enregistrement automatique dans le registre
  try {
    await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
      nodeId,
      pubKey: publicKeyBase64,
    });
    console.log(`Node ${nodeId} registered successfully!`);
  } catch (error) {
    console.error(`Failed to register node ${nodeId}:`, error);
  }

  onionRouter.get("/getPrivateKey", (req, res) => {
    if (privateKeyBase64) {
      res.json({ result: privateKeyBase64 });
    } else {
      res.status(500).json({ error: "Private key not available" });
    }
  });
  // -----------------------------------------------------------------

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${
        BASE_ONION_ROUTER_PORT + nodeId
      }`
    );
  });

  return server;
}
