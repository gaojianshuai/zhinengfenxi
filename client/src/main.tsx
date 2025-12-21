import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App } from "./modules/App";
import { CoinDetail } from "./modules/CoinDetail";
import { BlockchainData } from "./modules/BlockchainData";
import { Trading } from "./modules/Trading";
import { DataAnalysis } from "./modules/DataAnalysis";
import { BlockchainExplorer } from "./modules/BlockchainExplorer";
import { Auth } from "./modules/Auth";
import { UserProfile } from "./modules/UserProfile";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/coin/:id" element={<CoinDetail />} />
        <Route path="/blockchain" element={<BlockchainData />} />
        <Route path="/trading" element={<Trading />} />
        <Route path="/analysis" element={<DataAnalysis />} />
        <Route path="/explorer" element={<BlockchainExplorer />} />
        <Route path="/explorer/:type/:query" element={<BlockchainExplorer />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<UserProfile />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);


