
import React from "react";
import Layout from "@/components/Layout";
import Dashboard from "@/components/Dashboard";
import { Toaster } from "@/components/ui/toaster";
import { TaskProvider } from "@/contexts/TaskContext";

const Index = () => {
  return (
    <>
      <Layout>
        <TaskProvider>
          <Dashboard />
        </TaskProvider>
      </Layout>
      <Toaster />
    </>
  );
};

export default Index;
