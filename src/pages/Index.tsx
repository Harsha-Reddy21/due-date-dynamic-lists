
import React from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import { Toaster } from "@/components/ui/toaster";

const Index = () => {
  return (
    <>
      <Layout>
        <Dashboard />
      </Layout>
      <Toaster />
    </>
  );
};

export default Index;
