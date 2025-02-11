import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

const nodesRegistry: Node[] = []; // Stockage temporaire des nœuds


export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // ÉTAPE 1: -----------------------------------------------------------------
  _registry.get("/status", (req, res) => {
    res.send("live");
  });
  // --------------------------------------------------------------------------


  // ÉTAPE 3: -----------------------------------------------------------------
  // Route POST /registerNode - Enregistrement des nœuds
  _registry.post("/registerNode", (req: Request, res: Response) => {
    const { nodeId, pubKey } = req.body as RegisterNodeBody;
    
    // Vérifier si le nœud est déjà enregistré
    if (nodesRegistry.some((node) => node.nodeId === nodeId)) {
      return res.status(400).json({ error: "Node already registered" });
    }

    nodesRegistry.push({ nodeId, pubKey });
    console.log(`Node ${nodeId} registered!`);
    return res.status(201).json({ message: "Node registered successfully" });
  });

  // Route GET /getNodeRegistry - Récupération des nœuds enregistrés
  _registry.get("/getNodeRegistry", (req: Request, res: Response) => {
    res.json({ nodes: nodesRegistry });
  });
  // --------------------------------------------------------------------------
  
  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
