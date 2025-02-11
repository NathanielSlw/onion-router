import bodyParser from "body-parser";
import express from "express";
import { BASE_USER_PORT } from "../config";

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


  // -----------------------------------------------------------------

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
