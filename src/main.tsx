import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PostHogProvider } from "posthog-js/react";

const phKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
const phHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {phKey ? (
      <PostHogProvider apiKey={phKey} options={{ api_host: phHost }}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);
