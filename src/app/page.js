"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import Dashboard from "@/components/tabs/Dashboard";
import ApiTester from "@/components/tabs/ApiTester";
import SecurityScanner from "@/components/tabs/SecurityScanner";
import DbTester from "@/components/tabs/DbTester";
import ConnectivityTester from "@/components/tabs/ConnectivityTester";
import CurlRunner from "@/components/tabs/CurlRunner";
import ReportTab from "@/components/tabs/ReportTab";
import HistoryTab from "@/components/tabs/HistoryTab";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const render = () => {
    switch (activeTab) {
      case "dashboard":    return <Dashboard onNavigate={setActiveTab} />;
      case "api":          return <ApiTester />;
      case "security":     return <SecurityScanner />;
      case "database":     return <DbTester />;
      case "connectivity": return <ConnectivityTester />;
      case "curl":         return <CurlRunner />;
      case "report":       return <ReportTab />;
      case "history":      return <HistoryTab />;
      default:             return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <Shell activeTab={activeTab} onTabChange={setActiveTab}>
      {render()}
    </Shell>
  );
}
